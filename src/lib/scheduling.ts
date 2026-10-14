type SchedulerWithYield = { yield?: () => Promise<void> };

export function nowMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export function yieldToEventLoop(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: SchedulerWithYield }).scheduler;
  if (typeof scheduler?.yield === "function") return scheduler.yield();
  if (typeof MessageChannel === "function") {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        channel.port2.close();
        resolve();
      };
      channel.port2.postMessage(null);
    });
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function createTimeSliceYielder(budgetMs: number): () => Promise<void> {
  let sliceStart = nowMs();
  return async () => {
    if (nowMs() - sliceStart < budgetMs) return;
    await yieldToEventLoop();
    sliceStart = nowMs();
  };
}
