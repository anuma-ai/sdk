# Telemetry contract (`@anuma/sdk/telemetry`)

`createMetricsHooks(sink, opts)` turns tool-loop lifecycle hooks into events and metrics on a `TelemetrySink`.

## Guarantees

- Every started run emits exactly one terminal event: `run.completed` or `run.failed`.
- No message contents or tool arguments are emitted.
- The raw error message is reported only when `includeErrorMessages` is set; `errorType` is always reported where the source event carries one.
- A tool seen only at `beforeToolUse` (server-side tools routed via `onToolCall`) gets no completion event; its pending timer is dropped when the run ends.
- An `afterToolUse` without a matching `beforeToolUse` is still reported, without `durationMs`.
- Per-run state is keyed by `runId` and cleared on the terminal hook, so concurrent runs and long-lived instances do not leak.
- Hooks are synchronous and never throw; sink errors, including rejected promises from async sinks, are swallowed.

## Events

All events carry `runId`.

| Event | Payload |
|---|---|
| `run.started` | `{ runId, model }` |
| `run.completed` | `{ runId, totalSteps, durationMs }` |
| `run.failed` | `{ runId, durationMs, errorType, stage }` |
| `model.call.completed` | `{ runId, stepIndex, latencyMs, model?, inputTokens?, outputTokens?, finishReason? }` |
| `model.call.failed` | `{ runId, stepIndex, latencyMs, model? }` |
| `tool.call.completed` | `{ runId, stepIndex, toolCallId, toolName, durationMs }` |
| `tool.call.failed` | `{ runId, stepIndex, toolCallId, toolName, durationMs, errorType }` |

## Metrics

| Metric | Unit | Tags |
|---|---|---|
| `run.duration` | ms | `model?`, `outcome` |
| `model.call.latency` | ms | `model?`, `outcome` |
| `model.call.tokens` | count | `direction` (`input` or `output`); only when usage is present |
| `tool.call.duration` | ms | `toolName`, `outcome`, `errorType?` |
