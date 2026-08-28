/**
 * Official observability adapter for the Anuma SDK.
 *
 * Turns the SDK's existing instrumentation seams — {@link RunHooks} from the
 * tool loop and `onDiagnostics` from recall — into vendor-neutral events and
 * metrics on a {@link TelemetrySink} the app supplies (PostHog, Datadog,
 * OpenTelemetry, …). Zero runtime dependencies; tree-shakeable subpath.
 *
 * Exposed as `@anuma/sdk/telemetry`.
 *
 * @example
 * ```ts
 * import { createMetricsHooks, createRecallDiagnosticsHandler } from "@anuma/sdk/telemetry";
 *
 * const sink = { track: posthog.capture.bind(posthog) };
 * const hooks = createMetricsHooks(sink);
 * const onDiagnostics = createRecallDiagnosticsHandler(sink);
 * ```
 */

export type { MetricsHooksOptions } from "./metrics";
export { createMetricsHooks } from "./metrics";
export { createRecallDiagnosticsHandler } from "./recall";
export type { TelemetrySink } from "./types";
export { noopTelemetrySink } from "./types";
