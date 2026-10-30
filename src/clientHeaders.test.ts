// @vitest-environment node

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { type Client, type Config, createClient } from "./client/client";
import { mergeHeaders } from "./client/client/utils.gen";
import { urlSearchParamsBodySerializer } from "./client/core/bodySerializer.gen";
import {
  postApiV1NotificationsDevices,
  postNearbyAccessCode,
  postNearbyWaitlist,
  postOauthRevoke,
  postOauthToken,
  postReferralClaim,
  putApiV1NotificationsPreferences,
} from "./client/sdk.gen";

const endpoints = [
  {
    path: "/nearby/access-code",
    method: "POST",
    send: (client: Client, headers: Config["headers"]) =>
      postNearbyAccessCode({ client, headers, body: { code: "beta-code" } }),
  },
  {
    path: "/nearby/waitlist",
    method: "POST",
    send: (client: Client, headers: Config["headers"]) =>
      postNearbyWaitlist({ client, headers, body: {} }),
  },
  {
    path: "/referral/claim",
    method: "POST",
    send: (client: Client, headers: Config["headers"]) =>
      postReferralClaim({ client, headers, body: { claim_token: "claim-token" } }),
  },
  {
    path: "/api/v1/notifications/devices",
    method: "POST",
    send: (client: Client, headers: Config["headers"]) =>
      postApiV1NotificationsDevices({
        client,
        headers,
        body: { token: "ExponentPushToken[test]", platform: "ios" },
      }),
  },
  {
    path: "/oauth/token",
    method: "POST",
    send: (client: Client, headers: Config["headers"]) =>
      postOauthToken({ client, headers, body: "grant_type=refresh_token" }),
  },
  {
    path: "/api/v1/notifications/preferences",
    method: "PUT",
    send: (client: Client, headers: Config["headers"]) =>
      putApiV1NotificationsPreferences({ client, headers, body: { preferences: [] } }),
  },
];

const headerForms = [
  { name: "Headers", create: (entries: [string, string][]) => new Headers(entries) },
  { name: "tuples", create: (entries: [string, string][]) => entries },
  { name: "record", create: (entries: [string, string][]) => Object.fromEntries(entries) },
];

function setup() {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(new Response("{}", { headers: { "Content-Type": "application/json" } }));
  const client = createClient({
    baseUrl: "https://portal.example",
    fetch,
    headers: { Authorization: "Bearer client-token", "X-Client": "sdk" },
  });
  return { client, fetch };
}

describe("client header pairs", () => {
  it.each(["defaults", "request"])("uses the last authorization pair from %s", async (source) => {
    const headers: [string, string][] = [
      ["Authorization", "Bearer old-token"],
      ["authorization", "Bearer current-token"],
      ["X-Request", "test"],
    ];
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response("{}"));
    const client = createClient({
      baseUrl: "https://portal.example",
      fetch,
      headers: source === "defaults" ? headers : undefined,
    });

    await client.get({
      url: "/nearby/admission",
      headers: source === "request" ? headers : undefined,
    });

    expect(fetch).toHaveBeenCalledOnce();
    const sentHeaders = new Headers(fetch.mock.calls[0][1]?.headers);
    expect([...sentHeaders]).toEqual([
      ["authorization", "Bearer current-token"],
      ["x-request", "test"],
    ]);
    expect(headers[0]).toEqual(["Authorization", "Bearer old-token"]);
  });

  it("preserves Headers values, record values, and null deletions", () => {
    const headers = mergeHeaders(
      new Headers({ Authorization: "Bearer client-token", "X-Client": "sdk" }),
      [["X-Request", "test"]],
      {
        Authorization: null,
        "X-Client": undefined,
        "X-Tag": ["first", "second"],
        "X-Count": 2,
        "X-Enabled": false,
        "X-Metadata": { source: "sdk" },
      }
    );

    expect([...headers]).toEqual([
      ["x-client", "sdk"],
      ["x-count", "2"],
      ["x-enabled", "false"],
      ["x-metadata", '{"source":"sdk"}'],
      ["x-request", "test"],
      ["x-tag", "first, second"],
    ]);
  });
});

describe("generated URL-encoded request bodies", () => {
  it.each([
    {
      path: "/oauth/token",
      send: postOauthToken,
      body: "grant_type=refresh_token&refresh_token=token%2B%26%3D&scope=chat%3Aread+chat%3Awrite",
    },
    {
      path: "/oauth/revoke",
      send: postOauthRevoke,
      body: "token=token%2B%26%3D&token_type_hint=refresh_token&client_secret=caf%C3%A9+secret",
    },
  ])("preserves the encoded body for $path", async ({ path, send, body }) => {
    const { client, fetch } = setup();

    await send({ client, body });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`https://portal.example${path}`);
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("content-type")).toBe(
      "application/x-www-form-urlencoded"
    );
    expect(init?.body).toBe(body);
  });

  it.each(["", "grant_type=refresh_token", "scope=chat%3Aread&scope=chat%3Awrite+extra"])(
    "preserves the string body %j",
    (body) => {
      expect(urlSearchParamsBodySerializer.bodySerializer(body)).toBe(body);
    }
  );

  it("retains object fields and repeated values", () => {
    const body = urlSearchParamsBodySerializer.bodySerializer({
      grant_type: "refresh_token",
      refresh_token: "token+&= value",
      scope: ["chat:read", "chat:write"],
      count: 0,
      enabled: false,
      empty: "",
      omitted: undefined,
      absent: null,
    });

    expect([...new URLSearchParams(body)]).toEqual([
      ["grant_type", "refresh_token"],
      ["refresh_token", "token+&= value"],
      ["scope", "chat:read"],
      ["scope", "chat:write"],
      ["count", "0"],
      ["enabled", "false"],
      ["empty", ""],
    ]);
  });
});

describe.each(headerForms)("generated request headers from $name", ({ create }) => {
  it.each(endpoints)("retains authentication for $path", async ({ path, method, send }) => {
    const { client, fetch } = setup();
    const headers = create([
      ["Authorization", "Bearer request-token"],
      ["X-Request", "test"],
    ]);

    await send(client, headers);

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    const sentHeaders = new Headers(init?.headers);
    expect(url).toBe(`https://portal.example${path}`);
    expect(init?.method).toBe(method);
    expect(sentHeaders.get("authorization")).toBe("Bearer request-token");
    expect(sentHeaders.get("x-client")).toBe("sdk");
    expect(sentHeaders.get("x-request")).toBe("test");
    expect(sentHeaders.get("content-type")).toBe(
      path === "/oauth/token" ? "application/x-www-form-urlencoded" : "application/json"
    );
    expect(new Headers(headers)).toEqual(
      new Headers({ Authorization: "Bearer request-token", "X-Request": "test" })
    );
  });

  it("lets the caller override the content type without case sensitivity", async () => {
    const { client, fetch } = setup();

    await postNearbyAccessCode({
      client,
      body: { code: "beta-code" },
      headers: create([["content-type", "application/vnd.anuma+json"]]),
    });

    expect(fetch).toHaveBeenCalledOnce();
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get("content-type")).toBe(
      "application/vnd.anuma+json"
    );
  });

  it("retains header names that match object properties", async () => {
    const { client, fetch } = setup();

    await postNearbyAccessCode({
      client,
      body: { code: "beta-code" },
      headers: create([
        ["__proto__", "request-prototype"],
        ["constructor", "request-constructor"],
      ]),
    });

    expect(fetch).toHaveBeenCalledOnce();
    const headers = new Headers(fetch.mock.calls[0][1]?.headers);
    expect(headers.get("__proto__")).toBe("request-prototype");
    expect(headers.get("constructor")).toBe("request-constructor");
  });
});

it.each(endpoints)(
  "authenticates $path with only per-call Headers",
  async ({ path, method, send }) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation((_url, init) => {
      const authenticated =
        new Headers(init?.headers).get("authorization") === "Bearer request-token";
      return Promise.resolve(
        new Response("{}", {
          status: authenticated ? 200 : 401,
          headers: { "Content-Type": "application/json" },
        })
      );
    });
    const client = createClient({ baseUrl: "https://portal.example", fetch });

    const result = await send(client, new Headers({ Authorization: "Bearer request-token" }));

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toBe(`https://portal.example${path}`);
    expect(fetch.mock.calls[0][1]?.method).toBe(method);
    expect(result.response?.status).toBe(200);
    expect(result.error).toBeUndefined();
  }
);

it.each(["fresh", "partial"])("patches %s generated header spreads", (state) => {
  const root = mkdtempSync(join(tmpdir(), "sdk-header-patch-"));
  const sdkPath = join(root, "src/client/sdk.gen.ts");
  const utilsPath = join(root, "src/client/client/utils.gen.ts");
  const patchPath = join(root, "scripts/patch-generated-client.mjs");

  try {
    for (const file of [
      "scripts/patch-generated-client.mjs",
      "src/client/index.ts",
      "src/client/sdk.gen.ts",
      "src/client/types.gen.ts",
      "src/client/client/utils.gen.ts",
      "src/client/core/bodySerializer.gen.ts",
      "src/client/core/serverSentEvents.gen.ts",
      "src/client/client/client.gen.ts",
    ]) {
      const target = join(root, file);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(new URL(`../${file}`, import.meta.url), target);
    }

    const expectedUtils = readFileSync(utilsPath, "utf-8");
    writeFileSync(
      utilsPath,
      expectedUtils.replace(
        / {4}const iterator =[\s\S]*?Object\.entries\(header\);/,
        "    const iterator = header instanceof Headers ? headersEntries(header) : Object.entries(header);"
      )
    );

    const serializerPath = join(root, "src/client/core/bodySerializer.gen.ts");
    const expectedSerializer = readFileSync(serializerPath, "utf-8");
    writeFileSync(
      serializerPath,
      expectedSerializer
        .replace(
          "JSON.stringify(body, (_key, value: unknown) =>",
          "JSON.stringify(body, (_key, value) =>"
        )
        .replace("    if (typeof body === 'string') {\n      return body;\n    }\n\n", "")
    );

    const expected = readFileSync(sdkPath, "utf-8");
    let generated = expected
      .replaceAll("...normalizeHeaders(options.headers)", "...options.headers")
      .replaceAll("...normalizeHeaders(options?.headers)", "...options?.headers");

    if (state === "partial") {
      generated = generated
        .replace("...options.headers", "...normalizeHeaders(options.headers)")
        .replace("...options?.headers", "...normalizeHeaders(options?.headers)");
    } else {
      generated = generated.replace("import { normalizeHeaders } from '../clientHeaders';\n", "");
    }
    writeFileSync(sdkPath, generated);

    execFileSync(process.execPath, [patchPath]);
    const patched = readFileSync(sdkPath, "utf-8");
    expect(/\.\.\.options\??\.headers/.test(patched)).toBe(false);
    expect(patched).toBe(expected);
    expect(readFileSync(utilsPath, "utf-8")).toBe(expectedUtils);
    expect(readFileSync(serializerPath, "utf-8")).toBe(expectedSerializer);

    execFileSync(process.execPath, [patchPath]);
    expect(readFileSync(sdkPath, "utf-8")).toBe(expected);
    expect(readFileSync(utilsPath, "utf-8")).toBe(expectedUtils);
    expect(readFileSync(serializerPath, "utf-8")).toBe(expectedSerializer);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("retains repeated tuple header values", async () => {
  const { client, fetch } = setup();

  await postNearbyAccessCode({
    client,
    body: { code: "beta-code" },
    headers: [
      ["X-Tag", "first"],
      ["X-Tag", "second"],
    ],
  });

  expect(fetch).toHaveBeenCalledOnce();
  expect(new Headers(fetch.mock.calls[0][1]?.headers).get("x-tag")).toBe("first, second");
});

it("retains record header deletion and array values", async () => {
  const { client, fetch } = setup();

  await postNearbyAccessCode({
    client,
    body: { code: "beta-code" },
    headers: { Authorization: null, "X-Tag": ["first", "second"], "X-Count": 2 },
  });

  expect(fetch).toHaveBeenCalledOnce();
  const headers = new Headers(fetch.mock.calls[0][1]?.headers);
  expect(headers.has("authorization")).toBe(false);
  expect(headers.get("x-tag")).toBe("first, second");
  expect(headers.get("x-count")).toBe("2");
});

it("uses the client headers when the caller omits request headers", async () => {
  const { client, fetch } = setup();

  await postNearbyAccessCode({ client, body: { code: "beta-code" } });

  expect(fetch).toHaveBeenCalledOnce();
  expect(new Headers(fetch.mock.calls[0][1]?.headers).get("authorization")).toBe(
    "Bearer client-token"
  );
});

it("accepts an optional endpoint without options", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetch);
  try {
    await postOauthToken();
    expect(fetch).toHaveBeenCalledOnce();
  } finally {
    vi.unstubAllGlobals();
  }
});
