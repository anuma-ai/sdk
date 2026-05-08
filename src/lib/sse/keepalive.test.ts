import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SseIdleTimeoutError, withSseKeepalive } from "./keepalive";

async function* fromValues<T>(values: T[]): AsyncGenerator<T> {
  for (const v of values) {
    yield v;
  }
}

// Yields values then suspends forever (no setTimeout — immune to fake timers).
async function* hangAfter<T>(values: T[]): AsyncGenerator<T> {
  for (const v of values) {
    yield v;
  }
  await new Promise<never>(() => {});
}

// ── Passthrough ──────────────────────────────────────────────────────────────

describe("withSseKeepalive — passthrough (idleMs ≤ 0)", () => {
  it("passes all events through when idleMs is 0", async () => {
    const results: number[] = [];
    for await (const v of withSseKeepalive(fromValues([1, 2, 3]), { idleMs: 0 })) {
      results.push(v);
    }
    expect(results).toEqual([1, 2, 3]);
  });

  it("passes all events through when idleMs is negative", async () => {
    const results: string[] = [];
    for await (const v of withSseKeepalive(fromValues(["a", "b"]), { idleMs: -1 })) {
      results.push(v);
    }
    expect(results).toEqual(["a", "b"]);
  });

  it("calls return() on the source when the consumer breaks early in passthrough mode", async () => {
    const returnSpy = vi.fn().mockResolvedValue({ done: true, value: undefined });
    const source: AsyncIterable<number> = {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ done: false as const, value: 42 }),
        return: returnSpy,
      }),
    };

    for await (const _ of withSseKeepalive(source, { idleMs: 0 })) {
      break;
    }

    expect(returnSpy).toHaveBeenCalled();
  });
});

// ── Happy path ───────────────────────────────────────────────────────────────

describe("withSseKeepalive — happy path", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("yields all events and completes when the source finishes", async () => {
    const results: number[] = [];
    for await (const v of withSseKeepalive(fromValues([10, 20, 30]), { idleMs: 5_000 })) {
      results.push(v);
    }
    expect(results).toEqual([10, 20, 30]);
  });

  it("does not time out when events arrive before idleMs elapses", async () => {
    const gen = withSseKeepalive(hangAfter(["first"]), { idleMs: 1_000 });

    const first = await gen.next();
    expect(first.value).toBe("first");

    // Advance to just under the idle threshold — the promise must still be pending.
    const pending = gen.next();
    vi.advanceTimersByTime(999);

    const sentinel = Symbol("pending");
    const result = await Promise.race([pending, Promise.resolve(sentinel)]);
    expect(result).toBe(sentinel);

    // Clean up: advance past idleMs and consume the resulting rejection so no
    // dangling promise is left after the test.
    vi.advanceTimersByTime(2);
    await expect(pending).rejects.toBeInstanceOf(SseIdleTimeoutError);
  });
});

// ── Timeout path ─────────────────────────────────────────────────────────────

describe("withSseKeepalive — timeout path", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("throws SseIdleTimeoutError when the source never emits", async () => {
    const gen = withSseKeepalive(hangAfter<string>([]), { idleMs: 1_000 });
    const pending = gen.next();

    vi.advanceTimersByTime(1_001);

    await expect(pending).rejects.toBeInstanceOf(SseIdleTimeoutError);
  });

  it("throws SseIdleTimeoutError after silence following a real event", async () => {
    const gen = withSseKeepalive(hangAfter(["first"]), { idleMs: 1_000 });

    const first = await gen.next();
    expect(first.value).toBe("first");

    const pending = gen.next();
    vi.advanceTimersByTime(1_001);

    await expect(pending).rejects.toBeInstanceOf(SseIdleTimeoutError);
  });

  it("calls onIdle before throwing and passes correct info", async () => {
    const onIdle = vi.fn();
    const gen = withSseKeepalive(hangAfter<string>([]), { idleMs: 500, onIdle });
    const pending = gen.next();

    vi.advanceTimersByTime(501);

    await expect(pending).rejects.toBeInstanceOf(SseIdleTimeoutError);
    expect(onIdle).toHaveBeenCalledOnce();
    expect(onIdle).toHaveBeenCalledWith(expect.objectContaining({ idleMs: 500 }));
  });

  it("swallows errors thrown by onIdle so SseIdleTimeoutError still propagates", async () => {
    const onIdle = vi.fn().mockImplementation(() => {
      throw new Error("callback boom");
    });
    const gen = withSseKeepalive(hangAfter<string>([]), { idleMs: 100, onIdle });
    const pending = gen.next();

    vi.advanceTimersByTime(101);

    await expect(pending).rejects.toBeInstanceOf(SseIdleTimeoutError);
  });

  it("error message includes the idle duration", async () => {
    const gen = withSseKeepalive(hangAfter<string>([]), { idleMs: 2_000 });
    const pending = gen.next();

    vi.advanceTimersByTime(2_001);

    const err = await pending.catch((e) => e);
    expect(err).toBeInstanceOf(SseIdleTimeoutError);
    expect(err.message).toContain("2000ms");
    expect(err.idleMs).toBe(2_000);
  });
});

// ── Consumer break ────────────────────────────────────────────────────────────

describe("withSseKeepalive — consumer break", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("calls return() on the source when the consumer breaks early", async () => {
    const returnSpy = vi.fn().mockResolvedValue({ done: true, value: undefined });
    let emitCount = 0;
    const source: AsyncIterable<number> = {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ done: false as const, value: emitCount++ }),
        return: returnSpy,
      }),
    };

    for await (const _ of withSseKeepalive(source, { idleMs: 5_000 })) {
      break;
    }

    expect(returnSpy).toHaveBeenCalled();
  });

  it("calls return() on the source when the consumer throws", async () => {
    const returnSpy = vi.fn().mockResolvedValue({ done: true, value: undefined });
    const source: AsyncIterable<string> = {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ done: false as const, value: "x" }),
        return: returnSpy,
      }),
    };

    await expect(async () => {
      for await (const _ of withSseKeepalive(source, { idleMs: 5_000 })) {
        throw new Error("consumer error");
      }
    }).rejects.toThrow("consumer error");

    expect(returnSpy).toHaveBeenCalled();
  });
});
