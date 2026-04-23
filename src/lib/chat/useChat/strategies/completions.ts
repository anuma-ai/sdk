import type { LlmapiChatCompletionResponse } from "../../../../client";
import type { StreamAccumulator } from "../types";
import type { ProcessChunkResult } from "../utils";
import { getInStreamErrorMessage, parseReasoningTags } from "../utils";
import type { ApiStrategy, BuildRequestBodyArgs } from "./types";
import { mergeXaiInlineParameterTags } from "./xaiToolFormat";

/**
 * Tool call event from server-side MCP tool execution
 */
type ToolCallEventChunk = {
  id?: string;
  type?: string;
  name?: string;
  arguments?: string;
  output?: string;
};

/**
 * Streaming chunk format for Chat Completions API (OpenAI-compatible)
 */
type CompletionsStreamingChunk = {
  id?: string;
  object?: string;
  model?: string;
  /** Checksum of tools used to generate this response */
  tools_checksum?: string;
  /** Tool call events from server-side MCP tool execution */
  tool_call_events?: Array<ToolCallEventChunk>;
  /** Wrapped response format (some endpoints nest the response) */
  response?: {
    tools_checksum?: string;
    tool_call_events?: Array<ToolCallEventChunk>;
  };
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
    credits_used?: number;
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
      imageModel,
      conversationId,
    } = args;

    return {
      messages,
      model,
      stream,
      ...(temperature !== undefined && { temperature }),
      ...(maxOutputTokens !== undefined && { max_tokens: maxOutputTokens }),
      ...(tools && { tools }),
      ...(toolChoice && { tool_choice: toolChoice }),
      ...(imageModel && { image_model: imageModel }),
      ...(conversationId && { conversation_id: conversationId }),
    };
  }

  processStreamChunk(chunk: unknown, accumulator: StreamAccumulator): ProcessChunkResult {
    const result: ProcessChunkResult = { content: null, thinking: null };

    // Detect in-stream error events from Bifrost (e.g. MiniMax upstream
    // timeouts). If we don't throw here the stream just ends silently with no
    // tool call and no usable response. The outer tool loop catches this and
    // surfaces it as the final error to the caller.
    const inStreamErr = getInStreamErrorMessage(chunk);
    if (inStreamErr) throw new Error(inStreamErr);

    // Handle wrapped response format: { response: {...}, type: "response" }
    // Some endpoints return the completions response nested under a "response" key
    const rawChunk = chunk as { response?: CompletionsStreamingChunk; type?: string };
    const typedChunk =
      rawChunk.response && rawChunk.type === "response"
        ? rawChunk.response
        : (chunk as CompletionsStreamingChunk);

    // Extract response ID and model
    if (typedChunk.id && !accumulator.responseId) {
      accumulator.responseId = typedChunk.id;
    }
    if (typedChunk.model && (!accumulator.responseModel || accumulator.responseModel === "auto")) {
      accumulator.responseModel = typedChunk.model;
    }
    // Capture tools_checksum if present
    if (typedChunk.tools_checksum && !accumulator.toolsChecksum) {
      accumulator.toolsChecksum = typedChunk.tools_checksum;
    }
    // Also capture from nested response if present
    if (typedChunk.response?.tools_checksum && !accumulator.toolsChecksum) {
      accumulator.toolsChecksum = typedChunk.response.tools_checksum;
    }

    // Capture tool_call_events if present (skip empty arrays from early chunks)
    if (typedChunk.tool_call_events?.length && !accumulator.toolCallEvents?.length) {
      accumulator.toolCallEvents = typedChunk.tool_call_events.map((event) => ({
        id: event.id || "",
        name: event.name || "",
        arguments: event.arguments || "",
        output: event.output || "",
      }));
    }
    // Also capture from nested response if present (skip empty arrays from early chunks)
    if (typedChunk.response?.tool_call_events?.length && !accumulator.toolCallEvents?.length) {
      accumulator.toolCallEvents = typedChunk.response.tool_call_events.map((event) => ({
        id: event.id || "",
        name: event.name || "",
        arguments: event.arguments || "",
        output: event.output || "",
      }));
    }

    // Accumulate usage data
    if (typedChunk.usage) {
      accumulator.usage = {
        ...accumulator.usage,
        prompt_tokens: typedChunk.usage.prompt_tokens,
        completion_tokens: typedChunk.usage.completion_tokens,
        total_tokens: typedChunk.usage.total_tokens,
        cost_micro_usd: typedChunk.usage.cost_micro_usd,
        credits_used: typedChunk.usage.credits_used,
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
            accumulator.implicitReasoningStart = parseResult.implicitReasoningStart;
          }

          // Emit deltas
          // Only emit non-empty content to avoid false error detection
          const willEmitMessage =
            parseResult.messageContent && parseResult.messageContent.trim().length > 0;
          const willEmitReasoning =
            parseResult.reasoningContent && parseResult.reasoningContent.trim().length > 0;

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
                result.toolCallArgumentsDelta = {
                  toolCallId: toolCall.id,
                  toolName: toolCall.name,
                  argumentsDelta: toolCallDelta.function.arguments,
                  accumulatedArguments: toolCall.arguments,
                };
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
            id: toolCall.id || `tool_${Date.now()}_${Math.random().toString(36).slice(2)}_${i}`,
            type: toolCall.type || "function",
            name: toolCall.function?.name || "",
            arguments: toolCall.function?.arguments || "",
            status: "completed",
          });
        }

        // For implicit reasoning models (like Qwen), tool calls trigger a new
        // reasoning phase. Only re-enable reasoning mode if this model was
        // already detected as using implicit reasoning (no opening `<think>` tag).
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
          const shouldStartInsideReasoning = accumulator.implicitReasoningStart === true;

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
            accumulator.implicitReasoningStart = parseResult.implicitReasoningStart;
          }

          // Only emit content if we haven't already streamed it
          // This prevents duplicate content when the server sends both streaming deltas
          // and a final message with the complete content
          if (!alreadyHasContent) {
            // For non-streaming, we always emit the final content (reasoning is already separated)
            // Only emit non-empty content to avoid false error detection
            if (parseResult.messageContent && parseResult.messageContent.trim().length > 0) {
              result.content = parseResult.messageContent;
            }
            if (parseResult.reasoningContent && parseResult.reasoningContent.trim().length > 0) {
              result.thinking = parseResult.reasoningContent;
            }
          }
        }

        if (choice.message.tool_calls) {
          for (let i = 0; i < choice.message.tool_calls.length; i++) {
            const toolCall = choice.message.tool_calls[i];
            const toolKey = `tool_${i}`;
            accumulator.toolCalls.set(toolKey, {
              id: toolCall.id || `tool_${Date.now()}_${Math.random().toString(36).slice(2)}_${i}`,
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
        // Recover xAI's hybrid tool-call format: Grok emits most args inside
        // <parameter name="X">Y</parameter> text content while function_call
        // arguments only carry a subset (e.g. just `path`). Merge the XML
        // params into the tool call args here, before marking complete.
        if (accumulator.toolCalls.size > 0) {
          accumulator.content = mergeXaiInlineParameterTags(
            accumulator.content,
            accumulator.toolCalls
          );
        }
        for (const toolCall of accumulator.toolCalls.values()) {
          if (toolCall.status === "pending") {
            toolCall.status = "completed";
          }
        }
      }
    }

    return result;
  }

  buildFinalResponse(accumulator: StreamAccumulator): LlmapiChatCompletionResponse {
    // Final cleanup: handle any remaining partial tag
    let finalContent = accumulator.content;
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
      // Handle any remaining partial tag content that couldn't be parsed
      // (e.g., stream ended with incomplete tag like "<" or "<thi")
      if (finalParse.partialTag) {
        if (!finalParse.insideReasoning) {
          // If we're not inside reasoning, the partial is regular content
          finalContent += finalParse.partialTag;
        }
        // If inside reasoning, the partial belongs to thinking (not used in Completions format)
      }
    }

    // Build tool_calls array for the choice message
    const toolCalls =
      accumulator.toolCalls.size > 0
        ? Array.from(accumulator.toolCalls.values()).map((tc) => ({
            id: tc.id,
            type: tc.type,
            function: {
              name: tc.name,
              arguments: tc.arguments,
            },
          }))
        : undefined;

    // Build native Completions API response format
    return {
      id: accumulator.responseId,
      model: accumulator.responseModel,
      tools_checksum: accumulator.toolsChecksum,
      tool_call_events: accumulator.toolCallEvents,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: [{ type: "text", text: finalContent }],
            ...(toolCalls && { tool_calls: toolCalls }),
          },
          finish_reason: toolCalls ? "tool_calls" : "stop",
        },
      ],
      usage:
        Object.keys(accumulator.usage).length > 0
          ? {
              prompt_tokens: accumulator.usage.prompt_tokens,
              completion_tokens: accumulator.usage.completion_tokens,
              total_tokens: accumulator.usage.total_tokens,
              cost_micro_usd: accumulator.usage.cost_micro_usd,
              credits_used: accumulator.usage.credits_used,
            }
          : undefined,
    };
  }
}
