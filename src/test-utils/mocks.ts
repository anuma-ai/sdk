/**
 * Typed mock factories for tests.
 *
 * Each factory returns a value typed against the real interface it mocks, so
 * interface drift surfaces at compile time rather than being silently swallowed
 * by `as any`. Prefer these over inline `as any` casts in new test code.
 *
 * Currently covers the `createSseClient` return shape used by `useChat`. As
 * additional test files are migrated off `as any` (see issue #456), more
 * factories will land here.
 */

import type { ServerSentEventsResult } from "../client/core/serverSentEvents.gen";

/**
 * Build a mocked `ServerSentEventsResult` wrapping a fixed list of events, or
 * a custom generator factory for tests that need to throw or delay mid-stream.
 *
 * Typed as `ServerSentEventsResult<TData>` so callers drop the `as any` that
 * used to paper over the strict `AsyncGenerator` element type. The one-time
 * cast inside this helper is the deliberate boundary between the typed test
 * surface and the structurally-compatible event payloads the tests feed in.
 */
export function makeMockSseResult<TData = unknown>(
  source: Iterable<unknown> | (() => AsyncGenerator<unknown, void, unknown>)
): ServerSentEventsResult<TData> {
  const stream =
    typeof source === "function"
      ? source()
      : // An async generator is required to satisfy the SSE result shape even
        // though the synchronous branch never awaits internally.
        // eslint-disable-next-line @typescript-eslint/require-await
        (async function* () {
          for (const chunk of source) {
            yield chunk;
          }
        })();

  return { stream } as unknown as ServerSentEventsResult<TData>;
}
