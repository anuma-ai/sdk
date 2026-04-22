import { describe, expect, it, vi } from "vitest";

import { TimeoutError, withTimeout } from "./withTimeout";

describe("withTimeout", () => {
  it("resolves with the value when the promise settles before the budget", async () => {
    const result = await withTimeout(Promise.resolve(42), 1000, "fast-op");
    expect(result).toBe(42);
  });

  it("rejects with TimeoutError when the budget elapses first", async () => {
    vi.useFakeTimers();
    try {
      const never = new Promise<number>(() => {});
      const pending = withTimeout(never, 50, "slow-op");
      vi.advanceTimersByTime(50);
      await expect(pending).rejects.toBeInstanceOf(TimeoutError);
    } finally {
      vi.useRealTimers();
    }
  });

  it("attaches the label and timeoutMs to the TimeoutError", async () => {
    vi.useFakeTimers();
    try {
      const never = new Promise<number>(() => {});
      const pending = withTimeout(never, 75, "labelled-op");
      vi.advanceTimersByTime(75);
      try {
        await pending;
        throw new Error("expected rejection");
      } catch (err) {
        expect(err).toBeInstanceOf(TimeoutError);
        const typed = err as TimeoutError;
        expect(typed.label).toBe("labelled-op");
        expect(typed.timeoutMs).toBe(75);
        expect(typed.message).toContain("labelled-op");
        expect(typed.message).toContain("75");
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it("passes through the original rejection when the promise fails before the budget", async () => {
    const err = new Error("boom");
    await expect(withTimeout(Promise.reject(err), 1000, "rejecting-op")).rejects.toBe(err);
  });

  it("disables the timer when timeoutMs is non-finite", async () => {
    const value = await withTimeout(Promise.resolve("ok"), Number.POSITIVE_INFINITY, "no-budget");
    expect(value).toBe("ok");
  });

  it("disables the timer when timeoutMs is zero or negative", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 0, "zero")).resolves.toBe("ok");
    await expect(withTimeout(Promise.resolve("ok"), -5, "negative")).resolves.toBe("ok");
  });

  it("does not surface an unhandled rejection when the promise rejects after the timeout", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);

    try {
      // Build a promise we can reject manually, so we can reliably sequence:
      // start withTimeout → timeout fires → reject the original promise late.
      let rejectLate: (err: Error) => void = () => undefined;
      const promise = new Promise<number>((_resolve, reject) => {
        rejectLate = reject;
      });

      await expect(withTimeout(promise, 5, "race-loser")).rejects.toBeInstanceOf(TimeoutError);

      // Now reject the original promise — without the internal silent observer
      // this would bubble up as an unhandled rejection.
      rejectLate(new Error("late failure"));

      // Flush microtasks / nextTick where unhandledRejection would fire.
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
});
