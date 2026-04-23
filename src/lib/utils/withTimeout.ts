/**
 * Typed error raised when a promise wrapped with {@link withTimeout} does not
 * settle before the budget elapses. Surfaces a descriptive label so callers can
 * differentiate between timeouts from distinct critical-path sites.
 */
export class TimeoutError extends Error {
  public readonly label: string;
  public readonly timeoutMs: number;

  constructor(label: string, timeoutMs: number) {
    super(`Operation "${label}" timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
    this.label = label;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Races a promise against a timer. If the timer elapses first, rejects with a
 * {@link TimeoutError} carrying the supplied label. The original promise keeps
 * running (there is no built-in way to cancel an arbitrary promise); if the
 * underlying work supports an AbortSignal, callers should pass their own
 * controller and abort it in addition to racing here.
 *
 * @param promise The promise to race against the timer.
 * @param timeoutMs Timeout budget in milliseconds. Non-finite values disable the timer.
 * @param label Human-readable identifier used in the error message.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  // If the timer wins the race, the original `promise` keeps running and may
  // reject later (e.g. a failed OPFS read). Attach a silent observer so that
  // late rejection does not surface as an unhandled promise rejection. The
  // main `await Promise.race` below still propagates a rejection on the
  // normal path because promises can have multiple handlers.
  promise.catch(() => {});

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(label, timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
