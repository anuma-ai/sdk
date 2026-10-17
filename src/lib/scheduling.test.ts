import { afterEach, describe, expect, it, vi } from "vitest";

import { createTimeSliceYielder, yieldToEventLoop } from "./scheduling";

describe("yieldToEventLoop", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("prefers scheduler.yield when the runtime has it", async () => {
    const schedulerYield = vi.fn(() => Promise.resolve());
    vi.stubGlobal("scheduler", { yield: schedulerYield });
    const timeout = vi.spyOn(globalThis, "setTimeout");

    await yieldToEventLoop();

    expect(schedulerYield).toHaveBeenCalledTimes(1);
    expect(timeout).not.toHaveBeenCalled();
  });

  it("posts through a MessageChannel instead of a throttled timer when there is no scheduler", async () => {
    vi.stubGlobal("scheduler", undefined);
    const timeout = vi.spyOn(globalThis, "setTimeout");

    await yieldToEventLoop();

    expect(timeout).not.toHaveBeenCalled();
  });

  it("falls back to a timer when neither scheduler nor MessageChannel exists", async () => {
    vi.stubGlobal("scheduler", undefined);
    vi.stubGlobal("MessageChannel", undefined);
    const timeout = vi.spyOn(globalThis, "setTimeout");

    await yieldToEventLoop();

    expect(timeout).toHaveBeenCalledTimes(1);
  });
});

describe("createTimeSliceYielder", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("yields only once the slice budget is spent", async () => {
    const schedulerYield = vi.fn(() => Promise.resolve());
    vi.stubGlobal("scheduler", { yield: schedulerYield });
    let clock = 0;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    const yieldIfDue = createTimeSliceYielder(12);

    clock = 5;
    await yieldIfDue();
    expect(schedulerYield).not.toHaveBeenCalled();

    clock = 13;
    await yieldIfDue();
    expect(schedulerYield).toHaveBeenCalledTimes(1);

    clock = 20;
    await yieldIfDue();
    expect(schedulerYield).toHaveBeenCalledTimes(1);
  });
});
