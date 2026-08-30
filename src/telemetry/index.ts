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
 * The two adapters do NOT have the same reach, and the difference is not
 * obvious from the wiring. {@link createMetricsHooks} sees every run that
 * goes through the tool loop. {@link createRecallDiagnosticsHandler} sees
 * only the recalls the host starts itself — the in-run recall paths already
 * hold the single `onDiagnostics` slot. Read its doc before you draw a
 * conclusion from recall event volume.
 *
 * @example
 * ```ts
 * import { createMetricsHooks, createRecallDiagnosticsHandler } from "@anuma/sdk/telemetry";
 *
 * // posthog-js. posthog-node's capture takes a single object, so a bare `.bind`
 * // would hand it the event NAME as its payload and drop every event — and the
 * // adapter swallows sink errors, so the integration would fail silently.
 * // For posthog-node write:
 * //   { track: (event, properties) => posthog.capture({ distinctId, event, properties }) }
 * const sink = { track: posthog.capture.bind(posthog) };
 * const hooks = createMetricsHooks(sink);
 * // Host-initiated recall only. Recalls inside a tool-loop run never reach
 * // this handler — see createRecallDiagnosticsHandler for why.
 * const onDiagnostics = createRecallDiagnosticsHandler(sink);
 * ```
 */

export type { MetricsHooksOptions } from "./metrics";
export { createMetricsHooks } from "./metrics";
export { createRecallDiagnosticsHandler } from "./recall";
export type { TelemetrySink } from "./types";
export { noopTelemetrySink } from "./types";

// The return type of createMetricsHooks and the parameter type of the recall
// handler. Both otherwise live only on `@anuma/sdk/server`, a Node-only
// subpath — so naming either one from a browser or React Native app meant
// importing from an entry point it cannot use. Type-only, so this adds nothing
// to the runtime surface.
export type { RunHooks } from "../lib/chat/runHooks";
export type { RecallDiagnostics } from "../lib/memory/types";
