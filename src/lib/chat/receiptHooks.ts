/**
 * Universal receipt-shaped hooks for `runToolLoop`.
 *
 * These four callbacks fire on every LLM and tool boundary inside the loop,
 * carrying enough context for downstream observers (PromptSeal, tracing,
 * telemetry) to mint a per-event record. Hook names and shapes are
 * deliberately generic — not PromptSeal-specific.
 */
/** Token usage shape emitted by `LlmEndEvent`. */
export type LlmTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

/** Fired immediately before an LLM streaming request begins. */
export type LlmStartEvent = {
  /** Stable per-`runToolLoop` invocation id (UUID). */
  runId: string;
  /**
   * 0-based index of this LLM round inside the run. Round 0 is the initial
   * request; rounds 1..N are continuation requests after tool execution.
   */
  stepIndex: number;
  model: string;
  /** Messages array submitted to the model on this round. */
  messages: Array<unknown>;
  /** Tool definitions sent on this round (may be undefined or empty). */
  tools: Array<unknown>;
  /** Full request body the SDK is about to POST. Read-only — do not mutate. */
  requestBody: Record<string, unknown>;
};

/** Fired after an LLM stream finishes (successfully or with an error). */
export type LlmEndEvent = {
  runId: string;
  stepIndex: number;
  /** Aggregated text content the model produced. */
  content: string;
  /** Tool calls the model emitted during this round. */
  toolCalls: Array<{ id: string; name: string; arguments: string }>;
  usage?: LlmTokenUsage;
  /** Provider-supplied finish reason ("stop", "tool_calls", "length", etc.). */
  finishReason?: string;
  /** Set when the stream errored or aborted. */
  error?: string;
};

/** Fired immediately before a tool executor runs. */
export type ToolStartEvent = {
  runId: string;
  stepIndex: number;
  toolCallId: string;
  name: string;
  /** Raw arguments string from the model (may be malformed JSON). */
  rawArguments: string;
  /** Parsed arguments — present only when JSON parsing succeeded. */
  parsedArguments?: Record<string, unknown>;
};

/** Fired after a tool executor finishes (success, parse error, timeout, or exception). */
export type ToolEndEvent = {
  runId: string;
  stepIndex: number;
  toolCallId: string;
  name: string;
  result?: unknown;
  error?: string;
  errorType?: "parse" | "timeout" | "execution";
};

/** Bundle of the four receipt-shaped hooks. */
export type ReceiptHooks = {
  onLlmStart?: (event: LlmStartEvent) => Promise<void> | void;
  onLlmEnd?: (event: LlmEndEvent) => Promise<void> | void;
  onToolStart?: (event: ToolStartEvent) => Promise<void> | void;
  onToolEnd?: (event: ToolEndEvent) => Promise<void> | void;
};
