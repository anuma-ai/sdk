/**
 * getServerTools revalidation with ETag. A 304 answer refreshes the stored timestamp only.
 * A server with no ETag, or one that never answers 304, keeps the old behavior. The network
 * is stubbed, so no test sends a request.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type CachedServerTools, getServerTools, type ToolsCacheBackend } from "./serverTools";

const TOOLS_BODY = {
  checksum: "c1",
  tools: {
    a: {
      name: "a",
      description: "tool a",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
};

const DAY = 24 * 60 * 60 * 1000;

function memoryBackend(initial: CachedServerTools | null) {
  let value = initial;
  const backend: ToolsCacheBackend = {
    get: () => value,
    set: (v) => {
      value = v;
    },
  };
  return { backend, read: () => value };
}

function stored(overrides: Partial<CachedServerTools> = {}): CachedServerTools {
  return {
    tools: [
      {
        type: "function",
        name: "old",
        description: "old tool",
        parameters: { type: "object", properties: {}, required: [] },
      },
    ],
    timestamp: Date.now() - 2 * DAY,
    version: "1.3",
    checksum: "c0",
    etag: '"e0"',
    ...overrides,
  };
}

function respond(status: number, body?: unknown, etag?: string): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: etag ? { ETag: etag } : {},
  });
}

const fetchMock = vi.fn();
const sentHeaders = (n = 0) =>
  (fetchMock.mock.calls[n][1] as RequestInit).headers as Record<string, string>;
const options = (backend: ToolsCacheBackend) => ({
  baseUrl: "https://api.test",
  getToken: async () => "tok",
  cache: backend,
});

describe("getServerTools ETag revalidation", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends no request while the cache is fresh", async () => {
    const { backend } = memoryBackend(stored({ timestamp: Date.now() }));
    await getServerTools(options(backend));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends If-None-Match from the expired entry and keeps the cached tools on 304", async () => {
    const entry = stored();
    const { backend, read } = memoryBackend(entry);
    fetchMock.mockResolvedValueOnce(respond(304));

    const tools = await getServerTools(options(backend));

    expect(sentHeaders()["If-None-Match"]).toBe('"e0"');
    expect(tools).toEqual(entry.tools);
    const after = read() as CachedServerTools;
    expect(after.tools).toEqual(entry.tools);
    expect(after.checksum).toBe("c0");
    expect(after.etag).toBe('"e0"');
    expect(after.timestamp).toBeGreaterThan(entry.timestamp);
  });

  it("sends the same header on the API key path", async () => {
    const { backend } = memoryBackend(stored());
    fetchMock.mockResolvedValueOnce(respond(304));
    await getServerTools({ baseUrl: "https://api.test", apiKey: "k", cache: backend });
    expect(sentHeaders()["If-None-Match"]).toBe('"e0"');
    expect(sentHeaders()["X-API-Key"]).toBe("k");
  });

  it("stores the new body, checksum and ETag on 200", async () => {
    const { backend, read } = memoryBackend(stored());
    fetchMock.mockResolvedValueOnce(respond(200, TOOLS_BODY, '"e1"'));

    const tools = await getServerTools(options(backend));

    expect(tools.map((t) => t.name)).toEqual(["a"]);
    expect(read()?.checksum).toBe("c1");
    expect(read()?.etag).toBe('"e1"');
  });

  it("works with a server that sends no ETag", async () => {
    const { backend, read } = memoryBackend(null);
    fetchMock.mockResolvedValueOnce(respond(200, TOOLS_BODY));

    await getServerTools(options(backend));

    expect(sentHeaders()["If-None-Match"]).toBeUndefined();
    expect(read()?.etag).toBeUndefined();
    expect(read()?.checksum).toBe("c1");
  });

  it("sends no validator when the stored entry has no ETag", async () => {
    const { backend } = memoryBackend(stored({ etag: undefined }));
    fetchMock.mockResolvedValueOnce(respond(200, TOOLS_BODY));
    await getServerTools(options(backend));
    expect(sentHeaders()["If-None-Match"]).toBeUndefined();
  });

  it("sends no validator on a forced refresh", async () => {
    const { backend } = memoryBackend(stored({ timestamp: Date.now() }));
    fetchMock.mockResolvedValueOnce(respond(200, TOOLS_BODY, '"e2"'));
    await getServerTools({ ...options(backend), forceRefresh: true });
    expect(sentHeaders()["If-None-Match"]).toBeUndefined();
  });

  it("treats a 304 with no cached entry as a failure and returns an empty list", async () => {
    const { backend } = memoryBackend(null);
    fetchMock.mockResolvedValueOnce(respond(304));
    expect(await getServerTools(options(backend))).toEqual([]);
  });

  it("sends the request again without the validator when the validator request fails to connect", async () => {
    const { backend, read } = memoryBackend(stored());
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    fetchMock.mockResolvedValueOnce(respond(200, TOOLS_BODY, '"e3"'));

    const tools = await getServerTools(options(backend));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentHeaders(1)["If-None-Match"]).toBeUndefined();
    expect(tools.map((t) => t.name)).toEqual(["a"]);
    expect(read()?.etag).toBe('"e3"');
  });

  it("returns the stale tools when the request fails with a server error", async () => {
    const entry = stored();
    const { backend } = memoryBackend(entry);
    fetchMock.mockResolvedValueOnce(respond(500));
    expect(await getServerTools(options(backend))).toEqual(entry.tools);
  });

  it("works when localStorage is unavailable (default backend)", async () => {
    vi.stubGlobal("localStorage", undefined);
    fetchMock.mockResolvedValueOnce(respond(200, TOOLS_BODY, '"e4"'));
    const tools = await getServerTools({
      baseUrl: "https://api.test",
      getToken: async () => "tok",
    });
    expect(tools.map((t) => t.name)).toEqual(["a"]);
    expect(sentHeaders()["If-None-Match"]).toBeUndefined();
  });
});
