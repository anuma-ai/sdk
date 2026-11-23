import { afterEach, describe, expect, it, vi } from "vitest";

import * as remotePersistence from "./remotePersistence.js";

afterEach(() => {
  vi.doUnmock("./remotePersistence.js");
  vi.resetModules();
});

describe("remote memory ID limits", () => {
  it.each(["list", "listProjections", "search"] as const)(
    "uses the shared persistence cap for %s after the cap changes",
    async (operation) => {
      vi.resetModules();
      vi.doMock("./remotePersistence.js", () => ({
        ...remotePersistence,
        MAX_REMOTE_MEMORY_IDS: 2,
      }));
      const { createRemoteMemoryStore } = await import("./remoteStore.js");
      const query = vi
        .fn<remotePersistence.RemoteMemoryPersistence["query"]>()
        .mockResolvedValue({ items: [], failed: [] });
      const queryMetadata = vi
        .fn<remotePersistence.RemoteMemoryPersistence["queryMetadata"]>()
        .mockResolvedValue({ items: [] });
      const candidates = vi
        .fn<remotePersistence.RemoteMemoryPersistence["candidates"]>()
        .mockResolvedValue({ items: [], failed: [] });
      const persistence: remotePersistence.RemoteMemoryPersistence = {
        claimWork: vi.fn(),
        setEnabled: vi.fn(),
        recordRecalls: vi.fn(),
        releaseWork: vi.fn(),
        topics: vi.fn(),
        putTopic: vi.fn(),
        importTopics: vi.fn(),
        counts: vi.fn(),
        temporal: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
        putMany: vi.fn(),
        candidateSet: vi.fn(),
        list: vi.fn(),
        query,
        queryMetadata,
        candidates,
      };
      const store = createRemoteMemoryStore({
        persistence,
        embeddingOptions: { apiKey: "test", model: "model" },
      });
      const memoryIds = ["a", "b", "c", "d", "e"];

      if (operation === "search") {
        await store.factSource.search("tea", {
          memoryIds,
          queryEmbedding: [1, ...new Array<number>(1535).fill(0)],
        });
      } else {
        await store[operation]({ memoryIds });
      }

      const calls =
        operation === "search"
          ? candidates.mock.calls.map(([, options]) => options)
          : operation === "list"
            ? query.mock.calls.map(([options]) => options)
            : queryMetadata.mock.calls.map(([options]) => options);
      expect(calls.map((options) => options?.memory_ids)).toEqual([["a", "b"], ["c", "d"], ["e"]]);
      expect(memoryIds).toEqual(["a", "b", "c", "d", "e"]);
    }
  );
});
