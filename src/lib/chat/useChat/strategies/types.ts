import type {
  LlmapiChatCompletionResponse,
  LlmapiChatCompletionTool,
  LlmapiMessage,
  LlmapiResponseReasoning,
  LlmapiResponseResponse,
  LlmapiThinkingOptions,
} from "../../../../client";
import type { StreamAccumulator } from "../types";
import type { ProcessChunkResult } from "../utils";

/**
 * API type selector for useChat
 * - "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
 * - "completions": OpenAI Chat Completions API (wider model compatibility)
 */
export type ApiType = "responses" | "completions";

/**
 * Tool call event from server-side tool execution
 */
export interface ToolCallEvent {
  id: string;
  name: string;
  arguments: string;
  output: string;
}

/**
 * Union type for API responses - raw pass-through from server.
 * Responses API returns LlmapiResponseResponse (with output[]).
 * Completions API returns LlmapiChatCompletionResponse (with choices[]).
 */
export type ApiResponse = LlmapiResponseResponse | LlmapiChatCompletionResponse;

/**
 * Arguments for building API request body
 */
export interface BuildRequestBodyArgs {
  messages: LlmapiMessage[];
  model: string;
  stream: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  tools?: LlmapiChatCompletionTool[];
  toolChoice?: string;
  // Responses-only options (ignored by completions strategy)
  reasoning?: LlmapiResponseReasoning;
  thinking?: LlmapiThinkingOptions;
}

/**
 * Strategy interface for different LLM API backends.
 * Implementations handle request building, stream parsing, and response normalization.
 */
export interface ApiStrategy {
  /**
   * The API endpoint path (e.g., "/api/v1/responses" or "/api/v1/chat/completions")
   */
  readonly endpoint: string;

  /**
   * Build the request body for the API call
   */
  buildRequestBody(args: BuildRequestBodyArgs): Record<string, unknown>;

  /**
   * Process a streaming chunk and update the accumulator
   * Returns content and thinking deltas if present
   */
  processStreamChunk(
    chunk: unknown,
    accumulator: StreamAccumulator
  ): ProcessChunkResult;

  /**
   * Build the final response from accumulated stream data.
   * Returns raw API format (Responses API or Completions API structure).
   */
  buildFinalResponse(accumulator: StreamAccumulator): ApiResponse;
}
