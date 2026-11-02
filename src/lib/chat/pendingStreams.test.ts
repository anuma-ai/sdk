import { describe, expect, it } from "vitest";

import {
  backgroundMessageId,
  createLocalStoragePendingStreams,
  PENDING_STREAM_MAX_AGE_MS,
  type PendingStream,
} from "./pendingStreams";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

function entry(overrides: Partial<PendingStream> = {}): PendingStream {
  return {
    inferenceId: "0xabc",
    apiType: "responses",
    model: "auto",
    conversationId: "conv_1",
    parentMessageId: "msg_user_1",
    walletAddress: "0xWallet",
    createdAt: 1_000,
    ...overrides,
  };
}

describe("createLocalStoragePendingStreams", () => {
  it("keeps one record per turn, replacing it as later rounds arrive", () => {
    const store = createLocalStoragePendingStreams("k", memoryStorage(), () => 2_000);
    store.put(entry({ inferenceId: "0xround0" }));
    store.put(entry({ inferenceId: "0xround1" }));
    store.put(entry({ parentMessageId: "msg_user_2", inferenceId: "0xother" }));

    expect(store.list().map((s) => s.inferenceId)).toEqual(["0xround1", "0xother"]);

    store.remove("msg_user_1");
    expect(store.list().map((s) => s.parentMessageId)).toEqual(["msg_user_2"]);
  });

  it("drops records older than the portal can keep a generation", () => {
    let now = 1_000;
    const storage = memoryStorage();
    const store = createLocalStoragePendingStreams("k", storage, () => now);
    store.put(entry());
    now = 1_000 + PENDING_STREAM_MAX_AGE_MS;

    expect(store.list()).toEqual([]);
    store.remove("missing");
    expect(storage.data.has("k")).toBe(false);
  });

  it("ignores corrupt or malformed stored values", () => {
    const corrupt = createLocalStoragePendingStreams("k", memoryStorage({ k: "{not json" }));
    expect(corrupt.list()).toEqual([]);

    const malformed = createLocalStoragePendingStreams(
      "k",
      memoryStorage({ k: JSON.stringify([{ inferenceId: 1 }, entry({ createdAt: Date.now() })]) })
    );
    expect(malformed.list().map((s) => s.inferenceId)).toEqual(["0xabc"]);
  });

  it("works without storage and survives storage that throws", () => {
    const none = createLocalStoragePendingStreams("k", null);
    none.put(entry());
    expect(none.list()).toEqual([]);

    const throwing = createLocalStoragePendingStreams("k", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    });
    expect(() => throwing.put(entry())).not.toThrow();
    expect(throwing.list()).toEqual([]);
  });
});

describe("backgroundMessageId", () => {
  it("derives a stable id from the inference id", () => {
    expect(backgroundMessageId("0xabc")).toBe("msg_bg_0xabc");
  });
});
