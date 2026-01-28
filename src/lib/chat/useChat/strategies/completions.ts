import type { LlmapiResponseResponse } from "../../../../client";
import type { StreamAccumulator } from "../types";
import type { ProcessChunkResult } from "../utils";
import { parseReasoningTags } from "../utils";
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
    // Some APIs use "messages" instead of "message" for tool calls
    messages?: {
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

    // Handle wrapped response format: { response: {...}, type: "response" }
    // Some endpoints return the completions response nested under a "response" key
    const rawChunk = chunk as { response?: CompletionsStreamingChunk; type?: string };
    const typedChunk = (rawChunk.response && rawChunk.type === "response")
      ? rawChunk.response
      : (chunk as CompletionsStreamingChunk);

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
          // Parse reasoning tags from content
          const parseResult = parseReasoningTags(
            choice.delta.content,
            accumulator.partialReasoningTag || "",
            accumulator.insideReasoning || false,
            undefined,
            accumulator.implicitReasoningStart
          );

          // Update accumulator with parsed content
          accumulator.content += parseResult.messageContent;
          accumulator.thinking += parseResult.reasoningContent;
          accumulator.partialReasoningTag = parseResult.partialTag;
          accumulator.insideReasoning = parseResult.insideReasoning;
          if (parseResult.implicitReasoningStart !== undefined) {
            accumulator.implicitReasoningStart =
              parseResult.implicitReasoningStart;
          }

          // Emit deltas
          // Only emit non-empty content to avoid false error detection
          const willEmitMessage =
            parseResult.messageContent &&
            parseResult.messageContent.trim().length > 0;
          const willEmitReasoning =
            parseResult.reasoningContent &&
            parseResult.reasoningContent.trim().length > 0;

          if (willEmitMessage) {
            result.content = parseResult.messageContent;
          }
          if (willEmitReasoning) {
            result.thinking = parseResult.reasoningContent;
          }
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

      // Handle tool calls from alternate "messages" format (some APIs use this instead of "message")
      if (choice.messages?.tool_calls && choice.messages.tool_calls.length > 0) {
        for (let i = 0; i < choice.messages.tool_calls.length; i++) {
          const toolCall = choice.messages.tool_calls[i];
          const toolKey = `tool_${i}`;
          accumulator.toolCalls.set(toolKey, {
            id: toolCall.id || `tool_${i}`,
            type: toolCall.type || "function",
            name: toolCall.function?.name || "",
            arguments: toolCall.function?.arguments || "",
            status: "completed",
          });
        }

        // For implicit reasoning models (like Qwen), tool calls trigger a new
        // reasoning phase. Only re-enable reasoning mode if this model was
        // already detected as using implicit reasoning (no opening <think> tag).
        if (accumulator.implicitReasoningStart === true) {
          accumulator.insideReasoning = true;
        }
      }

      // Handle non-streaming message format (final response)
      if (choice.message) {
        if (choice.message.content) {
          // For final message with full content, if this is an implicit reasoning model,
          // we should parse from the beginning assuming we're inside reasoning.
          // This is because:
          // 1. The final message contains the COMPLETE response (not a delta)
          // 2. Streaming deltas may have already modified accumulator.insideReasoning
          // 3. For implicit reasoning models, the full content starts with thinking
          const shouldStartInsideReasoning =
            accumulator.implicitReasoningStart === true;

          // Parse reasoning tags from final message content
          const parseResult = parseReasoningTags(
            choice.message.content,
            "", // Reset partial tag since this is the full message
            shouldStartInsideReasoning,
            undefined,
            accumulator.implicitReasoningStart
          );

          // Check if we already accumulated content through streaming deltas
          // If so, don't emit again (the final message is a duplicate of streamed content)
          const alreadyHasContent = accumulator.content.length > 0;

          accumulator.content = parseResult.messageContent;
          accumulator.thinking += parseResult.reasoningContent;
          accumulator.partialReasoningTag = parseResult.partialTag;
          accumulator.insideReasoning = parseResult.insideReasoning;
          if (parseResult.implicitReasoningStart !== undefined) {
            accumulator.implicitReasoningStart =
              parseResult.implicitReasoningStart;
          }

          // Only emit content if we haven't already streamed it
          // This prevents duplicate content when the server sends both streaming deltas
          // and a final message with the complete content
          if (!alreadyHasContent) {
            // For non-streaming, we always emit the final content (reasoning is already separated)
            // Only emit non-empty content to avoid false error detection
            if (
              parseResult.messageContent &&
              parseResult.messageContent.trim().length > 0
            ) {
              result.content = parseResult.messageContent;
            }
            if (
              parseResult.reasoningContent &&
              parseResult.reasoningContent.trim().length > 0
            ) {
              result.thinking = parseResult.reasoningContent;
            }
          }
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
      if (
        choice.finish_reason === "tool_calls" ||
        choice.finish_reason === "stop"
      ) {
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

    // Final cleanup: handle any remaining partial tag
    let finalContent = accumulator.content;
    let finalThinking = accumulator.thinking;

    if (accumulator.partialReasoningTag) {
      // Final cleanup: if we have a partial tag, try to parse it one more time
      const finalParse = parseReasoningTags(
        "",
        accumulator.partialReasoningTag,
        accumulator.insideReasoning || false,
        undefined,
        accumulator.implicitReasoningStart
      );
      finalContent += finalParse.messageContent;
      if (finalParse.reasoningContent) {
        finalThinking += finalParse.reasoningContent;
      }
      // Handle any remaining partial tag content that couldn't be parsed
      // (e.g., stream ended with incomplete tag like "<" or "<thi")
      if (finalParse.partialTag) {
        if (finalParse.insideReasoning) {
          // If we're inside reasoning, the partial belongs to thinking
          finalThinking += finalParse.partialTag;
        } else {
          // Otherwise, it's regular content
          finalContent += finalParse.partialTag;
        }
      }
    }

    // Add thinking/reasoning output if present
    if (finalThinking) {
      output.push({
        type: "reasoning",
        role: "assistant",
        content: [{ type: "output_text", text: finalThinking }],
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
      content: [{ type: "output_text", text: finalContent }],
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
