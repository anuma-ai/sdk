import { describe, expect, test, vi } from "vitest";

import type { ConnectorMintResult, ConnectorTokenSource } from "./client.js";
import { createConnectorTokenGetter } from "./client.js";

function tokenSource(responses: ConnectorMintResult[]): ConnectorTokenSource & {
  mintConnectorToken: ReturnType<typeof vi.fn>;
} {
  const fn = vi.fn(async () => {
    if (responses.length === 0) {
      throw new Error("token source ran out of responses");
    }
    return responses.shift()!;
  });
  return { mintConnectorToken: fn };
}

describe("createConnectorTokenGetter", () => {
  test("returns the access token on first call and caches it for subsequent calls", async () => {
    const source = tokenSource([{ ok: true, accessToken: "first-token", expiresAt: 60_000 }]);
    const getToken = createConnectorTokenGetter(source, "gmail", {
      now: () => 1_000,
    });

    expect(await getToken()).toBe("first-token");
    expect(await getToken()).toBe("first-token");
    expect(source.mintConnectorToken).toHaveBeenCalledTimes(1);
  });

  test("refreshes when expiry minus refreshBeforeMs has passed", async () => {
    const source = tokenSource([
      { ok: true, accessToken: "stale", expiresAt: 100_000 },
      { ok: true, accessToken: "fresh", expiresAt: 200_000 },
    ]);
    let nowValue = 1_000;
    const getToken = createConnectorTokenGetter(source, "gmail", {
      now: () => nowValue,
      refreshBeforeMs: 10_000,
    });

    expect(await getToken()).toBe("stale");

    // Inside the freshness window: (100_000 - 10_000) > 80_000 → cached.
    nowValue = 80_000;
    expect(await getToken()).toBe("stale");

    // Past the refresh boundary: (100_000 - 10_000) <= 95_000 → re-mint.
    nowValue = 95_000;
    expect(await getToken()).toBe("fresh");
    expect(source.mintConnectorToken).toHaveBeenCalledTimes(2);
  });

  test("applies default refreshBeforeMs of 30 seconds", async () => {
    const source = tokenSource([
      { ok: true, accessToken: "t", expiresAt: 100_000 },
      { ok: true, accessToken: "t2", expiresAt: 200_000 },
    ]);
    let nowValue = 1_000;
    const getToken = createConnectorTokenGetter(source, "gmail", {
      now: () => nowValue,
    });

    expect(await getToken()).toBe("t");

    // (100_000 - 30_000) = 70_000 → cached at 69_999.
    nowValue = 69_999;
    expect(await getToken()).toBe("t");

    // 70_000 == 70_000 → boundary triggers refresh.
    nowValue = 70_000;
    expect(await getToken()).toBe("t2");
  });

  test("returns null and clears cache when mint fails without onNotConnected", async () => {
    const source = tokenSource([
      {
        ok: false,
        error: {
          code: "connector_not_connected",
          provider: "gmail",
          connectUrl: "https://portal.example/connect",
        },
      },
      { ok: true, accessToken: "after-reconnect", expiresAt: 200_000 },
    ]);
    const getToken = createConnectorTokenGetter(source, "gmail", {
      now: () => 1_000,
    });

    expect(await getToken()).toBeNull();
    // Next call must re-attempt the mint (cache was not populated).
    expect(await getToken()).toBe("after-reconnect");
    expect(source.mintConnectorToken).toHaveBeenCalledTimes(2);
  });

  test("forwards mint errors to onNotConnected when supplied", async () => {
    const source = tokenSource([
      {
        ok: false,
        error: {
          code: "scope_not_covered",
          provider: "gmail",
          missingScopes: ["gmail.send"],
          connectUrl: "https://portal.example/connect",
        },
      },
    ]);
    const onNotConnected = vi.fn(async () => "recovered-token");
    const getToken = createConnectorTokenGetter(source, "gmail", {
      now: () => 1_000,
      onNotConnected,
    });

    expect(await getToken()).toBe("recovered-token");
    expect(onNotConnected).toHaveBeenCalledWith({
      code: "scope_not_covered",
      provider: "gmail",
      missingScopes: ["gmail.send"],
      connectUrl: "https://portal.example/connect",
    });
  });
});
