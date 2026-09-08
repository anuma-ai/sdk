/**
 * Telemetry sink contract for the observability adapter.
 *
 * The SDK never talks to a vendor directly — it emits structured events and
 * metrics through this interface, and the app adapts it to PostHog, Datadog,
 * OpenTelemetry, etc. Both methods are optional so a sink that only cares
 * about events (or only about metrics) can implement half the surface.
 *
 * Implementations must be fast and must not throw: hooks are awaited
 * synchronously inside the tool loop (see `runHooks.ts`), so a slow or
 * throwing sink serializes into run latency or — worse — surfaces as a run
 * error. Queue network exports asynchronously inside your sink.
 *
 * @example
 * ```ts
 * import { createMetricsHooks, type TelemetrySink } from "@anuma/sdk/telemetry";
 *
 * // posthog-js: capture(event, properties)
 * const sink: TelemetrySink = {
 *   track: (event, properties) => posthog.capture(event, properties),
 *   metric: (name, value, tags) => statsd.histogram(name, value, tags),
 * };
 *
 * // posthog-node takes ONE object, so the arguments do not line up:
 * // track: (event, properties) => posthog.capture({ distinctId, event, properties })
 *
 * const hooks = createMetricsHooks(sink);
 * // pass `hooks` wherever RunHooks are accepted, or compose with your own:
 * // composeHooks([hooks, myTracingHooks])
 * ```
 */
export interface TelemetrySink {
  /**
   * Record a discrete event (run started, tool failed, recall degraded…).
   * `properties` are flat, JSON-serializable, and free of message contents —
   * only identifiers, counts, and timings.
   */
  track?: (event: string, properties: Record<string, unknown>) => void;
  /**
   * Record a numeric measurement (latency, duration, token count). `tags`
   * are low-cardinality string dimensions (model, toolName, outcome, lane).
   */
  metric?: (name: string, value: number, tags: Record<string, string>) => void;
}

/**
 * Default sink that discards everything. Useful as a fallback when telemetry
 * is configured off, and as the base for sinks that override one method.
 *
 * Frozen. It is a published singleton, and `createMetricsHooks` closes over the
 * object rather than its methods, so one module assigning `noopTelemetrySink.track`
 * would reroute every already-constructed adapter that shares the reference — a
 * test stub that forgets to restore changes behaviour for the rest of the suite.
 * Freezing now rather than later: adding it later is the breaking direction,
 * because it turns a silent assignment into a strict-mode TypeError.
 */
export const noopTelemetrySink: TelemetrySink = Object.freeze({
  track: () => {},
  metric: () => {},
});
