/**
 * Lifecycle hooks for runToolLoop. All hooks are optional and observer
 * errors are swallowed (sync throws and async rejections both) so a buggy
 * hook can't crash the loop. Hook names match the Claude Agent SDK shape
 * (camelCase).
 *
 * Hooks are awaited synchronously at each fire site, so slow hooks
 * serialize into loop latency — keep them fast and do any heavy work
 * (network exports, file IO) asynchronously inside your own queue.
 */

import type { LlmapiChatCompletionTool, LlmapiMessage } from "../../client";

export type LlmTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

export type ModelCallStartEvent = {
  runId: string;
  stepIndex: number;
  model: string;
  messages: Array<LlmapiMessage>;
  tools: Array<LlmapiChatCompletionTool>;
  requestBody: Record<string, unknown>;
};

export type ModelCallEndEvent = {
  runId: string;
  stepIndex: number;
  content: string;
  toolCalls: Array<{ id: string; name: string; arguments: string }>;
  usage?: LlmTokenUsage;
  finishReason?: string;
  error?: string;
};

export type ToolUseStartEvent = {
  runId: string;
  stepIndex: number;
  toolCallId: string;
  name: string;
  rawArguments: string;
  parsedArguments?: Record<string, unknown>;
};

export type ToolUseEndEvent = {
  runId: string;
  stepIndex: number;
  toolCallId: string;
  name: string;
  result?: unknown;
  error?: string;
  errorType?: "parse" | "timeout" | "execution";
};

export type RunStartEvent = {
  runId: string;
  model: string;
  messages: Array<LlmapiMessage>;
  tools: Array<LlmapiChatCompletionTool>;
};

export type RunEndEvent = {
  runId: string;
  finalContent: string;
  /** Number of LLM rounds executed. */
  totalSteps: number;
};

export type RunErrorEvent = {
  runId: string;
  error: string;
  /**
   * Only `"model"` today. Tool failures surface on {@link RunHooks.afterToolUse}
   * with `errorType`, not on `onRunError`, so a tool stage isn't needed yet.
   * Left as a union to leave room for `"validation"` or `"tool"` later
   * without a breaking change.
   */
  stage: "model";
  /**
   * The underlying `Error` when one is available. `RunErrorEvent` predates
   * this field, so `error` (a string message) is kept for backwards
   * compatibility; new consumers should prefer `errorObject` when present
   * for stack traces and `cause`.
   */
  errorObject?: Error;
};

export type RunHooks = {
  /**
   * Fires once per `runToolLoop` invocation, before any pre-processor or
   * model call. The `messages` payload is the raw caller-supplied
   * conversation — pre-processors that enrich it (e.g. web search context)
   * run afterwards, so `beforeModelCall.messages` reflects the
   * post-enrichment state.
   */
  onRunStart?: (e: RunStartEvent) => Promise<void> | void;
  /**
   * Fires exactly once per run on clean completion. Mutually exclusive
   * with `onRunError` — a run that completes fires `onRunEnd`; a run that
   * errors or is aborted fires `onRunError`. Consumers can rely on
   * exactly one terminal hook per `onRunStart`.
   */
  onRunEnd?: (e: RunEndEvent) => Promise<void> | void;
  /**
   * Fires exactly once per run when the loop errors or is aborted.
   * `stage` is `"model"` for stream/provider errors and for aborts;
   * tool execution failures surface as structured `{ error, errorType }`
   * results on `afterToolUse` rather than firing `onRunError`.
   * Mutually exclusive with `onRunEnd`.
   */
  onRunError?: (e: RunErrorEvent) => Promise<void> | void;
  beforeModelCall?: (e: ModelCallStartEvent) => Promise<void> | void;
  afterModelCall?: (e: ModelCallEndEvent) => Promise<void> | void;
  /**
   * Fires before each tool the model invoked — including server-side
   * tools that have no client executor. Today this is observe-only.
   * TODO(follow-up PR): allow returning { args?, abort?: { reason } } to
   * mutate arguments or short-circuit the tool call.
   *
   * Pairing with {@link afterToolUse} is asymmetric: server-side tools
   * routed via `onToolCall` get `beforeToolUse` but no `afterToolUse`,
   * because they don't execute in-process. Tools blocked by a failed
   * dependency or a dependency cycle DO get `afterToolUse` with
   * `errorType: "execution"` — consumers tallying matched pairs should
   * filter on executor-backed tools to avoid spurious imbalances.
   */
  beforeToolUse?: (e: ToolUseStartEvent) => Promise<void> | void;
  /**
   * Fires after each executor-backed tool finishes (success or failure)
   * and after each dependency-blocked tool is skipped (`errorType:
   * "execution"`). Does NOT fire for server-side tools routed via
   * `onToolCall`. See {@link beforeToolUse} for the pairing contract.
   */
  afterToolUse?: (e: ToolUseEndEvent) => Promise<void> | void;
};

/**
 * Combine multiple {@link RunHooks} listeners into a single object so
 * tracing + logging + metrics can all observe the same run. Each
 * registered handler is invoked once per event; one listener throwing
 * does not block the others.
 */
export function composeHooks(hooks: Array<RunHooks | undefined>): RunHooks {
  const handlers = hooks.filter((h): h is RunHooks => h !== undefined && h !== null);
  const fan =
    <E>(get: (h: RunHooks) => ((e: E) => Promise<void> | void) | undefined) =>
    async (e: E): Promise<void> => {
      await Promise.allSettled(handlers.map((h) => Promise.resolve().then(() => get(h)?.(e))));
    };
  return {
    onRunStart: fan<RunStartEvent>((h) => h.onRunStart),
    onRunEnd: fan<RunEndEvent>((h) => h.onRunEnd),
    onRunError: fan<RunErrorEvent>((h) => h.onRunError),
    beforeModelCall: fan<ModelCallStartEvent>((h) => h.beforeModelCall),
    afterModelCall: fan<ModelCallEndEvent>((h) => h.afterModelCall),
    beforeToolUse: fan<ToolUseStartEvent>((h) => h.beforeToolUse),
    afterToolUse: fan<ToolUseEndEvent>((h) => h.afterToolUse),
  };
}
