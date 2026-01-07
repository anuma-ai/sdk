import type { LlmapiResponseResponse } from "../../../../client";
import type { StreamAccumulator } from "../types";
import type { ProcessChunkResult } from "../utils";
import type { ApiStrategy, BuildRequestBodyArgs } from "./types";

/**
 * Streaming chunk format for Chat Completions API (OpenAI-compatible)
 */
type CompletionsStreamingChunk = {
  id?: string;
  object?: string;
  model?: string;
  choices?: Array<{
    index: number;
    delta?: {
      content?: string;
      role?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    message?: {
      content?: string;
      role?: string;
      tool_calls?: Array<{
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost_micro_usd?: number;
  };
};

/**
 * Strategy for the OpenAI Chat Completions API (/api/v1/chat/completions)
 *
 * Provides wider model compatibility but does not support:
 * - Extended thinking (Anthropic Claude)
 * - Reasoning configuration (OpenAI o-series)
 * - Server-side conversation tracking
 *
 * These options are silently ignored when using this strategy.
 */
export class CompletionsStrategy implements ApiStrategy {
  readonly endpoint = "/api/v1/chat/completions";

  buildRequestBody(args: BuildRequestBodyArgs): Record<string, unknown> {
    const {
      messages,
      model,
      stream,
      temperature,
      maxOutputTokens,
      tools,
      toolChoice,
      // These are intentionally ignored for completions API:
      // store, previousResponseId, conversation, reasoning, thinking
    } = args;

    return {
      messages,
      model,
      stream,
      ...(temperature !== undefined && { temperature }),
      ...(maxOutputTokens !== undefined && { max_tokens: maxOutputTokens }),
      ...(tools && { tools }),
      ...(toolChoice && { tool_choice: toolChoice }),
    };
  }

  processStreamChunk(
    chunk: unknown,
    accumulator: StreamAccumulator
  ): ProcessChunkResult {
    const result: ProcessChunkResult = { content: null, thinking: null };
    const typedChunk = chunk as CompletionsStreamingChunk;

    // Extract response ID and model
    if (typedChunk.id && !accumulator.responseId) {
      accumulator.responseId = typedChunk.id;
    }
    if (typedChunk.model && !accumulator.responseModel) {
      accumulator.responseModel = typedChunk.model;
    }

    // Accumulate usage data
    if (typedChunk.usage) {
      accumulator.usage = {
        ...accumulator.usage,
        prompt_tokens: typedChunk.usage.prompt_tokens,
        completion_tokens: typedChunk.usage.completion_tokens,
        total_tokens: typedChunk.usage.total_tokens,
        cost_micro_usd: typedChunk.usage.cost_micro_usd,
      };
    }

    // Process choices array
    if (typedChunk.choices && typedChunk.choices.length > 0) {
      const choice = typedChunk.choices[0];

      // Handle streaming delta format
      if (choice.delta) {
        // Content delta
        if (choice.delta.content) {
          accumulator.content += choice.delta.content;
          result.content = choice.delta.content;
        }

        // Tool calls delta
        if (choice.delta.tool_calls) {
          for (const toolCallDelta of choice.delta.tool_calls) {
            const toolIndex = toolCallDelta.index;
            const toolKey = `tool_${toolIndex}`;

            // Get or create tool call entry
            let toolCall = accumulator.toolCalls.get(toolKey);

            if (toolCallDelta.id) {
              // New tool call starting
              toolCall = {
                id: toolCallDelta.id,
                type: toolCallDelta.type || "function",
                name: toolCallDelta.function?.name || "",
                arguments: toolCallDelta.function?.arguments || "",
                status: "pending",
              };
              accumulator.toolCalls.set(toolKey, toolCall);
            } else if (toolCall) {
              // Continuation of existing tool call
              if (toolCallDelta.function?.name) {
                toolCall.name += toolCallDelta.function.name;
              }
              if (toolCallDelta.function?.arguments) {
                toolCall.arguments += toolCallDelta.function.arguments;
              }
            }
          }
        }
      }

      // Handle non-streaming message format (final response)
      if (choice.message) {
        if (choice.message.content) {
          accumulator.content = choice.message.content;
          result.content = choice.message.content;
        }

        if (choice.message.tool_calls) {
          for (let i = 0; i < choice.message.tool_calls.length; i++) {
            const toolCall = choice.message.tool_calls[i];
            const toolKey = `tool_${i}`;
            accumulator.toolCalls.set(toolKey, {
              id: toolCall.id || `tool_${i}`,
              type: toolCall.type || "function",
              name: toolCall.function?.name || "",
              arguments: toolCall.function?.arguments || "",
              status: "completed",
            });
          }
        }
      }

      // Mark tool calls as completed when finish_reason is set
      if (choice.finish_reason === "tool_calls" || choice.finish_reason === "stop") {
        for (const toolCall of accumulator.toolCalls.values()) {
          if (toolCall.status === "pending") {
            toolCall.status = "completed";
          }
        }
      }
    }

    return result;
  }

  buildFinalResponse(accumulator: StreamAccumulator): LlmapiResponseResponse {
    const output: LlmapiResponseResponse["output"] = [];

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
