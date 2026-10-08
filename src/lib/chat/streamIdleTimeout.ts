import type { StreamingTransport } from "./toolLoop";

/**
 * Error thrown when a streaming attempt produces no activity within
 * `idleTimeoutMs`. The `onError` callback receives this instance; check
 * `name` (or `instanceof`) instead of string-matching the message.
 */
export class StreamIdleTimeoutError extends Error {
  readonly idleTimeoutMs: number;
  constructor(idleTimeoutMs: number) {
    super(`Stream timed out after ${idleTimeoutMs} ms without activity.`);
    this.name = "StreamIdleTimeoutError";
    this.idleTimeoutMs = idleTimeoutMs;
  }
}

/** Apply an idle timeout to each stream attempt. */
export function withStreamIdleTimeout(
  transport: StreamingTransport,
  idleTimeoutMs: number
): StreamingTransport {
  if (!(idleTimeoutMs > 0) || idleTimeoutMs === Infinity) return transport;

  return (options) => ({
    stream: (async function* () {
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let settled = false;
      let completed = false;
      let iterator: AsyncIterator<unknown> | undefined;
      let interruption: Error | undefined;
      let rejectPending: ((error: Error) => void) | undefined;
      const disarm = () => {
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
      };
      const interrupt = (error: Error) => {
        if (interruption) return;
        interruption = error;
        // Reject first. Some transports end normally when the signal aborts.
        rejectPending?.(error);
        controller.abort();
      };
      const arm = () => {
        if (settled || controller.signal.aborted) return;
        disarm();
        timer = setTimeout(() => {
          interrupt(new StreamIdleTimeoutError(idleTimeoutMs));
        }, idleTimeoutMs);
      };
      const onAbort = () => {
        // The transport reports caller aborts. A late abort can follow a normal stream end.
        controller.abort();
      };

      options.signal?.addEventListener("abort", onAbort, { once: true });
      try {
        if (options.signal?.aborted) {
          const error = new Error("Request aborted");
          error.name = "AbortError";
          throw error;
        }
        arm();
        iterator = transport({
          ...options,
          signal: controller.signal,
          onActivity: () => {
            arm();
            options.onActivity?.();
          },
        }).stream[Symbol.asyncIterator]();

        while (true) {
          if (interruption) throw interruption;
          // Use one reject callback per read. A shared race promise retains one handler per chunk.
          const next = await new Promise<IteratorResult<unknown>>((resolve, reject) => {
            rejectPending = reject;
            Promise.resolve(iterator!.next()).then(resolve, reject);
          });
          rejectPending = undefined;
          if (next.done) {
            completed = true;
            break;
          }
          arm();
          yield next.value;
        }
      } finally {
        settled = true;
        rejectPending = undefined;
        disarm();
        options.signal?.removeEventListener("abort", onAbort);
        if (!completed) {
          controller.abort();
          // A stalled iterator can also stall return(). Do not wait for it.
          try {
            void iterator?.return?.().catch(() => {});
          } catch {
            // Preserve the stream error if return() throws.
          }
        }
      }
    })(),
  });
}
