/**
 * Lifecycle hooks for runToolLoop. All hooks are optional and fire-and-forget —
 * observer errors are swallowed so a buggy hook can't crash the loop. Hook
 * names match the Claude Agent SDK shape (camelCase).
 */

export type LlmTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

export type ModelCallStartEvent = {
  runId: string;
  stepIndex: number;
  model: string;
  messages: Array<unknown>;
  tools: Array<unknown>;
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
  messages: Array<unknown>;
  tools: Array<unknown>;
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
  stage: "model" | "tool" | "unknown";
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
