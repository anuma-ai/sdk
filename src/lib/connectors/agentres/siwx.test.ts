import { describe, expect, test } from "vitest";

import { SiwxChallengeError, SiwxUnsupportedError } from "./errors.js";
import recorded402 from "./fixtures/paymentRequired402.json";
import type { SiwxChallenge } from "./siwx.js";
import { buildMessage, buildPayload, parseChallenge } from "./siwx.js";

/**
 * The address the accepted probe run signed with, and the message agentres
 * accepted from it on 2026-09-17. Nine other serializations of the same
 * challenge were rejected with a bare 401, so this is a byte-for-byte golden
 * test: any change to the builder that still "looks right" is a change that
 * fails in production and nowhere else.
 *
 * The fixture is that run's 402 payload, with `accepts` trimmed to the Solana
 * rail. Do not tidy either one — the line breaks, the blank lines, the bare
 * chain reference and the absent trailing newline are all load-bearing.
 */
const PROBE_ADDRESS = "FuHqTKA1BeznpbJ7S2FzcPhXcdxssBNJXnJgxT3Tt9AY";

/**
 * Base58 of 64 bytes of 0x07, from the reference implementation (bs58). These
 * vectors are hardcoded so the encoder is never checked against itself.
 */
const BASE58_OF_SIXTY_FOUR_SEVENS =
  "99eUso3aSbE9tqGSTXzo3TLfKb9RkMTURrHKQ1K7Zh3BbeqPevr5E1iCbpTjqHuTFLtfxTTD5ekfVuZFzQyEQf8";

const ACCEPTED_MESSAGE = [
  "agentres.dev wants you to sign in with your Solana account:",
  "FuHqTKA1BeznpbJ7S2FzcPhXcdxssBNJXnJgxT3Tt9AY",
  "",
  "Verify wallet ownership with Agentic Reservations",
  "",
  "URI: https://agentres.dev/api/me",
  "Version: 1",
  "Chain ID: 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "Nonce: cf14451647c551a13177e9be523a4875",
  "Issued At: 2026-09-17T22:38:42.566Z",
  "Resources:",
  "- https://agentres.dev/api/me",
].join("\n");

/** Base64-encode a 402 payload the way agentres returns it in the header. */
function encodeHeader(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64");
}

/** The recorded header, optionally with the decoded payload edited first. */
function header(edit?: (payload: Record<string, unknown>) => void): string {
  const payload = JSON.parse(JSON.stringify(recorded402)) as Record<string, unknown>;
  edit?.(payload);
  return encodeHeader(payload);
}

describe("parseChallenge", () => {
  test("flattens the info block and the solana entry of supportedChains", () => {
    expect(parseChallenge(header())).toEqual({
      domain: "agentres.dev",
      uri: "https://agentres.dev/api/me",
      version: "1",
      statement: "Verify wallet ownership with Agentic Reservations",
      nonce: "cf14451647c551a13177e9be523a4875",
      issuedAt: "2026-09-17T22:38:42.566Z",
      resources: ["https://agentres.dev/api/me"],
      chainId: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      signingType: "ed25519",
    });
  });

  // T-U6. A paid endpoint answers 402 without the extension on purpose, and
  // signing anyway produces a proof that comes back as an unexplained 401.
  test("throws SiwxUnsupportedError when the 402 carries no sign-in-with-x extension", () => {
    const paid = header((payload) => {
      payload.extensions = {};
    });

    expect(() => parseChallenge(paid)).toThrow(SiwxUnsupportedError);
    expect(() => parseChallenge(paid)).toThrow(/paid rather than identity-only/);
  });

  test("throws SiwxUnsupportedError when the 402 carries no extensions at all", () => {
    expect(() =>
      parseChallenge(
        header((payload) => {
          delete payload.extensions;
        })
      )
    ).toThrow(SiwxUnsupportedError);
  });

  test.each(["domain", "uri", "version", "statement", "nonce", "issuedAt"])(
    "throws when the info block has no %s",
    (field) => {
      expect(() =>
        parseChallenge(
          header((payload) => {
            delete siwxInfo(payload)[field];
          })
        )
      ).toThrow(new SiwxChallengeError(`the sign-in-with-x info block has no ${field}`));
    }
  );

  test("throws when the info block has no resources", () => {
    expect(() =>
      parseChallenge(
        header((payload) => {
          siwxInfo(payload).resources = [];
        })
      )
    ).toThrow(SiwxChallengeError);
  });

  test("throws when no solana chain is offered", () => {
    expect(() =>
      parseChallenge(
        header((payload) => {
          siwxExtension(payload).supportedChains = [{ chainId: "eip155:8453", type: "eip191" }];
        })
      )
    ).toThrow(/offers no solana: chain/);
  });

  test("takes the chain id from the challenge rather than a pinned constant", () => {
    const devnet = parseChallenge(
      header((payload) => {
        siwxExtension(payload).supportedChains = [
          { chainId: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", type: "ed25519" },
        ];
      })
    );

    expect(devnet.chainId).toBe("solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1");
    expect(buildMessage(devnet, PROBE_ADDRESS)).toContain(
      "\nChain ID: EtWTRABZaYq6iMfeYKouRu166VU2xqa1\n"
    );
  });

  test("throws when the header is not base64-encoded JSON", () => {
    expect(() => parseChallenge("not-base64-json")).toThrow(SiwxChallengeError);
  });
});

describe("buildMessage", () => {
  // T-U1. The one test in this task that pins something no document could.
  test("renders the exact bytes agentres accepted", () => {
    const message = buildMessage(parseChallenge(header()), PROBE_ADDRESS);

    expect(message).toBe(ACCEPTED_MESSAGE);
    expect([...new TextEncoder().encode(message)]).toEqual([
      ...new TextEncoder().encode(ACCEPTED_MESSAGE),
    ]);
  });

  test("renders every resource as its own dash line", () => {
    const message = buildMessage(
      parseChallenge(
        header((payload) => {
          siwxInfo(payload).resources = [
            "https://agentres.dev/api/me",
            "https://agentres.dev/api/account",
          ];
        })
      ),
      PROBE_ADDRESS
    );

    expect(
      message.endsWith(
        "Resources:\n- https://agentres.dev/api/me\n- https://agentres.dev/api/account"
      )
    ).toBe(true);
  });

  // The message takes the bare reference and the payload takes the full id.
  // A caller assembling a challenge by hand would otherwise sign the wrong one.
  test("refuses a chain id that is not a solana CAIP-2 id", () => {
    const challenge: SiwxChallenge = {
      ...parseChallenge(header()),
      chainId: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    };

    expect(() => buildMessage(challenge, PROBE_ADDRESS)).toThrow(SiwxChallengeError);
  });
});

describe("buildPayload", () => {
  // T-U3. The full CAIP-2 chain id, the base58 signature, and the whole thing
  // base64. A base64 signature was rejected live with an alphabet error.
  test("encodes the payload agentres accepts", () => {
    const challenge = parseChallenge(header());
    const signature = new Uint8Array(64).fill(7);

    const payload = buildPayload(challenge, PROBE_ADDRESS, signature);
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf-8")) as Record<
      string,
      unknown
    >;

    expect(decoded).toEqual({
      domain: "agentres.dev",
      address: PROBE_ADDRESS,
      statement: "Verify wallet ownership with Agentic Reservations",
      uri: "https://agentres.dev/api/me",
      version: "1",
      chainId: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      type: "ed25519",
      nonce: "cf14451647c551a13177e9be523a4875",
      issuedAt: "2026-09-17T22:38:42.566Z",
      resources: ["https://agentres.dev/api/me"],
      signature: BASE58_OF_SIXTY_FOUR_SEVENS,
    });
  });

  test.each([
    [[] as number[], ""],
    [[0], "1"],
    [[0, 0, 1], "112"],
    [[...Buffer.from("hello world", "utf-8")], "StV1DL6CwTryKyV"],
    [[255, 255, 255, 255], "7YXq9G"],
  ])("base58-encodes %j as %s", (bytes, expected) => {
    const challenge = parseChallenge(header());
    const decoded = JSON.parse(
      Buffer.from(buildPayload(challenge, PROBE_ADDRESS, new Uint8Array(bytes)), "base64").toString(
        "utf-8"
      )
    ) as { signature: string };

    expect(decoded.signature).toBe(expected);
  });
});

function siwxExtension(payload: Record<string, unknown>): Record<string, unknown> {
  const extensions = payload.extensions as Record<string, unknown>;
  return extensions["sign-in-with-x"] as Record<string, unknown>;
}

function siwxInfo(payload: Record<string, unknown>): Record<string, unknown> {
  return siwxExtension(payload).info as Record<string, unknown>;
}
