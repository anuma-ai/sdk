import { describe, expect, test, vi } from "vitest";

import type { AgentresRequest, FetchLike, SolanaSignMessageFn } from "./client.js";
import { createAgentresClient } from "./client.js";
import { AgentresError, AgentresPathError, SiwxChallengeError } from "./errors.js";
import recorded402 from "./fixtures/paymentRequired402.json";

const ADDRESS = "FuHqTKA1BeznpbJ7S2FzcPhXcdxssBNJXnJgxT3Tt9AY";

const SIGNATURE_BASE58 =
  "2AXDGYSE4f2sz7tvMMzyHvUfcoJmxudvdhBcmiUSo6ijwfYmfZYsKRxboQMPh3R4kUhXRVdtSXFXMheka4Rc4P2";

function challengeHeader(nonce: string, url: string): string {
  const payload = JSON.parse(JSON.stringify(recorded402)) as {
    extensions: { "sign-in-with-x": { info: { nonce: string; domain: string; uri: string } } };
  };
  const info = payload.extensions["sign-in-with-x"].info;
  info.nonce = nonce;
  info.domain = new URL(url).host;
  info.uri = url;
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64");
}

interface Reply {
  body?: unknown;
  status?: number;
}

interface Harness {
  fetchImpl: ReturnType<typeof vi.fn> & FetchLike;
  signMessage: ReturnType<typeof vi.fn> & SolanaSignMessageFn;
  requests: { url: string; init: RequestInit }[];
}

function harness(replies: Reply[] = []): Harness {
  const requests: { url: string; init: RequestInit }[] = [];
  let minted = 0;

  const fetchImpl = vi.fn((url: string, init?: RequestInit) => {
    requests.push({ url, init: init ?? {} });
    const headers = (init?.headers ?? {}) as Record<string, string>;

    if (!headers["SIGN-IN-WITH-X"]) {
      minted++;
      return Promise.resolve(
        new Response("{}", {
          status: 402,
          headers: { "PAYMENT-REQUIRED": challengeHeader(`nonce-${minted}`, url) },
        })
      );
    }

    const reply = replies.shift() ?? {};
    return Promise.resolve(
      new Response(JSON.stringify(reply.body ?? {}), { status: reply.status ?? 200 })
    );
  });

  const signMessage = vi.fn((_message: Uint8Array) =>
    Promise.resolve(new Uint8Array(64).fill(1))
  ) as ReturnType<typeof vi.fn> & SolanaSignMessageFn;

  return { fetchImpl: fetchImpl as ReturnType<typeof vi.fn> & FetchLike, signMessage, requests };
}

function clientFor(h: Harness, baseUrl?: string) {
  return createAgentresClient({
    address: ADDRESS,
    signMessage: h.signMessage,
    fetch: h.fetchImpl,
    baseUrl,
  });
}

function proof(h: Harness, index: number): Record<string, unknown> {
  const headers = h.requests[index].init.headers as Record<string, string>;
  return JSON.parse(Buffer.from(headers["SIGN-IN-WITH-X"], "base64").toString("utf-8")) as Record<
    string,
    unknown
  >;
}

const PROFILE_READ: AgentresRequest = { method: "GET", path: "/api/me" };

const NO_LINKED_ACCOUNT: Reply = {
  status: 400,
  body: {
    error: {
      code: "NO_LINKED_ACCOUNT",
      message: "No linked Resy account found. Use /api/link-resy first.",
      retryable: false,
      next_step: "Call POST /api/link-resy with the account email.",
    },
  },
};

describe("withSiwx", () => {
  test("sends unauthenticated, then retries the same call with the proof", async () => {
    const h = harness([{ body: { ok: true } }]);

    await expect(clientFor(h).withSiwx(PROFILE_READ)).resolves.toEqual({
      ok: true,
    });

    expect(h.fetchImpl).toHaveBeenCalledTimes(2);
    expect(h.requests[0].url).toBe("https://agentres.dev/api/me");
    expect(
      (h.requests[0].init.headers as Record<string, string>)["SIGN-IN-WITH-X"]
    ).toBeUndefined();
    expect(h.requests[1].url).toBe("https://agentres.dev/api/me");
    expect(proof(h, 1).nonce).toBe("nonce-1");
  });

  test("keeps the method and body on the authenticated retry", async () => {
    const h = harness([{ body: { ok: true } }]);

    await clientFor(h).withSiwx({ method: "POST", path: "/api/account", body: { email: "a@b.c" } });

    expect(h.requests[1].init.method).toBe("POST");
    expect(h.requests[1].init.body).toBe(JSON.stringify({ email: "a@b.c" }));
  });

  test("hands the signer bytes, and never a string", async () => {
    const h = harness([{ body: { ok: true } }]);

    await clientFor(h).withSiwx(PROFILE_READ);

    const signed: unknown = h.signMessage.mock.calls[0][0];
    expect(signed).toBeInstanceOf(Uint8Array);
    expect(typeof signed).not.toBe("string");

    const message = new TextDecoder().decode(signed as Uint8Array);
    expect(message.startsWith("agentres.dev wants you to sign in with your Solana account:")).toBe(
      true
    );
    expect(message).toContain("\nNonce: nonce-1\n");
    expect(message).not.toMatch(/\d,\d/);

    expect(proof(h, 1).signature).toBe(SIGNATURE_BASE58);
  });

  test("fetches a fresh challenge for every call", async () => {
    const h = harness([{ body: { a: 1 } }, { body: { a: 2 } }]);
    const client = clientFor(h);

    await client.withSiwx(PROFILE_READ);
    await client.withSiwx(PROFILE_READ);

    expect(h.fetchImpl).toHaveBeenCalledTimes(4);
    expect(h.signMessage).toHaveBeenCalledTimes(2);
    expect(proof(h, 1).nonce).toBe("nonce-1");
    expect(proof(h, 3).nonce).toBe("nonce-2");
  });

  test("throws when the 402 carries no PAYMENT-REQUIRED header", async () => {
    const h = harness();
    h.fetchImpl.mockResolvedValue(new Response("{}", { status: 402 }));

    await expect(clientFor(h).withSiwx(PROFILE_READ)).rejects.toThrow(SiwxChallengeError);
    expect(h.signMessage).not.toHaveBeenCalled();
  });

  test("never signs a challenge scoped to another host", async () => {
    const h = harness();
    h.fetchImpl.mockResolvedValue(
      new Response("{}", {
        status: 402,
        headers: { "PAYMENT-REQUIRED": challengeHeader("nonce-1", "https://evil.example/login") },
      })
    );

    await expect(clientFor(h).withSiwx(PROFILE_READ)).rejects.toThrow(/refusing to sign it/);
    expect(h.signMessage).not.toHaveBeenCalled();
    expect(h.fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("returns the body without signing when the route answers without a 402", async () => {
    const h = harness();
    h.fetchImpl.mockResolvedValue(new Response(JSON.stringify({ open: true }), { status: 200 }));

    await expect(clientFor(h).withSiwx(PROFILE_READ)).resolves.toEqual({
      open: true,
    });
    expect(h.signMessage).not.toHaveBeenCalled();
  });

  test("a 2xx body that is not JSON comes back typed, not as a SyntaxError", async () => {
    const h = harness();
    h.fetchImpl.mockResolvedValue(
      new Response("<html><body>502 Bad Gateway</body></html>", { status: 200 })
    );

    const failure = clientFor(h).withSiwx(PROFILE_READ);

    await expect(failure).rejects.toBeInstanceOf(AgentresError);
    await expect(failure).rejects.not.toBeInstanceOf(SyntaxError);
    await expect(failure).rejects.toMatchObject({ status: 200, code: "INVALID_JSON" });
  });

  test("throws the provider's refusal from the authenticated response", async () => {
    const h = harness([NO_LINKED_ACCOUNT]);

    const failure = clientFor(h).withSiwx({ method: "GET", path: "/api/search" });

    await expect(failure).rejects.toBeInstanceOf(AgentresError);
    await expect(failure).rejects.toMatchObject({
      status: 400,
      code: "NO_LINKED_ACCOUNT",
      message: "No linked Resy account found. Use /api/link-resy first.",
      retryable: false,
      nextStep: "Call POST /api/link-resy with the account email.",
    });
  });
});

describe("the registration calls", () => {
  test("ensureAccount posts the email to /api/account and maps the account", async () => {
    const h = harness([
      {
        body: {
          account_id: "6f1d7b0e-0000-4000-8000-000000000000",
          email: "linked@example.com",
          credential_kind: "wallet",
          wallet_linked: true,
        },
      },
    ]);

    await expect(clientFor(h).ensureAccount("linked@example.com")).resolves.toEqual({
      accountId: "6f1d7b0e-0000-4000-8000-000000000000",
      email: "linked@example.com",
      credentialKind: "wallet",
      walletLinked: true,
    });
    expect(h.requests[1].url).toBe("https://agentres.dev/api/account");
    expect(h.requests[1].init.body).toBe(JSON.stringify({ email: "linked@example.com" }));
  });

  test("requestCode posts em_address with no code", async () => {
    const h = harness([{ body: { step: "code_sent", message: "Check your email" } }]);

    await expect(clientFor(h).requestCode("linked@example.com")).resolves.toEqual({
      step: "code_sent",
      message: "Check your email",
      resyUserId: undefined,
    });
    expect(h.requests[1].url).toBe("https://agentres.dev/api/link-resy");
    expect(h.requests[1].init.body).toBe(JSON.stringify({ em_address: "linked@example.com" }));
  });

  test("verifyCode posts em_address with the code and maps resy_user_id", async () => {
    const h = harness([
      { body: { step: "code_sent" } },
      { body: { step: "linked", resy_user_id: 4242 } },
    ]);
    const client = clientFor(h);

    await client.requestCode("linked@example.com");
    await expect(client.verifyCode("linked@example.com", "123456")).resolves.toEqual({
      step: "linked",
      message: undefined,
      resyUserId: 4242,
    });
    expect(h.requests[3].init.body).toBe(
      JSON.stringify({ em_address: "linked@example.com", code: "123456" })
    );
  });

  test("verifies a code on a new client instance (page refresh mid-flow)", async () => {
    const h = harness([{ body: { step: "linked", resy_user_id: 4242 } }]);

    await expect(clientFor(h).verifyCode("linked@example.com", "123456")).resolves.toMatchObject({
      step: "linked",
      resyUserId: 4242,
    });
    expect(h.requests[1].init.body).toBe(
      JSON.stringify({ em_address: "linked@example.com", code: "123456" })
    );
  });

  test("a code that was never issued comes back as the server's own refusal", async () => {
    const h = harness([
      {
        status: 502,
        body: {
          error: {
            code: "RESY_VERIFICATION_FAILED",
            message: "No pending verification for that address.",
            retryable: true,
            next_step: "Request a new code and try again.",
          },
        },
      },
    ]);

    await expect(clientFor(h).verifyCode("linked@example.com", "123456")).rejects.toMatchObject({
      code: "RESY_VERIFICATION_FAILED",
      status: 502,
      message: "No pending verification for that address.",
      retryable: true,
      nextStep: "Request a new code and try again.",
    });
  });

  test("a stale code fails and the next attempt still goes through", async () => {
    const h = harness([
      { body: { step: "code_sent" } },
      {
        status: 502,
        body: {
          error: {
            code: "RESY_VERIFICATION_FAILED",
            message: "That code did not match.",
            retryable: true,
            next_step: "Ask the user to re-enter the code from their email.",
          },
        },
      },
      { body: { step: "linked", resy_user_id: 99 } },
    ]);
    const client = clientFor(h);

    await client.requestCode("linked@example.com");
    await expect(client.verifyCode("linked@example.com", "000000")).rejects.toMatchObject({
      code: "RESY_VERIFICATION_FAILED",
      retryable: true,
    });
    await expect(client.verifyCode("linked@example.com", "123456")).resolves.toMatchObject({
      step: "linked",
    });
  });

  test("getLinkStatus maps the profile, keeping the base58 wallet address", async () => {
    const h = harness([
      {
        body: {
          account_id: "6f1d7b0e-0000-4000-8000-000000000000",
          email: "linked@example.com",
          wallet_address: ADDRESS,
          resy_linked: true,
          resy_linked_at: "2026-09-17T22:40:00.000Z",
        },
      },
    ]);

    await expect(clientFor(h).getLinkStatus()).resolves.toEqual({
      accountId: "6f1d7b0e-0000-4000-8000-000000000000",
      email: "linked@example.com",
      resyLinked: true,
      walletAddress: ADDRESS,
      resyLinkedAt: "2026-09-17T22:40:00.000Z",
    });
    expect(h.requests[1].init.method).toBe("GET");
  });

  test("getLinkStatus reports an unlinked account rather than failing", async () => {
    const h = harness([
      {
        body: {
          account_id: "6f1d7b0e-0000-4000-8000-000000000000",
          email: null,
          wallet_address: ADDRESS,
          resy_linked: false,
          resy_linked_at: null,
        },
      },
    ]);

    await expect(clientFor(h).getLinkStatus()).resolves.toMatchObject({
      email: null,
      resyLinked: false,
      resyLinkedAt: null,
    });
  });
});

describe("createAgentresClient options", () => {
  test("honours an injected baseUrl and trims its trailing slash", async () => {
    const h = harness([{ body: { ok: true } }]);

    await clientFor(h, "https://staging.agentres.dev/").withSiwx(PROFILE_READ);

    expect(h.requests[0].url).toBe("https://staging.agentres.dev/api/me");
  });
});

describe("request paths that would leave the agentres origin", () => {
  test.each([
    ["a userinfo path", "@evil.com/x"],
    ["a host-suffix path", ".evil.com/x"],
    ["a protocol-relative path", "//evil.com/x"],
    ["a backslash path", "/\\evil.com/x"],
    ["a control-character path", "/\t//evil.com/x"],
  ])("refuses %s before making any request", async (_name, path) => {
    const h = harness([{ body: { ok: true } }]);

    await expect(clientFor(h).withSiwx({ method: "GET", path })).rejects.toBeInstanceOf(
      AgentresPathError
    );
    expect(h.fetchImpl).not.toHaveBeenCalled();
    expect(h.signMessage).not.toHaveBeenCalled();
  });

  test("still serves a legitimate path-parameter route", async () => {
    const h = harness([{ body: { id: "42" } }]);

    await expect(
      clientFor(h).withSiwx({ method: "GET", path: "/api/discover/restaurants/42" })
    ).resolves.toEqual({ id: "42" });
    expect(h.requests[0].url).toBe("https://agentres.dev/api/discover/restaurants/42");
  });

  test("scopes the check to the injected baseUrl, not to agentres.dev", async () => {
    const h = harness([{ body: { ok: true } }]);

    await expect(
      clientFor(h, "https://staging.agentres.dev").withSiwx({ method: "GET", path: "@evil.com/x" })
    ).rejects.toBeInstanceOf(AgentresPathError);
    expect(h.fetchImpl).not.toHaveBeenCalled();
  });
});

describe("challenge body handling", () => {
  test("releases the challenge body before retrying with the proof", async () => {
    const h = harness([{ body: { resy_linked: false } }]);
    const cancelled: string[] = [];

    const original = h.fetchImpl.getMockImplementation() as unknown as FetchLike;
    h.fetchImpl.mockImplementation(async (url: string, init?: RequestInit) => {
      const response = await original(url, init);
      if (response.status === 402 && response.body) {
        const realCancel = response.body.cancel.bind(response.body);
        response.body.cancel = (reason?: unknown) => {
          cancelled.push(url);
          return realCancel(reason);
        };
      }
      return response;
    });

    await clientFor(h).getLinkStatus();

    expect(cancelled).toHaveLength(1);
  });

  test("a challenge body that refuses to cancel does not fail the call", async () => {
    const h = harness([{ body: { resy_linked: true } }]);

    const original = h.fetchImpl.getMockImplementation() as unknown as FetchLike;
    h.fetchImpl.mockImplementation(async (url: string, init?: RequestInit) => {
      const response = await original(url, init);
      if (response.status === 402 && response.body) {
        response.body.cancel = () => Promise.reject(new Error("already disturbed"));
      }
      return response;
    });

    await expect(clientFor(h).getLinkStatus()).resolves.toMatchObject({ resyLinked: true });
  });
});
