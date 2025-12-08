import type {
  LlmapiChatCompletionResponse,
  LlmapiMessage,
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
 * Creates an initial stream accumulator
 */
export function createStreamAccumulator(): StreamAccumulator {
  return {
    content: "",
    completionId: "",
    completionModel: "",
    usage: {},
    finishReason: undefined,
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
  // Extract completion ID and model from first chunk
  if (chunk.id && !accumulator.completionId) {
    accumulator.completionId = chunk.id;
  }
  if (chunk.model && !accumulator.completionModel) {
    accumulator.completionModel = chunk.model;
  }

  // Accumulate usage data - merge instead of replace
  // This ensures we capture both token counts and cost_micro_usd
  if (chunk.usage) {
    accumulator.usage = {
      ...accumulator.usage,
      ...chunk.usage,
    };
  }

  // Extract content delta
  if (chunk.choices?.[0]) {
    const choice = chunk.choices[0];
    if (choice.delta?.content) {
      accumulator.content += choice.delta.content;
      return choice.delta.content;
    }
    if (choice.finish_reason) {
      accumulator.finishReason = choice.finish_reason;
    }
  }

  return null;
}

/**
 * Builds the final chat completion response from accumulated stream data
 */
export function buildCompletionResponse(
  accumulator: StreamAccumulator
): LlmapiChatCompletionResponse {
  return {
    id: accumulator.completionId,
    model: accumulator.completionModel,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: [{ type: "text", text: accumulator.content }],
        },
        finish_reason: accumulator.finishReason,
      },
    ],
    usage:
      Object.keys(accumulator.usage).length > 0
        ? (accumulator.usage as LlmapiChatCompletionResponse["usage"])
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
