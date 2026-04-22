/**
 * Idle-keepalive wrapper for SSE streams produced by the generated
 * SSE client in `src/client/core/serverSentEvents.gen.ts`.
 *
 * The generated SSE client does not enforce an idle timeout, so if the
 * upstream server dies without sending `FIN`, a consumer can sit forever
 * on a half-open socket. This wrapper:
 *
 *   - Tracks the timestamp of the last event yielded by the source.
 *   - Starts an idle timer (default 60s, configurable via `idleMs`).
 *   - Resets the timer on every event.
 *   - Invokes `onIdle()` if the timer fires, and then closes the stream
 *     by throwing a typed {@link SseIdleTimeoutError} out of the iterator.
 *
 * This file lives outside `src/client/` on purpose: `@hey-api/openapi-ts`
 * wipes its output directory on every regeneration, so anything inside
 * `src/client/` would be clobbered by `pnpm run generate`.
 */

/**
 * Options accepted by {@link withSseKeepalive}.
 */
export interface SseKeepaliveOptions {
  /**
   * Idle window, in milliseconds. If no event is yielded by the source for
   * this long, the stream is considered dead and is torn down.
   *
   * Set to `0` or a negative number to disable the idle timer (in which
   * case the wrapper is a straight passthrough).
   *
   * @default 60000
   */
  idleMs?: number;
  /**
   * Invoked when the idle timer fires. The callback runs before the
   * wrapper closes the stream, so consumers can log, emit metrics, or
   * attempt reconnects from here.
   *
   * The callback is best-effort — thrown errors are swallowed so they do
   * not mask the {@link SseIdleTimeoutError} that follows.
   */
  onIdle?: (info: { idleMs: number; lastEventAt: number }) => void;
}

/**
 * Thrown by {@link withSseKeepalive} when no event arrives within the
 * configured idle window. Callers can `instanceof`-check this to
 * distinguish idle timeouts from other stream errors.
 */
export class SseIdleTimeoutError extends Error {
  readonly idleMs: number;
  readonly lastEventAt: number;
  constructor(idleMs: number, lastEventAt: number) {
    super(
      `SSE stream idle for ${idleMs}ms (no event since ${new Date(lastEventAt).toISOString()})`
    );
    this.name = "SseIdleTimeoutError";
    this.idleMs = idleMs;
    this.lastEventAt = lastEventAt;
  }
}

const DEFAULT_IDLE_MS = 60_000;

/**
 * Wrap an SSE-style async iterable with an idle timeout. If no value is
 * yielded by `source` within `idleMs`, `onIdle` fires and the wrapper
 * throws {@link SseIdleTimeoutError}, which propagates to the consumer's
 * `for await` loop and, via the iterator protocol, calls `source.return()`
 * so the underlying fetch/reader is cancelled.
 *
 * Typical usage with the generated SSE client:
 *
 * ```ts
 * import { createSseClient } from "@anuma/sdk/client/core/serverSentEvents.gen";
 * import { withSseKeepalive } from "@anuma/sdk";
 *
 * const { stream } = createSseClient({ url });
 * for await (const event of withSseKeepalive(stream, {
 *   idleMs: 60_000,
 *   onIdle: ({ idleMs }) => logger.warn(`SSE idle for ${idleMs}ms`),
 * })) {
 *   // ...
 * }
 * ```
 *
 * The wrapper is a pure passthrough when `idleMs <= 0`.
 */
export async function* withSseKeepalive<T>(
  source: AsyncIterable<T>,
  options: SseKeepaliveOptions = {}
): AsyncGenerator<T, void, unknown> {
  const idleMs = options.idleMs ?? DEFAULT_IDLE_MS;
  const iterator = source[Symbol.asyncIterator]();

  // Fast path: passthrough. Still delegate to the underlying iterator so
  // `return()` semantics on early break are preserved.
  if (!Number.isFinite(idleMs) || idleMs <= 0) {
    try {
      while (true) {
        const next = await iterator.next();
        if (next.done) return;
        yield next.value;
      }
    } finally {
      await iterator.return?.();
    }
    return;
  }

  let lastEventAt = Date.now();

  try {
    while (true) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const idlePromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          try {
            options.onIdle?.({ idleMs, lastEventAt });
          } catch {
            // onIdle is best-effort; don't mask the timeout error below.
          }
          reject(new SseIdleTimeoutError(idleMs, lastEventAt));
        }, idleMs);
        // Node's setTimeout returns a Timeout object with `unref`; in the
        // browser it's a number. Keep the timer from holding the event loop
        // open when running on Node.
        const t = timer as unknown as { unref?: () => void };
        t?.unref?.();
      });

      let next: IteratorResult<T>;
      try {
        next = await Promise.race([iterator.next(), idlePromise]);
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
      if (next.done) return;
      lastEventAt = Date.now();
      yield next.value;
    }
  } finally {
    // Ensure the underlying reader is cancelled on timeout, break, or error.
    await iterator.return?.();
  }
}
