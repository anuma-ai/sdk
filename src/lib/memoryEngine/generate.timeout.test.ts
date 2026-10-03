/**
 * Every await on the embedding path is bounded.
 *
 * Recall awaited `getToken()` and each `postApiV1Embeddings` attempt with no
 * deadline, and its degrade-to-BM25 path only fires on a REJECTION — so a stuck
 * token refresh or a request that never answered hung the whole recall (and the
 * turn waiting on it) forever instead of degrading.
 *
 * Fake timers are installed BEFORE the call under test, so the deadline timers
 * the code schedules are fake ones this test can advance. The hung fetch ignores
 * its abort signal on purpose: the bound must hold even for a transport that
 * doesn't honor `signal`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateEmbedding, generateEmbeddings } from "./generate";

const BASE = "https://portal.test";

/** Settlement state of a promise, observable without awaiting it. */
function track<T>(p: Promise<T>): { state: "pending" | "resolved" | "rejected"; error?: unknown } {
  const t: { state: "pending" | "resolved" | "rejected"; error?: unknown } = { state: "pending" };
  p.then(
    () => (t.state = "resolved"),
    (err) => {
      t.state = "rejected";
      t.error = err;
    }
  );
  return t;
}

let signals: Array<AbortSignal | undefined>;

beforeEach(() => {
  vi.useFakeTimers();
  signals = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: unknown, init?: RequestInit) => {
      signals.push(init?.signal ?? undefined);
      return new Promise<Response>(() => {}); // never settles, ignores the signal
    })
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("embedding deadlines", () => {
  it("rejects a single embed whose request never answers, after the bounded retries", async () => {
    const t = track(generateEmbedding("hello", { apiKey: "k", baseUrl: BASE, timeoutMs: 1000 }));

    // 4 attempts x 1s deadline + ~1.75s-2.5s of backoff between them.
    await vi.advanceTimersByTimeAsync(10_000);

    expect(t.state).toBe("rejected");
    expect((t.error as Error).name).toBe("TimeoutError");
    // Each attempt got its own signal, and each one was aborted at its deadline.
    expect(signals).toHaveLength(4);
    expect(signals.every((s) => s?.aborted)).toBe(true);
  });

  it("rejects a batch embed whose request never answers", async () => {
    const t = track(
      generateEmbeddings(["a", "b"], { apiKey: "k", baseUrl: BASE, timeoutMs: 1000 })
    );

    await vi.advanceTimersByTimeAsync(10_000);

    expect(t.state).toBe("rejected");
    expect((t.error as Error).name).toBe("TimeoutError");
  });

  it("uses a default deadline when none is configured", async () => {
    const t = track(generateEmbedding("hello", { apiKey: "k", baseUrl: BASE }));

    await vi.advanceTimersByTimeAsync(5 * 60_000);

    expect(t.state).toBe("rejected");
  });

  it("rejects when getToken() never settles, without sending a request", async () => {
    const t = track(
      generateEmbedding("hello", {
        getToken: () => new Promise<string | null>(() => {}),
        baseUrl: BASE,
        tokenTimeoutMs: 500,
      })
    );

    await vi.advanceTimersByTimeAsync(1000);

    expect(t.state).toBe("rejected");
    expect((t.error as Error).message).toMatch(/token/i);
    expect(signals).toHaveLength(0);
  });

  it("bounds the token read on the batch path too", async () => {
    const t = track(
      generateEmbeddings(["a"], {
        getToken: () => new Promise<string | null>(() => {}),
        baseUrl: BASE,
        tokenTimeoutMs: 500,
      })
    );

    await vi.advanceTimersByTimeAsync(1000);

    expect(t.state).toBe("rejected");
  });

  it("totalTimeoutMs bounds the whole call — every attempt and backoff — and stops retrying", async () => {
    // Default 15s per attempt would allow ~60s+; the overall budget caps it.
    const t = track(
      generateEmbedding("hello", { apiKey: "k", baseUrl: BASE, totalTimeoutMs: 8000 })
    );

    await vi.advanceTimersByTimeAsync(7999);
    expect(t.state).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(t.state).toBe("rejected");
    expect((t.error as Error).name).toBe("TimeoutError");
    expect(signals[0]?.aborted).toBe(true);

    // Nobody is waiting any more: no further attempts are fired.
    await vi.advanceTimersByTimeAsync(120_000);
    expect(signals).toHaveLength(1);
  });

  it("totalTimeoutMs also covers a stuck token read", async () => {
    const t = track(
      generateEmbedding("hello", {
        getToken: () => new Promise<string | null>(() => {}),
        baseUrl: BASE,
        totalTimeoutMs: 2000,
      })
    );

    await vi.advanceTimersByTimeAsync(2000);

    expect(t.state).toBe("rejected");
  });
});

/**
 * A SYNCHRONOUS throw or a bare (non-promise) return from the wrapped call.
 * The deadline timer used to be armed before the call and outside the `try`:
 * a sync throw left it running, and when it fired it rejected with nobody
 * listening — one unhandled rejection per retry attempt, which crashes Node.
 */
describe("embedding deadlines — synchronous callers", () => {
  it("rejects with a sync maskInput throw, leaves no timer armed and no unhandled rejection", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      const boom = new Error("redactor exploded");
      const t = track(
        generateEmbedding("hello", {
          apiKey: "k",
          baseUrl: BASE,
          timeoutMs: 1000,
          maskInput: () => {
            throw boom;
          },
        })
      );

      // Past every backoff AND past every would-be deadline.
      await vi.advanceTimersByTimeAsync(60_000);
      await vi.advanceTimersByTimeAsync(0);

      expect(t.state).toBe("rejected");
      expect(t.error).toBe(boom);
      expect(vi.getTimerCount()).toBe(0);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });

  it("resolves when getToken returns a bare string instead of a promise", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ data: [{ embedding: [1, 2, 3], index: 0 }] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
      )
    );
    const getToken = (() => "tok") as unknown as () => Promise<string | null>;

    const t = track(generateEmbedding("hello", { getToken, baseUrl: BASE }));
    await vi.advanceTimersByTimeAsync(0);

    expect(t.state).toBe("resolved");
  });
});
