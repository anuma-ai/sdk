/**
 * {@link RunHooks} adapter that turns tool-loop lifecycle hooks into
 * telemetry events and metrics on a {@link TelemetrySink}.
 *
 * Events emitted (all with `runId`; no message contents or tool arguments):
 *
 * - `run.started` — `{ runId, model }`
 * - `run.completed` — `{ runId, totalSteps, durationMs }`
 * - `run.failed` — `{ runId, durationMs, errorType, error, stage }`
 * - `model.call.completed` — `{ runId, stepIndex, latencyMs, model?, inputTokens?, outputTokens?, finishReason? }`
 * - `model.call.failed` — `{ runId, stepIndex, latencyMs, model?, error }`
 * - `tool.call.completed` — `{ runId, stepIndex, toolCallId, toolName, durationMs }`
 * - `tool.call.failed` — `{ runId, stepIndex, toolCallId, toolName, durationMs, errorType, error }`
 *
 * Metrics emitted:
 *
 * - `run.duration` (ms, tags: model?, outcome)
 * - `model.call.latency` (ms, tags: model?, outcome)
 * - `model.call.tokens` (count, tags: direction: input|output) when usage is present
 * - `tool.call.duration` (ms, tags: toolName, outcome, errorType?)
 *
 * Pairing notes (mirrors the contract documented in `runHooks.ts`):
 *
 * - `onRunEnd` / `onRunError` are mutually exclusive and fire exactly once per
 *   run, so every started run resolves to exactly one terminal event.
 * - Server-side tools routed via `onToolCall` get `beforeToolUse` with no
 *   `afterToolUse`. The adapter therefore never emits a completion for a tool
 *   it saw only start; the pending timer is dropped when the run terminates.
 * - `afterToolUse` without a matching `beforeToolUse` (defensive — not a
 *   documented case) is still reported, with `durationMs` omitted.
 * - Per-run state is keyed by `runId` and cleared on the terminal hook, so
 *   concurrent runs and long-lived adapter instances do not leak timers.
 */

import type {
  ModelCallEndEvent,
  ModelCallStartEvent,
  RunEndEvent,
  RunErrorEvent,
  RunHooks,
  RunStartEvent,
  ToolUseEndEvent,
  ToolUseStartEvent,
} from "../chat/runHooks";
import type { TelemetrySink } from "./types";

export interface MetricsHooksOptions {
  /**
   * Clock used for all durations, in milliseconds. Defaults to `Date.now`.
   * Inject a fake in tests (or `performance.now` where sub-ms precision
   * matters).
   */
  now?: () => number;
}

/** Internal per-run state. Not exported; one instance per adapter. */
interface RunState {
  model?: string;
  startedAt: number;
  /** stepIndex -> start time for in-flight model calls. */
  modelCalls: Map<number, { startedAt: number; model?: string }>;
  /** toolCallId -> start time for in-flight tool calls. */
  toolCalls: Map<string, { startedAt: number; toolName: string }>;
}

/**
 * Build {@link RunHooks} that report run lifecycle, model calls, and tool
 * calls to `sink`. The returned hooks are synchronous and never throw — a
 * throwing sink method is swallowed with a console-free `noop` (the tool loop
 * already swallows hook errors; we avoid double-logging here).
 */
export function createMetricsHooks(sink: TelemetrySink, opts?: MetricsHooksOptions): RunHooks {
  const now = opts?.now ?? (() => Date.now());
  const runs = new Map<string, RunState>();

  // Sink methods are typed `void`, but an async implementation still type
  // checks — and its rejected Promise would escape the try/catch below as an
  // unhandled rejection. Detect a thenable return and swallow it too.
  const swallow = (call: () => void): void => {
    try {
      const result: unknown = call();
      if (result && typeof (result as PromiseLike<unknown>).then === "function") {
        void Promise.resolve(result).catch(() => {});
      }
    } catch {
      // Telemetry must never break the loop.
    }
  };
  const track = (event: string, properties: Record<string, unknown>): void => {
    swallow(() => sink.track?.(event, properties));
  };
  const metric = (name: string, value: number, tags: Record<string, string>): void => {
    swallow(() => sink.metric?.(name, value, tags));
  };

  const stateFor = (runId: string): RunState => {
    let state = runs.get(runId);
    if (!state) {
      state = { startedAt: now(), modelCalls: new Map(), toolCalls: new Map() };
      runs.set(runId, state);
    }
    return state;
  };

  const finishRun = (runId: string): void => {
    // Drops dangling model/tool timers — server-side tools that saw
    // beforeToolUse but never afterToolUse, by contract, and any half-finished
    // state on abort.
    runs.delete(runId);
  };

  return {
    onRunStart: (e: RunStartEvent) => {
      const state = stateFor(e.runId);
      state.model = e.model;
      state.startedAt = now();
      track("run.started", { runId: e.runId, model: e.model });
    },

    onRunEnd: (e: RunEndEvent) => {
      const state = stateFor(e.runId);
      const durationMs = now() - state.startedAt;
      track("run.completed", {
        runId: e.runId,
        totalSteps: e.totalSteps,
        durationMs,
      });
      metric("run.duration", durationMs, {
        ...(state.model ? { model: state.model } : {}),
        outcome: "completed",
      });
      finishRun(e.runId);
    },

    onRunError: (e: RunErrorEvent) => {
      const state = stateFor(e.runId);
      const durationMs = now() - state.startedAt;
      const errorType = e.errorObject?.name ?? "Error";
      track("run.failed", {
        runId: e.runId,
        durationMs,
        errorType,
        error: e.error,
        stage: e.stage,
      });
      metric("run.duration", durationMs, {
        ...(state.model ? { model: state.model } : {}),
        outcome: "failed",
      });
      finishRun(e.runId);
    },

    beforeModelCall: (e: ModelCallStartEvent) => {
      const state = stateFor(e.runId);
      state.modelCalls.set(e.stepIndex, { startedAt: now(), model: e.model });
    },

    afterModelCall: (e: ModelCallEndEvent) => {
      const state = stateFor(e.runId);
      const pending = state.modelCalls.get(e.stepIndex);
      state.modelCalls.delete(e.stepIndex);
      const latencyMs = pending ? now() - pending.startedAt : undefined;
      const base = {
        runId: e.runId,
        stepIndex: e.stepIndex,
        ...(latencyMs !== undefined ? { latencyMs } : {}),
        ...(pending?.model ? { model: pending.model } : {}),
      };
      if (e.error !== undefined) {
        track("model.call.failed", { ...base, error: e.error });
        if (latencyMs !== undefined) {
          metric("model.call.latency", latencyMs, {
            ...(pending?.model ? { model: pending.model } : {}),
            outcome: "failed",
          });
        }
        return;
      }
      track("model.call.completed", {
        ...base,
        ...(e.usage?.inputTokens !== undefined ? { inputTokens: e.usage.inputTokens } : {}),
        ...(e.usage?.outputTokens !== undefined ? { outputTokens: e.usage.outputTokens } : {}),
        ...(e.finishReason !== undefined ? { finishReason: e.finishReason } : {}),
      });
      if (latencyMs !== undefined) {
        metric("model.call.latency", latencyMs, {
          ...(pending?.model ? { model: pending.model } : {}),
          outcome: "completed",
        });
      }
      if (e.usage?.inputTokens !== undefined) {
        metric("model.call.tokens", e.usage.inputTokens, {
          ...(pending?.model ? { model: pending.model } : {}),
          direction: "input",
        });
      }
      if (e.usage?.outputTokens !== undefined) {
        metric("model.call.tokens", e.usage.outputTokens, {
          ...(pending?.model ? { model: pending.model } : {}),
          direction: "output",
        });
      }
    },

    beforeToolUse: (e: ToolUseStartEvent) => {
      const state = stateFor(e.runId);
      state.toolCalls.set(e.toolCallId, { startedAt: now(), toolName: e.name });
    },

    afterToolUse: (e: ToolUseEndEvent) => {
      const state = stateFor(e.runId);
      const pending = state.toolCalls.get(e.toolCallId);
      state.toolCalls.delete(e.toolCallId);
      const durationMs = pending ? now() - pending.startedAt : undefined;
      const base = {
        runId: e.runId,
        stepIndex: e.stepIndex,
        toolCallId: e.toolCallId,
        toolName: e.name,
        ...(durationMs !== undefined ? { durationMs } : {}),
      };
      if (e.error !== undefined || e.errorType !== undefined) {
        track("tool.call.failed", {
          ...base,
          ...(e.error !== undefined ? { error: e.error } : {}),
          ...(e.errorType !== undefined ? { errorType: e.errorType } : {}),
        });
        if (durationMs !== undefined) {
          metric("tool.call.duration", durationMs, {
            toolName: e.name,
            outcome: "failed",
            ...(e.errorType !== undefined ? { errorType: e.errorType } : {}),
          });
        }
        return;
      }
      track("tool.call.completed", base);
      if (durationMs !== undefined) {
        metric("tool.call.duration", durationMs, {
          toolName: e.name,
          outcome: "completed",
        });
      }
    },
  };
}
