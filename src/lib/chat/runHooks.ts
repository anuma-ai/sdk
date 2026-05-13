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
  onRunStart?: (e: RunStartEvent) => Promise<void> | void;
  onRunEnd?: (e: RunEndEvent) => Promise<void> | void;
  onRunError?: (e: RunErrorEvent) => Promise<void> | void;
  beforeModelCall?: (e: ModelCallStartEvent) => Promise<void> | void;
  afterModelCall?: (e: ModelCallEndEvent) => Promise<void> | void;
  /**
   * Fires before each tool executor runs. Today this is observe-only.
   * TODO(follow-up PR): allow returning { args?, abort?: { reason } } to
   * mutate arguments or short-circuit the tool call.
   */
  beforeToolUse?: (e: ToolUseStartEvent) => Promise<void> | void;
  afterToolUse?: (e: ToolUseEndEvent) => Promise<void> | void;
};
