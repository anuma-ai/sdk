import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearServerToolsCache,
  getCachedServerTools,
  getServerTools,
  getToolsChecksum,
  shouldRefreshTools,
} from "./serverTools";

const catalog = (checksum = "c1") => ({
  checksum,
  tools: {
    search: {
      name: "search",
      schema: {
        name: "search",
        description: "Search the web",
        parameters: { type: "object", properties: {}, required: [] },
      },
      embedding: [0.1, 0.2],
    },
  },
});

const respond = (checksum = "c1") =>
  new Response(JSON.stringify(catalog(checksum)), {
    headers: { ETag: `"${checksum}"` },
  });

const options = {
  baseUrl: "https://api.test",
  getToken: () => Promise.resolve("token"),
};

const fetchMock = vi.fn<typeof fetch>();

function holdFetch() {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  fetchMock.mockImplementation(async () => {
    await gate;
    return respond();
  });
  return release;
}

describe("server tools without localStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", undefined);
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    clearServerToolsCache();
  });

  afterEach(() => {
    clearServerToolsCache();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reuses the catalog and checksum across messages", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(respond()));

    const first = await getServerTools(options);
    expect(first[0].embedding).toEqual([0.1, 0.2]);
    expect(shouldRefreshTools("c1", undefined)).toBe(false);
    expect(getToolsChecksum()).toBe("c1");
    expect(await getServerTools(options)).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears the catalog and checksum from memory", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(respond()));
    await getServerTools(options);
    expect(getToolsChecksum()).toBe("c1");

    clearServerToolsCache();

    expect(getCachedServerTools()).toBeNull();
    expect(getToolsChecksum()).toBeUndefined();
    expect(shouldRefreshTools("c1")).toBe(true);
    await getServerTools(options);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("revalidates an expired memory entry with its ETag", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1000);
    fetchMock.mockResolvedValueOnce(respond());
    const first = await getServerTools(options);
    now.mockReturnValue(2000);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 304 }));

    expect(await getServerTools({ ...options, cacheExpirationMs: 500 })).toEqual(first);
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ "If-None-Match": '"c1"' });
    expect(getCachedServerTools()?.timestamp).toBe(2000);
    expect(shouldRefreshTools("c1", undefined)).toBe(false);
    expect(await getServerTools({ ...options, cacheExpirationMs: 500 })).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("updates the memory checksum after a forced refresh", async () => {
    fetchMock.mockResolvedValueOnce(respond());
    await getServerTools(options);
    expect(shouldRefreshTools("c2", undefined)).toBe(true);
    fetchMock.mockResolvedValueOnce(respond("c2"));

    await getServerTools({ ...options, forceRefresh: true });

    expect(shouldRefreshTools("c2", undefined)).toBe(false);
    expect(getToolsChecksum()).toBe("c2");
    expect(fetchMock.mock.calls[1][1]?.headers).not.toHaveProperty("If-None-Match");
  });

  it.each([false, true])("shares a pending request with forceRefresh=%s", async (forceRefresh) => {
    const release = holdFetch();
    const requests = Array.from({ length: 3 }, () => getServerTools({ ...options, forceRefresh }));
    try {
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    } finally {
      release();
    }

    const results = await Promise.all(requests);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results[0]).toHaveLength(1);
    expect(results[1]).toEqual(results[0]);
    expect(results[2]).toEqual(results[0]);
    expect(shouldRefreshTools("c1", undefined)).toBe(false);
  });

  it("permits a new request after a shared request fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network unavailable"));
    expect(await Promise.all([getServerTools(options), getServerTools(options)])).toEqual([[], []]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockResolvedValueOnce(respond());

    expect(await getServerTools(options)).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(shouldRefreshTools("c1", undefined)).toBe(false);
  });

  it.each([
    { baseUrl: "https://other.test" },
    { getToken: () => Promise.resolve("other-token") },
    { apiKey: "api-key" },
  ])("keeps distinct requests separate: %o", async (overrides) => {
    const release = holdFetch();
    const requests = [getServerTools(options), getServerTools({ ...options, ...overrides })];
    try {
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    } finally {
      release();
    }
    const results = await Promise.all(requests);

    expect(results[0]).toHaveLength(1);
    expect(results[1]).toEqual(results[0]);
  });
});
