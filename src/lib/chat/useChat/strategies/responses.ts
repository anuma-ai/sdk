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

function extractArgsString(chunk: StreamingChunk): string {
  if (typeof chunk.arguments === "string" && chunk.arguments) return chunk.arguments;
  const delta = chunk.delta;
  if (typeof delta === "string") return delta;
  if (delta && typeof delta === "object" && typeof delta.OfString === "string") {
    return delta.OfString;
  }
  return "";
}

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

    const inStreamErr = getInStreamErrorMessage(chunk);
    if (inStreamErr) throw new Error(inStreamErr);

    if (typedChunk.type === "response.failed") {
      const resp = (typedChunk as { response?: { error?: { code?: unknown; message?: unknown } } })
        .response;
      const err = resp?.error;
      if (err && typeof err === "object") {
        const code = typeof err.code === "string" ? err.code : "";
        const rawMessage = typeof err.message === "string" ? err.message : "";
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

    if (typedChunk.type === "response" && typedChunk.response) {
      const resp = typedChunk.response as Record<string, unknown>;
      if (typeof resp.id === "string") accumulator.responseId = resp.id;
      if (typeof resp.model === "string") accumulator.responseModel = resp.model;
      if (typeof resp.tools_checksum === "string") accumulator.toolsChecksum = resp.tools_checksum;

      const u = (resp.usage as Record<string, number | undefined>) || {};
      const promptTokens = u.input_tokens ?? u.prompt_tokens ?? 0;
      const completionTokens = u.output_tokens ?? u.completion_tokens ?? 0;
      const creditsExhausted = (resp.usage as { credits_exhausted?: boolean } | undefined)
        ?.credits_exhausted;
      accumulator.usage = {
        ...accumulator.usage,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: u.total_tokens ?? promptTokens + completionTokens,
        ...(u.cost_micro_usd !== null &&
          u.cost_micro_usd !== undefined && { cost_micro_usd: u.cost_micro_usd }),
        ...(u.credits_used !== null &&
          u.credits_used !== undefined && { credits_used: u.credits_used }),
        ...(creditsExhausted !== undefined && { credits_exhausted: creditsExhausted }),
      };

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
                  if (parseResult.messageContent && parseResult.messageContent.length > 0) {
                    result.content = (result.content || "") + parseResult.messageContent;
                  }
                  if (parseResult.reasoningContent && parseResult.reasoningContent.length > 0) {
                    result.thinking = (result.thinking || "") + parseResult.reasoningContent;
                  }
                }
              }
            }
          }
        }
      }

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

      const fbStatus = typeof resp.status === "string" ? resp.status : undefined;
      const fbIncompleteReason = (resp.incomplete_details as { reason?: string } | undefined)
        ?.reason;
      const fbFinishReason =
        typeof resp.finish_reason === "string" ? resp.finish_reason : undefined;
      if (fbStatus !== undefined) accumulator.responseStatus = fbStatus;
      if (fbIncompleteReason !== undefined) accumulator.incompleteReason = fbIncompleteReason;
      if (fbFinishReason !== undefined) {
        accumulator.finishReason = fbFinishReason;
      } else if (fbStatus === "incomplete" && fbIncompleteReason === "max_output_tokens") {
        accumulator.finishReason = "length";
      }

      return result;
    }

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

    if (typedChunk.type === "response.completed" || typedChunk.type === "response.incomplete") {
      if (typedChunk.response?.usage) {
        const u = typedChunk.response.usage as Record<string, number | undefined>;
        const promptTokens = u.input_tokens ?? u.prompt_tokens ?? 0;
        const completionTokens = u.output_tokens ?? u.completion_tokens ?? 0;
        const creditsExhausted = typedChunk.response.usage.credits_exhausted;
        accumulator.usage = {
          ...accumulator.usage,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
          ...(u.cost_micro_usd !== null &&
            u.cost_micro_usd !== undefined && { cost_micro_usd: u.cost_micro_usd }),
          ...(u.credits_used !== null &&
            u.credits_used !== undefined && { credits_used: u.credits_used }),
          ...(creditsExhausted !== undefined && { credits_exhausted: creditsExhausted }),
        };
      }

      const resp = typedChunk.response as
        | { status?: string; incomplete_details?: { reason?: string } }
        | undefined;
      const looksIncomplete =
        typedChunk.type === "response.incomplete" || resp?.status === "incomplete";
      if (looksIncomplete && resp?.incomplete_details?.reason === "max_output_tokens") {
        accumulator.finishReason = "length";
      }

      accumulator.responseStatus = looksIncomplete ? "incomplete" : resp?.status;
      accumulator.incompleteReason = resp?.incomplete_details?.reason;

      if (typedChunk.response?.tools_checksum && !accumulator.toolsChecksum) {
        accumulator.toolsChecksum = typedChunk.response.tools_checksum;
      }

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

      backfillToolCallNames(accumulator, typedChunk.response as { output?: unknown } | undefined);

      accumulator.content = mergeXaiInlineParameterTags(accumulator.content, accumulator.toolCalls);

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

    if (typedChunk.id && !accumulator.responseId) {
      accumulator.responseId = typedChunk.id;
    }
    if (typedChunk.model && (!accumulator.responseModel || accumulator.responseModel === "auto")) {
      accumulator.responseModel = typedChunk.model;
    }
    if (typedChunk.tools_checksum && !accumulator.toolsChecksum) {
      accumulator.toolsChecksum = typedChunk.tools_checksum;
    }
    if (typedChunk.response?.tools_checksum && !accumulator.toolsChecksum) {
      accumulator.toolsChecksum = typedChunk.response.tools_checksum;
    }
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

    if (typedChunk.usage) {
      accumulator.usage = {
        ...accumulator.usage,
        ...typedChunk.usage,
      };
    }

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

    if (
      typedChunk.type === "response.reasoning.done" ||
      typedChunk.type === "response.reasoning_summary_text.done" ||
      typedChunk.type === "response.thinking.done"
    ) {
      return result;
    }

    if (
      typedChunk.type === "response.reasoning_summary_part.added" ||
      typedChunk.type === "response.reasoning_summary_part.done" ||
      typedChunk.type === "response.thinking_part.added" ||
      typedChunk.type === "response.thinking_part.done"
    ) {
      return result;
    }

    if (typedChunk.type === "response.output_text.delta") {
      const delta = typedChunk.delta;
      if (delta) {
        const deltaText = typeof delta === "string" ? delta : delta.OfString;
        if (deltaText) {
          const parseResult = parseReasoningTags(
            deltaText,
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

          const willEmitMessage =
            parseResult.messageContent && parseResult.messageContent.length > 0;
          const willEmitReasoning =
            parseResult.reasoningContent && parseResult.reasoningContent.length > 0;

          if (willEmitMessage) {
            result.content = parseResult.messageContent;
          }
          if (willEmitReasoning) {
            result.thinking = parseResult.reasoningContent;
          }
        }
      }
    }

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

          if (accumulator.implicitReasoningStart === true) {
            accumulator.insideReasoning = true;
          }

          result.serverToolCall = {
            name: typedChunk.item.name,
            status: "started",
            arguments: typedChunk.item.arguments,
          };
        }
      }
    }

    if (typedChunk.type === "response.function_call_arguments.delta") {
      const itemId = typedChunk.item_id || typedChunk.call_id || "";
      const argsDelta = extractArgsString(typedChunk);
      if (itemId && argsDelta) {
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

    const completionsChunk = typedChunk as Record<string, unknown>;
    const choices = completionsChunk.choices as
      | Array<{ delta?: { content?: string }; message?: { content?: string } }>
      | undefined;
    if (choices && choices.length > 0) {
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

        if (parseResult.messageContent && parseResult.messageContent.length > 0) {
          result.content = parseResult.messageContent;
        }
        if (parseResult.reasoningContent && parseResult.reasoningContent.length > 0) {
          result.thinking = parseResult.reasoningContent;
        }
      }
    }

    return result;
  }

  buildFinalResponse(accumulator: StreamAccumulator): LlmapiResponseResponse {
    const output: LlmapiResponseResponse["output"] = [];

    let finalContent = accumulator.content;
    let finalThinking = accumulator.thinking;

    if (accumulator.partialReasoningTag) {
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
      if (finalParse.partialTag) {
        if (finalParse.insideReasoning) {
          finalThinking += finalParse.partialTag;
        } else {
          finalContent += finalParse.partialTag;
        }
      }
    }

    if (finalThinking) {
      output.push({
        type: "reasoning",
        role: "assistant",
        content: [{ type: "output_text", text: finalThinking }],
        status: "completed",
      });
    }

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
      ...(accumulator.responseStatus !== undefined && { status: accumulator.responseStatus }),
      ...(accumulator.incompleteReason !== undefined && {
        incomplete_details: { reason: accumulator.incompleteReason },
      }),
    };
  }
}
