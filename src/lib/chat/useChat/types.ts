import type {
  LlmapiMessage,
  LlmapiResponseReasoning,
  LlmapiResponseResponse,
  LlmapiResponseUsage,
  LlmapiThinkingOptions,
  LlmapiTool,
  LlmapiToolCall,
} from "../../../client";

/**
 * Streaming chunk structure received from SSE events (Responses API format)
 */
export type StreamingChunk = {
  id?: string;
  model?: string;
  type?: string;
  delta?: string | { OfString?: string; OfResponseReasoningSummaryDeltaEventDelta?: string };
  usage?: LlmapiResponseUsage;
  // For response.created and response.completed events
  response?: {
    id?: string;
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };
  // For thinking/reasoning content
  content_index?: number;
  output_index?: number;
  // For tool calls
  item?: {
    id?: string;
    type?: string;
    name?: string;
    arguments?: string;
    call_id?: string;
    status?: string;
  };
  item_id?: string;
  call_id?: string;
  arguments?: string;
};

/**
 * Tool executor function type
 */
export type ToolExecutor = (args: Record<string, unknown>) => Promise<unknown> | unknown;

/**
 * Tool configuration with optional executor
 */
export type ToolConfig = LlmapiTool & {
  /**
   * Function to execute when the tool is called.
   * If provided, the tool will be executed automatically when the LLM calls it.
   * If not provided, an onToolCall event will be emitted instead.
   */
  executor?: ToolExecutor;
  /**
   * Whether to execute this tool automatically when called by the LLM.
   * Default: true if executor is provided, false otherwise.
   */
  autoExecute?: boolean;
};

/**
 * Responses API options that can be passed to sendMessage
 */
export type ResponsesApiOptions = {
  /**
   * Whether to store the response server-side.
   * When true, the response can be retrieved later using the response ID.
   */
  store?: boolean;
  /**
   * ID of a previous response to continue from.
   * Enables multi-turn conversations without resending full history.
   */
  previousResponseId?: string;
  /**
   * Conversation ID for grouping related responses.
   */
  conversation?: string;
  /**
   * Controls randomness in the response (0.0 to 2.0).
   * Lower values make output more deterministic.
   */
  temperature?: number;
  /**
   * Maximum number of tokens to generate in the response.
   */
  maxOutputTokens?: number;
  /**
   * Array of tool definitions available to the model.
   * Can include executor functions for automatic tool execution.
   */
  tools?: Array<LlmapiTool | ToolConfig>;
  /**
   * Controls which tool to use: "auto", "any", "none", "required", or a specific tool name.
   */
  toolChoice?: string;
  /**
   * Reasoning configuration for o-series and other reasoning models.
   * Controls reasoning effort and summary output.
   */
  reasoning?: LlmapiResponseReasoning;
  /**
   * Extended thinking configuration for Anthropic models (Claude).
   * Enables the model to think through complex problems step by step.
   */
  thinking?: LlmapiThinkingOptions;
};

/**
 * Base arguments for sending a message
 */
export type BaseSendMessageArgs = ResponsesApiOptions & {
  messages: LlmapiMessage[];
  model?: string;
  /**
   * Per-request callback for data chunks. Called in addition to the global
   * `onData` callback if provided in `useChat` options.
   *
   * @param chunk - The content delta from the current chunk
   */
  onData?: (chunk: string) => void;
};

/**
 * Base result type for sendMessage
 */
export type BaseSendMessageResult =
  | {
      data: LlmapiResponseResponse;
      error: null;
    }
  | { data: null; error: string };

/**
 * Base options for useChat hook
 * @inline
 */
export type BaseUseChatOptions = {
  getToken?: () => Promise<string | null>;
  baseUrl?: string;
  /**
   * Callback function to be called when a new data chunk is received.
   */
  onData?: (chunk: string) => void;
  /**
   * Callback function to be called when thinking/reasoning content is received.
   * This is called with delta chunks as the model "thinks" through a problem.
   */
  onThinking?: (chunk: string) => void;
  /**
   * Callback function to be called when the chat completion finishes successfully.
   */
  onFinish?: (response: LlmapiResponseResponse) => void;
  /**
   * Callback function to be called when an unexpected error is encountered.
   *
   * **Note:** This callback is NOT called for aborted requests (via `stop()` or
   * component unmount). Aborts are intentional actions and are not considered
   * errors. To detect aborts, check the `error` field in the `sendMessage` result:
   * `result.error === "Request aborted"`.
   *
   * @param error - The error that occurred (never an AbortError)
   */
  onError?: (error: Error) => void;
  /**
   * Callback function to be called when a tool call is requested by the LLM.
   * This is called for tools that don't have an executor or have autoExecute=false.
   * The app should execute the tool and send the result back.
   *
   * @param toolCall - The tool call requested by the LLM
   */
  onToolCall?: (toolCall: LlmapiToolCall) => void;
};

/**
 * Base result type for useChat hook
 */
export type BaseUseChatResult = {
  isLoading: boolean;
  /**
   * Aborts the current streaming request if one is in progress.
   *
   * When a request is aborted, `sendMessage` will return with
   * `{ data: null, error: "Request aborted" }`. The `onError` callback
   * will NOT be called, as aborts are intentional actions, not errors.
   */
  stop: () => void;
};

/**
 * Tool call being accumulated during streaming
 */
export type AccumulatedToolCall = {
  id: string;
  type: string;
  name: string;
  arguments: string;
  status: "pending" | "completed" | "error";
  result?: unknown;
  error?: string;
};

/**
 * Accumulated stream state during SSE processing
 */
export type StreamAccumulator = {
  content: string;
  thinking: string;
  responseId: string;
  responseModel: string;
  usage: Partial<LlmapiResponseUsage>;
  toolCalls: Map<string, AccumulatedToolCall>;
  /** Track incomplete reasoning tags across chunks */
  partialReasoningTag?: string;
  /** Track whether we're currently inside a reasoning block */
  insideReasoning?: boolean;
  /**
   * Track if this model uses implicit reasoning start (no opening tag).
   * Some models like Qwen start reasoning immediately without <think> tag
   * and only use </think> to mark the end.
   * - undefined: not yet determined
   * - true: model uses implicit reasoning (assume inside reasoning until </think>)
   * - false: model uses explicit tags or no reasoning
   */
  implicitReasoningStart?: boolean;
};
