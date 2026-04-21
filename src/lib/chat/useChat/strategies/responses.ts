import type { LlmapiResponseResponse } from "../../../../client";
import type { AccumulatedToolCall, StreamAccumulator, StreamingChunk } from "../types";
import type { ProcessChunkResult } from "../utils";
import { getInStreamErrorMessage, parseReasoningTags } from "../utils";
import type { ApiStrategy, BuildRequestBodyArgs } from "./types";
import { mergeXaiInlineParameterTags } from "./xaiToolFormat";

type ToolCallEventInput = {
  id?: string;
  name?: string;
  arguments?: string;
  output?: string;
};

/**
 * Walk the final `response.output[]` array (present on `response.completed`
 * events) and backfill `name` on matching tool-call accumulator entries.
 * Anthropic via Bifrost doesn't emit `output_item.added` with a usable name —
 * entries are created by the `.delta` handler with name="" and need the name
 * from this authoritative final payload.
 */
function backfillToolCallNames(
  accumulator: StreamAccumulator,
  response: { output?: unknown } | undefined
): void {
  const output = response?.output;
  if (!Array.isArray(output)) return;
  for (const raw of output) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    if (item.type !== "function_call") continue;
    const name = typeof item.name === "string" ? item.name : "";
    if (!name) continue;
    const itemId = typeof item.id === "string" ? item.id : "";
    const callId = typeof item.call_id === "string" ? item.call_id : "";

    // Prefer direct Map lookup by item.id (that's the key the .delta handler uses).
    let entry: AccumulatedToolCall | undefined = itemId
      ? accumulator.toolCalls.get(itemId)
      : undefined;
    if (!entry) {
      for (const v of accumulator.toolCalls.values()) {
        if (v.id === callId || v.id === itemId) {
          entry = v;
          break;
        }
      }
    }
    if (entry && !entry.name) entry.name = name;
  }
}

/**
 * Pull the argument fragment from a `response.function_call_arguments.*` event.
 * OpenAI's responses API puts it on `arguments` at the top level; Anthropic via
 * Bifrost puts it on `delta.OfString`. Return empty string if neither is present.
 */
function extractArgsString(chunk: StreamingChunk): string {
  if (typeof chunk.arguments === "string" && chunk.arguments) return chunk.arguments;
  const delta = chunk.delta;
  if (typeof delta === "string") return delta;
  if (delta && typeof delta === "object" && typeof delta.OfString === "string") {
    return delta.OfString;
  }
  return "";
}

/**
 * Merge the authoritative `tool_call_events` array from a `response.completed`
 * (or equivalent) payload into the accumulator's `toolCalls` Map. Some
 * providers (OpenAI/Anthropic via Bifrost's responses API) emit streaming
 * events whose `item_id`/`call_id` don't line up with the `.added` event,
 * leaving entries in `toolCalls` with empty `arguments`. The final
 * `tool_call_events` array carries complete data, so we use it to backfill
 * missing arguments or create entries that were never streamed.
 *
 * Events with a non-empty `output` are skipped — those are server-side tools
 * already executed by the portal (search, image generation), so they must
 * not be re-added as pending client-side calls.
 */
function mergeToolCallEventsIntoAccumulator(
  accumulator: StreamAccumulator,
  events: ToolCallEventInput[]
): void {
  for (const event of events) {
    if (!event.id || !event.arguments) continue;
    if (event.output) continue;

    let existing: AccumulatedToolCall | undefined;
    for (const entry of accumulator.toolCalls.values()) {
      if (entry.id === event.id) {
        existing = entry;
        break;
      }
    }

    if (existing) {
      if (!existing.arguments) existing.arguments = event.arguments;
      if (!existing.name && event.name) existing.name = event.name;
    } else if (event.name) {
      accumulator.toolCalls.set(event.id, {
        id: event.id,
        type: "function",
        name: event.name,
        arguments: event.arguments,
        status: "pending",
      });
    }
  }
}

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
      imageModel,
      conversationId,
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
      ...(imageModel && { image_model: imageModel }),
      ...(conversationId && { conversation_id: conversationId }),
    };
  }

  processStreamChunk(chunk: unknown, accumulator: StreamAccumulator): ProcessChunkResult {
    const result: ProcessChunkResult = { content: null, thinking: null };
    const typedChunk = chunk as StreamingChunk;

    // Detect in-stream error events from Bifrost (e.g. OpenRouter Qwen upstream
    // timeouts). If we don't throw here the stream just ends silently with no
    // tool call and no usable response. The outer tool loop catches this and
    // surfaces it as the final error to the caller.
    const inStreamErr = getInStreamErrorMessage(chunk);
    if (inStreamErr) throw new Error(inStreamErr);

    // Detect response.failed events (e.g. model not deployed, upstream refused
    // the request). Carries a nested error object with message/code; surface
    // it so callers see a real reason instead of a silent empty response.
    if (typedChunk.type === "response.failed") {
      const resp = (typedChunk as { response?: { error?: { code?: unknown; message?: unknown } } })
        .response;
      const err = resp?.error;
      if (err && typeof err === "object") {
        const code = typeof err.code === "string" ? err.code : "";
        const rawMessage = typeof err.message === "string" ? err.message : "";
        // Bifrost sometimes double-encodes the upstream error as a JSON string
        // in `message`. Pull out the inner message when that happens.
        let message = rawMessage;
        if (rawMessage.startsWith("{")) {
          try {
            const parsed = JSON.parse(rawMessage) as { error?: { message?: unknown } };
            const inner = parsed.error?.message;
            if (typeof inner === "string" && inner.length > 0) message = inner;
          } catch {
            // fall through
          }
        }
        const label = code ? `[${code}] ` : "";
        throw new Error(`${label}${message || "Upstream request failed"}`);
      }
      throw new Error("Upstream request failed (response.failed)");
    }

    // Handle full "response" event — sent by the portal's chat/completions fallback
    // when it uses non-streaming internally and sends the entire result as one chunk.
    if (typedChunk.type === "response" && typedChunk.response) {
      const resp = typedChunk.response as Record<string, unknown>;
      if (typeof resp.id === "string") accumulator.responseId = resp.id;
      if (typeof resp.model === "string") accumulator.responseModel = resp.model;
      if (typeof resp.tools_checksum === "string") accumulator.toolsChecksum = resp.tools_checksum;

      // Extract usage
      const u = (resp.usage as Record<string, number | undefined>) || {};
      const promptTokens = u.input_tokens ?? u.prompt_tokens ?? 0;
      const completionTokens = u.output_tokens ?? u.completion_tokens ?? 0;
      accumulator.usage = {
        ...accumulator.usage,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: u.total_tokens ?? promptTokens + completionTokens,
        ...(u.cost_micro_usd !== null &&
          u.cost_micro_usd !== undefined && { cost_micro_usd: u.cost_micro_usd }),
        ...(u.credits_used !== null &&
          u.credits_used !== undefined && { credits_used: u.credits_used }),
      };

      // Extract content from output array — but only if no content was already
      // accumulated from streaming delta events. The backend sends this "response"
      // event after all deltas have been streamed; extracting content here would
      // duplicate everything already delivered via response.output_text.delta.
      // This branch is only needed for the non-streaming completions fallback
      // where no delta events are sent.
      // Note: we intentionally only check `accumulator.content`, not `thinking`.
      // A model may stream thinking via response.thinking.delta but deliver message
      // content only in the final response object — guarding on thinking would
      // silently drop that content.
      if (!accumulator.content) {
        const output = resp.output as
          | Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>
          | undefined;
        if (output) {
          for (const item of output) {
            if (item.type === "message" && item.content) {
              for (const part of item.content) {
                if (part.type === "output_text" && part.text) {
                  const parseResult = parseReasoningTags(
                    part.text,
                    accumulator.partialReasoningTag || "",
                    accumulator.insideReasoning || false,
                    undefined,
                    accumulator.implicitReasoningStart
                  );
                  accumulator.content += parseResult.messageContent;
                  accumulator.thinking += parseResult.reasoningContent;
                  accumulator.partialReasoningTag = parseResult.partialTag;
                  accumulator.insideReasoning = parseResult.insideReasoning;
                  if (parseResult.implicitReasoningStart !== undefined) {
                    accumulator.implicitReasoningStart = parseResult.implicitReasoningStart;
                  }
                  if (parseResult.messageContent && parseResult.messageContent.trim().length > 0) {
                    result.content = (result.content || "") + parseResult.messageContent;
                  }
                  if (
                    parseResult.reasoningContent &&
                    parseResult.reasoningContent.trim().length > 0
                  ) {
                    result.thinking = (result.thinking || "") + parseResult.reasoningContent;
                  }
                }
              }
            }
          }
        }
      }

      // Extract tool call events
      const toolCallEvents = resp.tool_call_events as ToolCallEventInput[] | undefined;
      if (toolCallEvents) {
        accumulator.toolCallEvents = toolCallEvents.map((e) => ({
          id: e.id || "",
          name: e.name || "",
          arguments: e.arguments || "",
          output: e.output || "",
        }));
        mergeToolCallEventsIntoAccumulator(accumulator, toolCallEvents);
      }

      return result;
    }

    // Handle response.created event - extract ID and model from response object
    if (typedChunk.type === "response.created" && typedChunk.response) {
      if (typedChunk.response.id && !accumulator.responseId) {
        accumulator.responseId = typedChunk.response.id;
      }
      if (
        typedChunk.response.model &&
        (!accumulator.responseModel || accumulator.responseModel === "auto")
      ) {
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
        const u = typedChunk.response.usage as Record<string, number | undefined>;
        const promptTokens = u.input_tokens ?? u.prompt_tokens ?? 0;
        const completionTokens = u.output_tokens ?? u.completion_tokens ?? 0;
        accumulator.usage = {
          ...accumulator.usage,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
          ...(u.cost_micro_usd !== null &&
            u.cost_micro_usd !== undefined && { cost_micro_usd: u.cost_micro_usd }),
          ...(u.credits_used !== null &&
            u.credits_used !== undefined && { credits_used: u.credits_used }),
        };
      }

      // Capture tools_checksum if present
      if (typedChunk.response?.tools_checksum && !accumulator.toolsChecksum) {
        accumulator.toolsChecksum = typedChunk.response.tools_checksum;
      }

      // Capture tool_call_events if present (skip empty arrays from early chunks)
      if (typedChunk.response?.tool_call_events?.length && !accumulator.toolCallEvents?.length) {
        const events = typedChunk.response.tool_call_events as ToolCallEventInput[];
        accumulator.toolCallEvents = events.map((event) => ({
          id: event.id || "",
          name: event.name || "",
          arguments: event.arguments || "",
          output: event.output || "",
        }));
        mergeToolCallEventsIntoAccumulator(accumulator, events);
      }

      // Backfill tool call names from response.output[] — Anthropic via
      // Bifrost creates entries via the `.delta` handler with name="" (since
      // its output_item.added event has no name). The final response.output
      // array carries the names, keyed by item.id / call_id.
      backfillToolCallNames(accumulator, typedChunk.response as { output?: unknown } | undefined);

      // Recover xAI's hybrid tool-call format: Grok streams most args inside
      // <parameter name="X">Y</parameter> text content while function_call
      // arguments only carry a subset (e.g. just `path`). Merge the XML
      // params into the tool call args here, after both streams are final.
      // Guard on toolCalls.size > 0 to match completions.ts — without this,
      // a text-only response that happens to contain <parameter> markup
      // (e.g. XML examples in a tool result) could be incorrectly stripped.
      if (accumulator.toolCalls.size > 0) {
        accumulator.content = mergeXaiInlineParameterTags(
          accumulator.content,
          accumulator.toolCalls
        );
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
    if (typedChunk.model && (!accumulator.responseModel || accumulator.responseModel === "auto")) {
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
    // Capture tool_call_events from top-level if present (skip empty arrays from early chunks)
    if (typedChunk.tool_call_events?.length && !accumulator.toolCallEvents?.length) {
      const events = typedChunk.tool_call_events as ToolCallEventInput[];
      accumulator.toolCallEvents = events.map((event) => ({
        id: event.id || "",
        name: event.name || "",
        arguments: event.arguments || "",
        output: event.output || "",
      }));
      mergeToolCallEventsIntoAccumulator(accumulator, events);
    }
    // Also capture from nested response if present (skip empty arrays from early chunks)
    if (typedChunk.response?.tool_call_events?.length && !accumulator.toolCallEvents?.length) {
      const events = typedChunk.response.tool_call_events as ToolCallEventInput[];
      accumulator.toolCallEvents = events.map((event) => ({
        id: event.id || "",
        name: event.name || "",
        arguments: event.arguments || "",
        output: event.output || "",
      }));
      mergeToolCallEventsIntoAccumulator(accumulator, events);
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
            accumulator.implicitReasoningStart = parseResult.implicitReasoningStart;
          }

          // Emit deltas - only emit non-empty content to avoid false error detection
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
      // OpenAI uses `arguments` at the top level; Anthropic via Bifrost uses
      // `delta.OfString`. Accept either.
      const argsDelta = extractArgsString(typedChunk);
      if (itemId && argsDelta) {
        // Upsert: Anthropic via Bifrost doesn't emit a usable
        // `response.output_item.added` (name and id are empty), so the entry
        // may not yet exist. Create it here keyed by item_id; the name gets
        // backfilled at response.completed from response.output[].
        let existing = accumulator.toolCalls.get(itemId);
        if (!existing) {
          existing = {
            id: typedChunk.call_id || itemId,
            type: "function",
            name: "",
            arguments: "",
            status: "pending",
          };
          accumulator.toolCalls.set(itemId, existing);
        }
        existing.arguments += argsDelta;
        result.toolCallArgumentsDelta = {
          toolCallId: existing.id,
          toolName: existing.name,
          argumentsDelta: argsDelta,
          accumulatedArguments: existing.arguments,
        };
      }
    }

    // Event: response.function_call_arguments.done - arguments complete
    if (typedChunk.type === "response.function_call_arguments.done") {
      const itemId = typedChunk.item_id || typedChunk.call_id || "";
      const finalArgs = extractArgsString(typedChunk);
      if (itemId && finalArgs) {
        let existing = accumulator.toolCalls.get(itemId);
        if (!existing) {
          existing = {
            id: typedChunk.call_id || itemId,
            type: "function",
            name: "",
            arguments: "",
            status: "pending",
          };
          accumulator.toolCalls.set(itemId, existing);
        }
        existing.arguments = finalArgs;
      }
    }

    // Fallback: handle chat/completions format (choices[].delta.content)
    // Some models (e.g. MiniMax) are routed through a server-side chat/completions
    // fallback, which streams in completions format instead of responses format.
    const completionsChunk = typedChunk as Record<string, unknown>;
    const choices = completionsChunk.choices as
      | Array<{ delta?: { content?: string }; message?: { content?: string } }>
      | undefined;
    if (choices && choices.length > 0) {
      // Extract id and model from completions-format chunks
      if (typeof completionsChunk.id === "string" && !accumulator.responseId) {
        accumulator.responseId = completionsChunk.id;
      }
      if (typeof completionsChunk.model === "string" && !accumulator.responseModel) {
        accumulator.responseModel = completionsChunk.model;
      }

      const choice = choices[0];
      const deltaContent = choice?.delta?.content || choice?.message?.content;
      if (deltaContent) {
        const parseResult = parseReasoningTags(
          deltaContent,
          accumulator.partialReasoningTag || "",
          accumulator.insideReasoning || false,
          undefined,
          accumulator.implicitReasoningStart
        );

        accumulator.content += parseResult.messageContent;
        accumulator.thinking += parseResult.reasoningContent;
        accumulator.partialReasoningTag = parseResult.partialTag;
        accumulator.insideReasoning = parseResult.insideReasoning;
        if (parseResult.implicitReasoningStart !== undefined) {
          accumulator.implicitReasoningStart = parseResult.implicitReasoningStart;
        }

        if (parseResult.messageContent && parseResult.messageContent.trim().length > 0) {
          result.content = parseResult.messageContent;
        }
        if (parseResult.reasoningContent && parseResult.reasoningContent.trim().length > 0) {
          result.thinking = parseResult.reasoningContent;
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
      usage: Object.keys(accumulator.usage).length > 0 ? accumulator.usage : undefined,
      tools_checksum: accumulator.toolsChecksum,
      tool_call_events: accumulator.toolCallEvents,
    };
  }
}
