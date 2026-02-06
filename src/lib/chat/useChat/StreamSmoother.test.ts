import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StreamSmoother } from "./StreamSmoother";

describe("StreamSmoother", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("disabled mode (passthrough)", () => {
    it("calls callback immediately when enabled is false", () => {
      const callback = vi.fn();
      const smoother = new StreamSmoother(callback, { enabled: false });

      smoother.push("hello");
      expect(callback).toHaveBeenCalledWith("hello");
      expect(callback).toHaveBeenCalledTimes(1);

      smoother.push(" world");
      expect(callback).toHaveBeenCalledWith(" world");
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe("enabled mode (buffering)", () => {
    it("does not call callback immediately on push", () => {
      const callback = vi.fn();
      const smoother = new StreamSmoother(callback, { enabled: true });

      smoother.push("hello world this is a test string");
      // Should not have been called yet (only on next tick)
      expect(callback).not.toHaveBeenCalled();

      smoother.destroy();
    });

    it("releases text incrementally over time", () => {
      const received: string[] = [];
      const smoother = new StreamSmoother(
        (text) => received.push(text),
        { enabled: true, minSpeed: 100, maxSpeed: 100, rampDuration: 0 }
      );

      // Push 100 chars — at 100 chars/sec with 16ms ticks, each tick releases ~2 chars
      const text = "a".repeat(100);
      smoother.push(text);

      // Advance 16ms — first tick
      vi.advanceTimersByTime(16);
      expect(received.length).toBeGreaterThan(0);

      // Total received should be less than full text after first tick
      const totalAfterFirstTick = received.join("").length;
      expect(totalAfterFirstTick).toBeLessThan(100);
      expect(totalAfterFirstTick).toBeGreaterThan(0);

      // Advance enough time to release everything (1 second at 100 chars/sec)
      vi.advanceTimersByTime(2000);
      const totalReceived = received.join("").length;
      expect(totalReceived).toBe(100);

      smoother.destroy();
    });

    it("handles multiple rapid pushes", () => {
      const received: string[] = [];
      const smoother = new StreamSmoother(
        (text) => received.push(text),
        { enabled: true, minSpeed: 50, maxSpeed: 200, rampDuration: 1000 }
      );

      smoother.push("Hello ");
      smoother.push("world ");
      smoother.push("this is ");
      smoother.push("a test!");

      // All should be buffered together
      vi.advanceTimersByTime(5000);
      const total = received.join("");
      expect(total).toBe("Hello world this is a test!");

      smoother.destroy();
    });
  });

  describe("flush", () => {
    it("releases all remaining buffer immediately", () => {
      const received: string[] = [];
      const smoother = new StreamSmoother(
        (text) => received.push(text),
        { enabled: true, minSpeed: 10, maxSpeed: 10, rampDuration: 0 }
      );

      const text = "a".repeat(1000);
      smoother.push(text);

      // Only advance one tick — very little should have been released
      vi.advanceTimersByTime(16);
      const beforeFlush = received.join("").length;
      expect(beforeFlush).toBeLessThan(1000);

      // Flush should release everything
      smoother.flush();
      const afterFlush = received.join("").length;
      expect(afterFlush).toBe(1000);
    });

    it("does nothing if buffer is empty", () => {
      const callback = vi.fn();
      const smoother = new StreamSmoother(callback, { enabled: true });

      smoother.flush();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("destroy", () => {
    it("stops all further callbacks", () => {
      const callback = vi.fn();
      const smoother = new StreamSmoother(callback, {
        enabled: true,
        minSpeed: 10,
        maxSpeed: 10,
        rampDuration: 0,
      });

      smoother.push("a".repeat(1000));
      smoother.destroy();

      // Advancing time should not produce any callbacks
      vi.advanceTimersByTime(5000);
      expect(callback).not.toHaveBeenCalled();
    });

    it("ignores push after destroy", () => {
      const callback = vi.fn();
      const smoother = new StreamSmoother(callback, { enabled: true });

      smoother.destroy();
      smoother.push("hello");
      vi.advanceTimersByTime(1000);

      expect(callback).not.toHaveBeenCalled();
    });

    it("ignores flush after destroy", () => {
      const callback = vi.fn();
      const smoother = new StreamSmoother(callback, { enabled: true });

      smoother.push("hello");
      smoother.destroy();
      smoother.flush();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("adaptive ramp", () => {
    it("releases more characters per tick as time progresses", () => {
      const earlyChunks: string[] = [];
      const lateChunks: string[] = [];

      // Early smoother — measure output in first 100ms
      const earlySmoother = new StreamSmoother(
        (text) => earlyChunks.push(text),
        { enabled: true, minSpeed: 10, maxSpeed: 1000, rampDuration: 2000 }
      );

      earlySmoother.push("a".repeat(10000));
      // Collect first 100ms of output
      vi.advanceTimersByTime(100);
      const earlyTotal = earlyChunks.join("").length;
      earlySmoother.destroy();

      // Late smoother — skip to 2s into ramp, then measure 100ms
      const lateSmoother = new StreamSmoother(
        (text) => lateChunks.push(text),
        { enabled: true, minSpeed: 10, maxSpeed: 1000, rampDuration: 2000 }
      );

      lateSmoother.push("a".repeat(10000));
      // Skip past ramp period
      vi.advanceTimersByTime(2000);
      lateChunks.length = 0; // Reset
      // Now measure 100ms at max speed
      vi.advanceTimersByTime(100);
      const lateTotal = lateChunks.join("").length;
      lateSmoother.destroy();

      // At max speed (1000 chars/sec), 100ms should produce ~100 chars
      // At min speed (10 chars/sec), 100ms should produce ~1 char
      expect(lateTotal).toBeGreaterThan(earlyTotal);
    });
  });

  describe("empty push", () => {
    it("ignores empty string", () => {
      const callback = vi.fn();
      const smoother = new StreamSmoother(callback, { enabled: true });

      smoother.push("");
      vi.advanceTimersByTime(1000);
      expect(callback).not.toHaveBeenCalled();

      smoother.destroy();
    });
  });

  describe("slow model passthrough", () => {
    it("adds minimal latency for slow streams", () => {
      const received: string[] = [];
      const smoother = new StreamSmoother(
        (text) => received.push(text),
        { enabled: true, minSpeed: 30, maxSpeed: 200, rampDuration: 1500 }
      );

      // Simulate slow model: push 1 char, wait 100ms, push 1 char, etc.
      smoother.push("H");
      vi.advanceTimersByTime(16); // First tick
      expect(received.join("")).toBe("H"); // Should release immediately (1 char in buffer, released on first tick)

      vi.advanceTimersByTime(100);
      smoother.push("e");
      vi.advanceTimersByTime(16);
      expect(received.join("")).toBe("He");

      smoother.destroy();
    });
  });
});

describe("constructor config handling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enables smoothing by default (undefined)", () => {
    const callback = vi.fn();
    const smoother = new StreamSmoother(callback);

    smoother.push("hello");
    // Should not call immediately when enabled
    expect(callback).not.toHaveBeenCalled();

    smoother.destroy();
  });

  it("enables smoothing for true", () => {
    const callback = vi.fn();
    const smoother = new StreamSmoother(callback, true);

    smoother.push("hello");
    expect(callback).not.toHaveBeenCalled();

    smoother.destroy();
  });

  it("disables smoothing for false", () => {
    const callback = vi.fn();
    const smoother = new StreamSmoother(callback, false);

    smoother.push("hello");
    expect(callback).toHaveBeenCalledWith("hello");
  });

  it("accepts config object", () => {
    const received: string[] = [];
    const smoother = new StreamSmoother(
      (text) => received.push(text),
      { enabled: true, minSpeed: 100, maxSpeed: 100, rampDuration: 0 }
    );

    smoother.push("a".repeat(100));
    vi.advanceTimersByTime(2000);
    expect(received.join("").length).toBe(100);

    smoother.destroy();
  });
});
