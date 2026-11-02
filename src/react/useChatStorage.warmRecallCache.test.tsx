import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChunkVectorCache } from "../lib/db/chat/operations";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import type { ChatBackend, ChatBackendFactory } from "../lib/storage";
import { localChatBackend } from "../lib/storage";
import { useChatStorage } from "./useChatStorage";
import { clearEncryptionKey } from "./useEncryption";

const walletAddress = "0x00000000000000000000000000000000000000c3";

function makeDatabase(): Database {
  return new Database({
    adapter: new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `warm-recall-${Math.random().toString(36).slice(2)}`,
    }),
    modelClasses: sdkModelClasses,
  });
}

function spyingBackend(database: Database, withWarm = true) {
  const warmed: ChunkVectorCache[] = [];
  const searched: (ChunkVectorCache | undefined)[] = [];
  const factory: ChatBackendFactory = (signer) => {
    const inner = localChatBackend(database)(signer);
    const backend: ChatBackend = Object.create(inner);
    backend.searchChunks = (vector, options) => {
      searched.push(options?.chunkCache);
      return inner.searchChunks(vector, options);
    };
    if (withWarm) {
      backend.warmChunkCache = (options) => {
        warmed.push(options.chunkCache);
        return inner.warmChunkCache!(options);
      };
    } else {
      backend.warmChunkCache = undefined;
    }
    return backend;
  };
  return { factory, warmed, searched };
}

describe("useChatStorage warmRecallCache", () => {
  beforeEach(() => {
    clearEncryptionKey(walletAddress);
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            data: [{ object: "embedding", index: 0, embedding: [1, 0, 0] }],
            usage: { prompt_tokens: 1, total_tokens: 1 },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
    );
  });

  afterEach(() => {
    cleanup();
    clearEncryptionKey(walletAddress);
    vi.restoreAllMocks();
  });

  it("fills the same cache the chunk lane of recall reads", async () => {
    const backend = spyingBackend(makeDatabase());
    const { result } = renderHook(() =>
      useChatStorage({
        database: makeDatabase(),
        chatBackend: backend.factory,
        getToken: () => Promise.resolve("token"),
        autoEmbedMessages: false,
      })
    );

    expect(await act(() => result.current.warmRecallCache())).toBe(0);
    await act(() => result.current.recall("coffee", { types: ["chunk"] }));

    expect(backend.warmed).toHaveLength(1);
    expect(backend.searched).toHaveLength(1);
    expect(backend.searched[0]).toBe(backend.warmed[0]);
  });

  it("resolves to zero for a backend that ranks off the device", async () => {
    const backend = spyingBackend(makeDatabase(), false);
    const { result } = renderHook(() =>
      useChatStorage({
        database: makeDatabase(),
        chatBackend: backend.factory,
        getToken: () => Promise.resolve("token"),
        autoEmbedMessages: false,
      })
    );

    expect(await act(() => result.current.warmRecallCache())).toBe(0);
    expect(backend.warmed).toHaveLength(0);
  });
});
