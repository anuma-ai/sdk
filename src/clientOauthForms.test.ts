// @vitest-environment node

import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { createClient } from "./client/client";
import { urlSearchParamsBodySerializer } from "./client/core/bodySerializer.gen";
import { postOauthConsent, postOauthRevoke, postOauthToken } from "./client/sdk.gen";

const forms: {
  name: string;
  path: string;
  send: typeof postOauthToken | typeof postOauthRevoke | typeof postOauthConsent;
  fields: Record<string, string>;
}[] = [
  {
    name: "authorization code exchange",
    path: "/oauth/token",
    send: postOauthToken,
    fields: {
      grant_type: "authorization_code",
      client_id: "client-id",
      client_secret: "secret+&= value",
      code: "code+&= value",
      redirect_uri: "https://app.example/callback?next=/chat&source=oauth",
      code_verifier: "pkce-verifier",
    },
  },
  {
    name: "token refresh",
    path: "/oauth/token",
    send: postOauthToken,
    fields: {
      grant_type: "refresh_token",
      refresh_token: "refresh+&= value",
      scope: "chat:read chat:write",
    },
  },
  {
    name: "token revocation",
    path: "/oauth/revoke",
    send: postOauthRevoke,
    fields: {
      token: "refresh+&= value",
      token_type_hint: "refresh_token",
      client_id: "client-id",
      client_secret: "secret+&= value",
    },
  },
  {
    name: "consent",
    path: "/oauth/consent",
    send: postOauthConsent,
    fields: {
      action: "approve",
      client_id: "client-id",
      redirect_uri: "https://app.example/callback",
      scope: "chat:read chat:write",
      state: "state+&= café",
      code_challenge: "pkce-challenge",
      code_challenge_method: "S256",
      spending_cap: "12.5",
    },
  },
];

describe("OAuth form bodies", () => {
  it("documents the consent body as a string", () => {
    const documentation = readFileSync(
      new URL("../docs/client/Internal/type-aliases/PostOauthConsentData.md", import.meta.url),
      "utf8"
    );

    expect(documentation).toContain("> `optional` **body**: `string`");
    expect(documentation).not.toContain("Daily spending cap in USD");
  });

  it.each(forms)("sends the encoded $name fields", async ({ path, send, fields }) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("{}", { headers: { "Content-Type": "application/json" } }));
    const client = createClient({ baseUrl: "https://portal.example", fetch });
    const body = new URLSearchParams(fields).toString();

    await send({ client, body });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`https://portal.example${path}`);
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("content-type")).toBe(
      "application/x-www-form-urlencoded"
    );
    if (typeof init?.body !== "string") {
      throw new TypeError("The form body must be a string.");
    }
    expect(Object.fromEntries(new URLSearchParams(init.body))).toEqual(fields);
    expect(init?.body).toBe(body);
  });

  it("retains object form fields and repeated values", () => {
    const body = urlSearchParamsBodySerializer.bodySerializer({
      grant_type: "refresh_token",
      refresh_token: "refresh+&= value",
      spending_cap: 0,
      scope: ["chat:read", "chat:write"],
      client_secret: "",
      omitted: undefined,
      absent: null,
    });

    expect([...new URLSearchParams(body)]).toEqual([
      ["grant_type", "refresh_token"],
      ["refresh_token", "refresh+&= value"],
      ["spending_cap", "0"],
      ["scope", "chat:read"],
      ["scope", "chat:write"],
      ["client_secret", ""],
    ]);
  });
});
