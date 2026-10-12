import type {
  ModelCallEndEvent,
  ModelCallStartEvent,
  RunEndEvent,
  RunErrorEvent,
  RunHooks,
  RunStartEvent,
  ToolUseEndEvent,
  ToolUseStartEvent,
} from "../lib/chat/runHooks";
import type { TelemetrySink } from "./types";

export interface MetricsHooksOptions {
  /**
   * Override the clock used for every duration this adapter reports.
   *
   * The default is monotonic where the runtime has `performance.now()`
   * (browser / RN / Node), falling back to `Date.now()`. That is about
   * monotonicity, not precision: `Date.now()` steps BACKWARD on an NTP
   * correction, a VM resume from snapshot, or a container host clock sync, and
   * a step landing mid-run makes `now() - startedAt` negative. dogstatsd
   * accepts a negative histogram sample, so it is ingested and corrupts the
   * min/p50/p95 for that bucket — silently wrong data, which is the one thing
   * this module exists to prevent.
   *
   * Supply your own only to make durations deterministic in a test.
   */
  now?: () => number;
  /**
   * Report the raw `error` message string on `run.failed`,
   * `model.call.failed`, and `tool.call.failed`. Default `false`.
   *
   * Off by default because those strings are free text and routinely quote
   * the input that caused the failure. `JSON.parse` echoes the offending tool
   * arguments verbatim (`Unexpected token 'h', "hunter2pass"... is not valid
   * JSON`), `executeToolCall` wraps whatever a host executor threw, and an
   * executor with `deAnonymizeArgs` runs on de-redacted PII. Sending them to
   * a sink contradicts {@link TelemetrySink}, which states that properties
   * carry only identifiers, counts, and timings.
   *
   * Turn it on when the sink is infrastructure you own and you accept the
   * exposure. Prefer `errorType`, which is always reported and always safe.
   */
  includeErrorMessages?: boolean;
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

const defaultNowMs = (): number =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

/**
 * Build {@link RunHooks} that report run lifecycle, model calls, and tool calls to `sink`; every run ends in exactly one `run.completed` or `run.failed`, and no message contents or tool arguments are emitted.
 *
 * @see TELEMETRY.md for event payloads and metric names.
 */
export function createMetricsHooks(sink: TelemetrySink, opts?: MetricsHooksOptions): RunHooks {
  const now = opts?.now ?? defaultNowMs;
  const includeErrorMessages = opts?.includeErrorMessages ?? false;
  const runs = new Map<string, RunState>();

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
  const errorProps = (error: string | undefined): { error?: string } =>
    includeErrorMessages && error !== undefined ? { error } : {};

  const stateFor = (runId: string): RunState => {
    let state = runs.get(runId);
    if (!state) {
      state = { startedAt: now(), modelCalls: new Map(), toolCalls: new Map() };
      runs.set(runId, state);
    }
    return state;
  };

  const finishRun = (runId: string): void => {
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
        ...errorProps(e.error),
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
      const state = runs.get(e.runId);
      const pending = state?.modelCalls.get(e.stepIndex);
      state?.modelCalls.delete(e.stepIndex);
      const latencyMs = pending ? now() - pending.startedAt : undefined;
      const base = {
        runId: e.runId,
        stepIndex: e.stepIndex,
        ...(latencyMs !== undefined ? { latencyMs } : {}),
        ...(pending?.model ? { model: pending.model } : {}),
      };
      if (e.error !== undefined) {
        track("model.call.failed", { ...base, ...errorProps(e.error) });
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
      const state = runs.get(e.runId);
      const pending = state?.toolCalls.get(e.toolCallId);
      state?.toolCalls.delete(e.toolCallId);
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
          ...errorProps(e.error),
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
