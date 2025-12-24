import type {
  LlmapiMessage,
  LlmapiResponseResponse,
  LlmapiResponseUsage,
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
};

/**
 * Base arguments for sending a message
 */
export type BaseSendMessageArgs = {
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
 */
export type BaseUseChatOptions = {
  getToken?: () => Promise<string | null>;
  baseUrl?: string;
  /**
   * Callback function to be called when a new data chunk is received.
   */
  onData?: (chunk: string) => void;
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
 * Accumulated stream state during SSE processing
 */
export type StreamAccumulator = {
  content: string;
  responseId: string;
  responseModel: string;
  usage: Partial<LlmapiResponseUsage>;
};
