import type {
  LlmapiMessage,
  LlmapiMessageContentPart,
  LlmapiResponseResponse,
} from "../../../client";
import type { StreamAccumulator, StreamingChunk } from "./types";

/**
 * Validation error types
 */
export type ValidationError =
  | "messages_required"
  | "model_required"
  | "token_getter_required"
  | "token_unavailable";

/**
 * Validation result
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; error: ValidationError; message: string };

/**
 * Error messages for validation errors
 */
export const VALIDATION_ERROR_MESSAGES: Record<ValidationError, string> = {
  messages_required: "messages are required to call sendMessage.",
  model_required: "model is required to call sendMessage.",
  token_getter_required: "Token getter function is required.",
  token_unavailable: "No access token available.",
};

/**
 * Validates that messages are provided
 */
export function validateMessages(
  messages: LlmapiMessage[] | undefined
): ValidationResult {
  if (!messages?.length) {
    return {
      valid: false,
      error: "messages_required",
      message: VALIDATION_ERROR_MESSAGES.messages_required,
    };
  }
  return { valid: true };
}

/**
 * Validates that model is provided
 */
export function validateModel(model: string | undefined): ValidationResult {
  if (!model) {
    return {
      valid: false,
      error: "model_required",
      message: VALIDATION_ERROR_MESSAGES.model_required,
    };
  }
  return { valid: true };
}

/**
 * Validates that token getter is provided
 */
export function validateTokenGetter(
  getToken: (() => Promise<string | null>) | undefined
): ValidationResult {
  if (!getToken) {
    return {
      valid: false,
      error: "token_getter_required",
      message: VALIDATION_ERROR_MESSAGES.token_getter_required,
    };
  }
  return { valid: true };
}

/**
 * Validates that token is available
 */
export function validateToken(token: string | null): ValidationResult {
  if (!token) {
    return {
      valid: false,
      error: "token_unavailable",
      message: VALIDATION_ERROR_MESSAGES.token_unavailable,
    };
  }
  return { valid: true };
}

/**
 * Extracts text from a message content part
 */
function extractTextFromContentPart(part: LlmapiMessageContentPart): string {
  if (part.type === "text" && part.text) {
    return part.text;
  }
  return "";
}

/**
 * Converts a messages array to a string input for the responses API.
 * Format: Each message is prefixed with its role, messages are separated by newlines.
 */
export function messagesToInput(messages: LlmapiMessage[]): string {
  return messages
    .map((msg) => {
      const role = msg.role || "user";
      const content = Array.isArray(msg.content)
        ? msg.content.map(extractTextFromContentPart).filter(Boolean).join("\n")
        : String(msg.content || "");
      return `${role}: ${content}`;
    })
    .join("\n\n");
}

/**
 * Creates an initial stream accumulator
 */
export function createStreamAccumulator(): StreamAccumulator {
  return {
    content: "",
    responseId: "",
    responseModel: "",
    usage: {},
  };
}

/**
 * Processes a streaming chunk and updates the accumulator
 * Returns the content delta if present
 */
export function processStreamingChunk(
  chunk: StreamingChunk,
  accumulator: StreamAccumulator
): string | null {
  // Handle response.created event - extract ID and model from response object
  if (chunk.type === "response.created" && chunk.response) {
    if (chunk.response.id && !accumulator.responseId) {
      accumulator.responseId = chunk.response.id;
    }
    if (chunk.response.model && !accumulator.responseModel) {
      accumulator.responseModel = chunk.response.model;
    }
    return null;
  }

  // Handle response.completed event - extract usage from response object
  if (chunk.type === "response.completed" && chunk.response?.usage) {
    accumulator.usage = {
      ...accumulator.usage,
      prompt_tokens: chunk.response.usage.input_tokens,
      completion_tokens: chunk.response.usage.output_tokens,
      total_tokens:
        (chunk.response.usage.input_tokens || 0) +
        (chunk.response.usage.output_tokens || 0),
    };
    return null;
  }

  // Legacy: Extract response ID and model from top-level fields
  if (chunk.id && !accumulator.responseId) {
    accumulator.responseId = chunk.id;
  }
  if (chunk.model && !accumulator.responseModel) {
    accumulator.responseModel = chunk.model;
  }

  // Accumulate usage data - merge instead of replace
  // This ensures we capture both token counts and cost_micro_usd
  if (chunk.usage) {
    accumulator.usage = {
      ...accumulator.usage,
      ...chunk.usage,
    };
  }

  // Extract content delta from responses API format
  if (chunk.type === "response.output_text.delta") {
    const delta = chunk.delta;
    if (delta) {
      accumulator.content += delta;
      return delta;
    }
  }

  return null;
}

/**
 * Builds the final response from accumulated stream data
 */
export function buildResponseResponse(
  accumulator: StreamAccumulator
): LlmapiResponseResponse {
  return {
    id: accumulator.responseId,
    model: accumulator.responseModel,
    object: "response",
    output: [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: accumulator.content }],
        status: "completed",
      },
    ],
    usage:
      Object.keys(accumulator.usage).length > 0
        ? accumulator.usage
        : undefined,
  };
}

/**
 * Creates a validation error result
 */
export function createErrorResult<T extends { data: null; error: string }>(
  message: string,
  onError?: (error: Error) => void
): T {
  if (onError) {
    onError(new Error(message));
  }
  return { data: null, error: message } as T;
}

/**
 * Handles an error and returns an error result
 */
export function handleError<T extends { data: null; error: string }>(
  err: unknown,
  onError?: (error: Error) => void
): T {
  const errorMsg =
    err instanceof Error ? err.message : "Failed to send message.";
  const errorObj = err instanceof Error ? err : new Error(errorMsg);

  if (onError) {
    onError(errorObj);
  }
  return { data: null, error: errorMsg } as T;
}

/**
 * Checks if the error is an abort error
 */
export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

/**
 * Checks if an SSE chunk is a DONE marker
 */
export function isDoneMarker(chunk: unknown): boolean {
  if (typeof chunk === "string") {
    const trimmed = chunk.trim();
    return trimmed === "[DONE]" || trimmed.includes("[DONE]");
  }
  return false;
}

/**
 * Parses an SSE data line and returns the chunk if valid
 */
export function parseSSEDataLine(line: string): StreamingChunk | null {
  if (!line.startsWith("data: ")) {
    return null;
  }

  const data = line.substring(6).trim();
  if (data === "[DONE]") {
    return null;
  }

  try {
    return JSON.parse(data) as StreamingChunk;
  } catch {
    return null;
  }
}
