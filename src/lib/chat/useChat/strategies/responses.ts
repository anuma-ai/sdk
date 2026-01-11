import type { LlmapiResponseResponse } from "../../../../client";
import type { StreamAccumulator, StreamingChunk } from "../types";
import type { ProcessChunkResult } from "../utils";
import type { ApiStrategy, BuildRequestBodyArgs } from "./types";

/**
 * Strategy for the OpenAI Responses API (/api/v1/responses)
 *
 * Supports full feature set including:
 * - Extended thinking (Anthropic Claude)
 * - Reasoning (OpenAI o-series)
 * - Server-side conversation tracking
 * - Tool calls with streaming arguments
 */
export class ResponsesStrategy implements ApiStrategy {
  readonly endpoint = "/api/v1/responses";

  buildRequestBody(args: BuildRequestBodyArgs): Record<string, unknown> {
    const {
      messages,
      model,
      stream,
      temperature,
      maxOutputTokens,
      tools,
      toolChoice,
      store,
      previousResponseId,
      conversation,
      reasoning,
      thinking,
    } = args;

    return {
      input: messages,
      model,
      stream,
      ...(store !== undefined && { store }),
      ...(previousResponseId && { previous_response_id: previousResponseId }),
      ...(conversation && { conversation }),
      ...(temperature !== undefined && { temperature }),
      ...(maxOutputTokens !== undefined && { max_output_tokens: maxOutputTokens }),
      ...(tools && { tools }),
      ...(toolChoice && { tool_choice: toolChoice }),
      ...(reasoning && { reasoning }),
      ...(thinking && { thinking }),
    };
  }

  processStreamChunk(
    chunk: unknown,
    accumulator: StreamAccumulator
  ): ProcessChunkResult {
    const result: ProcessChunkResult = { content: null, thinking: null };
    const typedChunk = chunk as StreamingChunk;

    // Handle response.created event - extract ID and model from response object
    if (typedChunk.type === "response.created" && typedChunk.response) {
      if (typedChunk.response.id && !accumulator.responseId) {
        accumulator.responseId = typedChunk.response.id;
      }
      if (typedChunk.response.model && !accumulator.responseModel) {
        accumulator.responseModel = typedChunk.response.model;
      }
      return result;
    }

    // Handle response.completed event - extract usage and mark tool calls as completed
    if (typedChunk.type === "response.completed") {
      if (typedChunk.response?.usage) {
        accumulator.usage = {
          ...accumulator.usage,
          prompt_tokens: typedChunk.response.usage.input_tokens,
          completion_tokens: typedChunk.response.usage.output_tokens,
          total_tokens:
            (typedChunk.response.usage.input_tokens || 0) +
            (typedChunk.response.usage.output_tokens || 0),
        };
      }

      // Mark all pending tool calls as completed
      for (const toolCall of accumulator.toolCalls.values()) {
        if (toolCall.status === "pending") {
          toolCall.status = "completed";
        }
      }

      return result;
    }

    // Legacy: Extract response ID and model from top-level fields
    if (typedChunk.id && !accumulator.responseId) {
      accumulator.responseId = typedChunk.id;
    }
    if (typedChunk.model && !accumulator.responseModel) {
      accumulator.responseModel = typedChunk.model;
    }

    // Accumulate usage data - merge instead of replace
    if (typedChunk.usage) {
      accumulator.usage = {
        ...accumulator.usage,
        ...typedChunk.usage,
      };
    }

    // Handle thinking/reasoning content deltas
    if (
      typedChunk.type === "response.reasoning.delta" ||
      typedChunk.type === "response.reasoning_summary_text.delta" ||
      typedChunk.type === "response.thinking.delta"
    ) {
      const delta = typedChunk.delta;
      if (delta) {
        const deltaText =
          typeof delta === "string"
            ? delta
            : delta.OfString || delta.OfResponseReasoningSummaryDeltaEventDelta;
        if (deltaText) {
          accumulator.thinking += deltaText;
          result.thinking = deltaText;
        }
      }
      return result;
    }

    // Extract content delta from responses API format
    if (typedChunk.type === "response.output_text.delta") {
      const delta = typedChunk.delta;
      if (delta) {
        const deltaText = typeof delta === "string" ? delta : delta.OfString;
        // Only emit non-empty content to avoid false error detection
        if (deltaText && deltaText.trim().length > 0) {
          accumulator.content += deltaText;
          result.content = deltaText;
        }
      }
    }

    // Handle tool call events
    if (typedChunk.type === "response.output_item.added" && typedChunk.item) {
      if (typedChunk.item.type === "function_call") {
        const itemId = typedChunk.item.id || "";
        const callId = typedChunk.item.call_id || "";

        if (itemId && typedChunk.item.name) {
          accumulator.toolCalls.set(itemId, {
            id: callId || itemId,
            type: "function",
            name: typedChunk.item.name,
            arguments: typedChunk.item.arguments || "",
            status: "pending",
          });
        }
      }
    }

    // Event: response.function_call_arguments.delta - streaming arguments
    if (typedChunk.type === "response.function_call_arguments.delta") {
      const itemId = typedChunk.item_id || typedChunk.call_id || "";
      if (itemId && typedChunk.arguments) {
        const existing = accumulator.toolCalls.get(itemId);
        if (existing) {
          existing.arguments += typedChunk.arguments;
        }
      }
    }

    // Event: response.function_call_arguments.done - arguments complete
    if (typedChunk.type === "response.function_call_arguments.done") {
      const itemId = typedChunk.item_id || typedChunk.call_id || "";
      if (itemId && typedChunk.arguments) {
        const existing = accumulator.toolCalls.get(itemId);
        if (existing) {
          existing.arguments = typedChunk.arguments;
        }
      }
    }

    return result;
  }

  buildFinalResponse(accumulator: StreamAccumulator): LlmapiResponseResponse {
    const output: LlmapiResponseResponse["output"] = [];

    // Add thinking/reasoning output if present
    if (accumulator.thinking) {
      output.push({
        type: "reasoning",
        role: "assistant",
        content: [{ type: "output_text", text: accumulator.thinking }],
        status: "completed",
      });
    }

    // Add tool calls if present
    if (accumulator.toolCalls.size > 0) {
      for (const toolCall of accumulator.toolCalls.values()) {
        output.push({
          type: "function_call",
          call_id: toolCall.id,
          name: toolCall.name,
          arguments: toolCall.arguments,
          status: toolCall.status,
        });
      }
    }

    // Add the main message output
    output.push({
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: accumulator.content }],
      status: "completed",
    });

    return {
      id: accumulator.responseId,
      model: accumulator.responseModel,
      object: "response",
      output,
      usage:
        Object.keys(accumulator.usage).length > 0
          ? accumulator.usage
          : undefined,
    };
  }
}
