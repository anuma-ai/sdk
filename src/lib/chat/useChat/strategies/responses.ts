import type { LlmapiResponseResponse } from "../../../../client";
import type { StreamAccumulator, StreamingChunk } from "../types";
import type { ProcessChunkResult } from "../utils";
import { parseReasoningTags } from "../utils";
import type { ApiStrategy, ApiResponse, BuildRequestBodyArgs } from "./types";

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
      reasoning,
      thinking,
    } = args;

    return {
      input: messages,
      model,
      stream,
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
      if (typedChunk.response.tools_checksum && !accumulator.toolsChecksum) {
        accumulator.toolsChecksum = typedChunk.response.tools_checksum;
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

      // Capture tools_checksum if present
      if (typedChunk.response?.tools_checksum && !accumulator.toolsChecksum) {
        accumulator.toolsChecksum = typedChunk.response.tools_checksum;
      }

      // Capture tool_call_events if present
      if (typedChunk.response?.tool_call_events && !accumulator.toolCallEvents) {
        accumulator.toolCallEvents = typedChunk.response.tool_call_events.map((event) => ({
          id: event.id || "",
          name: event.name || "",
          arguments: event.arguments || "",
          output: event.output || "",
        }));
      }

      // Mark all pending tool calls as completed and emit completion event
      for (const toolCall of accumulator.toolCalls.values()) {
        if (toolCall.status === "pending") {
          toolCall.status = "completed";
          result.serverToolCall = {
            name: toolCall.name,
            status: "completed",
          };
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
    // Capture tools_checksum from top-level if present
    if (typedChunk.tools_checksum && !accumulator.toolsChecksum) {
      accumulator.toolsChecksum = typedChunk.tools_checksum;
    }
    // Also capture from nested response if present (fallback for events without explicit type)
    if (typedChunk.response?.tools_checksum && !accumulator.toolsChecksum) {
      accumulator.toolsChecksum = typedChunk.response.tools_checksum;
    }
    // Capture tool_call_events from top-level if present
    if (typedChunk.tool_call_events && !accumulator.toolCallEvents) {
      accumulator.toolCallEvents = typedChunk.tool_call_events.map((event) => ({
        id: event.id || "",
        name: event.name || "",
        arguments: event.arguments || "",
        output: event.output || "",
      }));
    }
    // Also capture from nested response if present
    if (typedChunk.response?.tool_call_events && !accumulator.toolCallEvents) {
      accumulator.toolCallEvents = typedChunk.response.tool_call_events.map((event) => ({
        id: event.id || "",
        name: event.name || "",
        arguments: event.arguments || "",
        output: event.output || "",
      }));
    }

    // Accumulate usage data - merge instead of replace
    if (typedChunk.usage) {
      accumulator.usage = {
        ...accumulator.usage,
        ...typedChunk.usage,
      };
    }

    // Handle thinking/reasoning content deltas (streaming)
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

    // Handle thinking/reasoning done events (marks end of thinking phase)
    if (
      typedChunk.type === "response.reasoning.done" ||
      typedChunk.type === "response.reasoning_summary_text.done" ||
      typedChunk.type === "response.thinking.done"
    ) {
      // Thinking phase complete - no action needed, content already accumulated
      return result;
    }

    // Handle thinking/reasoning part added/done events
    if (
      typedChunk.type === "response.reasoning_summary_part.added" ||
      typedChunk.type === "response.reasoning_summary_part.done" ||
      typedChunk.type === "response.thinking_part.added" ||
      typedChunk.type === "response.thinking_part.done"
    ) {
      // Part boundary events - no action needed
      return result;
    }

    // Extract content delta from responses API format
    // For models like Qwen that use implicit reasoning (no opening tag),
    // we need to parse thinking tags from content as a fallback
    if (typedChunk.type === "response.output_text.delta") {
      const delta = typedChunk.delta;
      if (delta) {
        const deltaText = typeof delta === "string" ? delta : delta.OfString;
        if (deltaText) {
          // Parse reasoning tags from content (handles `<think>...</think>` tags)
          // Some models (like Qwen via Fireworks) include thinking in content
          const parseResult = parseReasoningTags(
            deltaText,
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

          // Emit deltas - only emit non-empty content to avoid false error detection
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

          // For implicit reasoning models (like Qwen), tool calls trigger a new
          // reasoning phase. Re-enable reasoning mode if this model was
          // already detected as using implicit reasoning (no opening `<think>` tag).
          if (accumulator.implicitReasoningStart === true) {
            accumulator.insideReasoning = true;
          }

          // Emit server tool call started event for activity indicators
          result.serverToolCall = {
            name: typedChunk.item.name,
            status: "started",
            arguments: typedChunk.item.arguments,
          };
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

    // Cast to ApiResponse because tool_call_events is an SDK extension not in the generated types
    return {
      id: accumulator.responseId,
      model: accumulator.responseModel,
      object: "response",
      output,
      usage:
        Object.keys(accumulator.usage).length > 0
          ? accumulator.usage
          : undefined,
      tools_checksum: accumulator.toolsChecksum,
      tool_call_events: accumulator.toolCallEvents,
    } as ApiResponse;
  }
}
