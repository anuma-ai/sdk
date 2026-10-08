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
 * Portal envelope on chat completions responses (new OpenAI-compliant shape).
 * The same envelope appears on the non-streaming response body and on the
 * `response.completed`-style fallback chunk emitted when the portal cannot
 * stream incrementally (e.g. when an upstream provider only supports
 * non-streaming).
 */
type CompletionsPortalEnvelope = {
  tools_checksum?: string;
  tool_call_events?: Array<ToolCallEventChunk>;
  cost_micro_usd?: number;
  credits_used?: number;
  /** Image model the portal resolved when an image-generation tool ran. */
  image_model?: string;
  /** Cost/usage breakdown — moved here from the flat `usage` shape in the
   *  OpenAI-compliant migration. Mirrored back into `usage` for legacy readers. */
  init_prompt_tokens?: number;
  init_completion_tokens?: number;
  provider_cost_micro_usd?: number;
  pricing_source?: string;
  tool_cost_micro_usd?: number;
};

/**
 * The legacy top-level mirrors (`tools_checksum`, `tool_call_events`) can ride
 * on the chunk itself or the wrapped `response`, as well as inside a `portal`
 * envelope, so they are resolved from the wider carrier set below. The
 * portal-only fields (cost/credits, image_model, the init/provider/pricing
 * breakdown) appear ONLY under a `portal` envelope per the OpenAI-compliant
 * schema — never at the chunk top level — so they come from `portalEnvelopes`.
 */
type LegacyMirrorCarrier = {
  tools_checksum?: string;
  tool_call_events?: Array<ToolCallEventChunk>;
};

/**
 * Streaming chunk format for Chat Completions API (OpenAI-compatible).
 *
 * Per-chunk `usage` frames still carry `cost_micro_usd` / `credits_used` at the
 * top of `usage` — the OpenAI-compliant migration did not change the streaming
 * usage frame. The fallback `response.completed`-style envelope, however, uses
 * the new portal-nested shape for those fields; we honor both here.
 */
type CompletionsStreamingChunk = {
  id?: string;
  object?: string;
  model?: string;
  /** Checksum of tools used to generate this response (legacy top-level path). */
  tools_checksum?: string;
  /** Tool call events from server-side MCP tool execution (legacy top-level path). */
  tool_call_events?: Array<ToolCallEventChunk>;
  /** Portal envelope on the fallback non-streaming envelope. */
  portal?: CompletionsPortalEnvelope;
  /** Wrapped response format (some endpoints nest the response) */
  response?: {
    tools_checksum?: string;
    tool_call_events?: Array<ToolCallEventChunk>;
    portal?: CompletionsPortalEnvelope;
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
    /** Per-step out-of-credits marker (ai-portal #1146); rides the flat `usage`
     *  object (not the portal envelope), mirrored through like credits_used.
     *  Terminal boolean — passed through as-is, never summed. */
    credits_exhausted?: boolean;
  };
};

function legacyMirrorCarriers(chunk: CompletionsStreamingChunk): LegacyMirrorCarrier[] {
  return [chunk, chunk.portal, chunk.response, chunk.response?.portal].filter(
    (carrier): carrier is LegacyMirrorCarrier => carrier !== undefined
  );
}

function portalEnvelopes(chunk: CompletionsStreamingChunk): CompletionsPortalEnvelope[] {
  return [chunk.portal, chunk.response?.portal].filter(
    (carrier): carrier is CompletionsPortalEnvelope => carrier !== undefined
  );
}

function firstPortalField<C, T>(carriers: C[], pick: (carrier: C) => T | undefined): T | undefined {
  for (const carrier of carriers) {
    const value = pick(carrier);
    if (value !== undefined) return value;
  }
  return undefined;
}

function numberField<K extends string>(
  key: K,
  value: number | undefined
): Partial<Record<K, number>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, number>);
}
function stringField<K extends string>(
  key: K,
  value: string | undefined
): Partial<Record<K, string>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, string>);
}
function booleanField<K extends string>(
  key: K,
  value: boolean | undefined
): Partial<Record<K, boolean>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, boolean>);
}

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

    const portal =
      imageModel || conversationId
        ? {
            ...(imageModel && { image_model: imageModel }),
            ...(conversationId && { conversation_id: conversationId }),
          }
        : undefined;

    return {
      messages,
      model,
      stream,
      ...(temperature !== undefined && { temperature }),
      ...(maxOutputTokens !== undefined && { max_completion_tokens: maxOutputTokens }),
      ...(tools && { tools }),
      ...(toolChoice && { tool_choice: toolChoice }),
      ...(portal && { portal }),
    };
  }

  processStreamChunk(chunk: unknown, accumulator: StreamAccumulator): ProcessChunkResult {
    const result: ProcessChunkResult = { content: null, thinking: null };

    const inStreamErr = getInStreamErrorMessage(chunk);
    if (inStreamErr) throw new Error(inStreamErr);

    const rawChunk = chunk as { response?: CompletionsStreamingChunk; type?: string };
    const typedChunk =
      rawChunk.response && rawChunk.type === "response"
        ? rawChunk.response
        : (chunk as CompletionsStreamingChunk);

    if (typedChunk.id && !accumulator.responseId) {
      accumulator.responseId = typedChunk.id;
    }
    if (typedChunk.model && (!accumulator.responseModel || accumulator.responseModel === "auto")) {
      accumulator.responseModel = typedChunk.model;
    }
    const legacyCarriers = legacyMirrorCarriers(typedChunk);
    const portalEnvs = portalEnvelopes(typedChunk);

    const checksumCandidate = firstPortalField(
      legacyCarriers,
      (c) => c.tools_checksum || undefined
    );
    if (checksumCandidate && !accumulator.toolsChecksum) {
      accumulator.toolsChecksum = checksumCandidate;
    }

    const toolCallEventsCandidate = firstPortalField(legacyCarriers, (c) =>
      c.tool_call_events?.length ? c.tool_call_events : undefined
    );
    if (toolCallEventsCandidate && !accumulator.toolCallEvents?.length) {
      accumulator.toolCallEvents = toolCallEventsCandidate.map((event) => ({
        id: event.id || "",
        name: event.name || "",
        arguments: event.arguments || "",
        output: event.output || "",
      }));
    }

    if (typedChunk.usage) {
      accumulator.usage = {
        ...accumulator.usage,
        ...(typedChunk.usage.prompt_tokens !== undefined && {
          prompt_tokens: typedChunk.usage.prompt_tokens,
        }),
        ...(typedChunk.usage.completion_tokens !== undefined && {
          completion_tokens: typedChunk.usage.completion_tokens,
        }),
        ...(typedChunk.usage.total_tokens !== undefined && {
          total_tokens: typedChunk.usage.total_tokens,
        }),
        ...(typedChunk.usage.cost_micro_usd !== undefined && {
          cost_micro_usd: typedChunk.usage.cost_micro_usd,
        }),
        ...(typedChunk.usage.credits_used !== undefined && {
          credits_used: typedChunk.usage.credits_used,
        }),
        ...(typedChunk.usage.credits_exhausted !== undefined && {
          credits_exhausted: typedChunk.usage.credits_exhausted,
        }),
      };
    }
    const portalImageModel = firstPortalField(portalEnvs, (c) => c.image_model || undefined);
    if (portalImageModel && !accumulator.imageModel) {
      accumulator.imageModel = portalImageModel;
    }

    const portalUsageExtras = {
      ...numberField(
        "cost_micro_usd",
        firstPortalField(portalEnvs, (c) => c.cost_micro_usd)
      ),
      ...numberField(
        "credits_used",
        firstPortalField(portalEnvs, (c) => c.credits_used)
      ),
      ...numberField(
        "init_prompt_tokens",
        firstPortalField(portalEnvs, (c) => c.init_prompt_tokens)
      ),
      ...numberField(
        "init_completion_tokens",
        firstPortalField(portalEnvs, (c) => c.init_completion_tokens)
      ),
      ...numberField(
        "provider_cost_micro_usd",
        firstPortalField(portalEnvs, (c) => c.provider_cost_micro_usd)
      ),
      ...stringField(
        "pricing_source",
        firstPortalField(portalEnvs, (c) => c.pricing_source || undefined)
      ),
      ...numberField(
        "tool_cost_micro_usd",
        firstPortalField(portalEnvs, (c) => c.tool_cost_micro_usd)
      ),
    };
    if (Object.keys(portalUsageExtras).length > 0) {
      accumulator.usage = { ...accumulator.usage, ...portalUsageExtras };
    }

    if (typedChunk.choices && typedChunk.choices.length > 0) {
      const choice = typedChunk.choices[0];

      if (choice.delta) {
        if (choice.delta.content) {
          const parseResult = parseReasoningTags(
            choice.delta.content,
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

        if (choice.delta.tool_calls) {
          for (const toolCallDelta of choice.delta.tool_calls) {
            const toolIndex = toolCallDelta.index;
            const toolKey = `tool_${toolIndex}`;

            let toolCall = accumulator.toolCalls.get(toolKey);

            if (toolCallDelta.id) {
              toolCall = {
                id: toolCallDelta.id,
                type: toolCallDelta.type || "function",
                name: toolCallDelta.function?.name || "",
                arguments: toolCallDelta.function?.arguments || "",
                status: "pending",
              };
              accumulator.toolCalls.set(toolKey, toolCall);
            } else if (toolCall) {
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

        if (accumulator.implicitReasoningStart === true) {
          accumulator.insideReasoning = true;
        }
      }

      if (choice.message) {
        if (choice.message.content) {
          const shouldStartInsideReasoning = accumulator.implicitReasoningStart === true;

          const parseResult = parseReasoningTags(
            choice.message.content,
            "",
            shouldStartInsideReasoning,
            undefined,
            accumulator.implicitReasoningStart
          );

          const alreadyHasContent = accumulator.content.length > 0;

          accumulator.content = parseResult.messageContent;
          accumulator.thinking += parseResult.reasoningContent;
          accumulator.partialReasoningTag = parseResult.partialTag;
          accumulator.insideReasoning = parseResult.insideReasoning;
          if (parseResult.implicitReasoningStart !== undefined) {
            accumulator.implicitReasoningStart = parseResult.implicitReasoningStart;
          }

          if (!alreadyHasContent) {
            if (parseResult.messageContent && parseResult.messageContent.length > 0) {
              result.content = parseResult.messageContent;
            }
            if (parseResult.reasoningContent && parseResult.reasoningContent.length > 0) {
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

      if (choice.finish_reason) {
        accumulator.finishReason = choice.finish_reason;
      }

      if (choice.finish_reason === "tool_calls" || choice.finish_reason === "stop") {
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
    let finalContent = accumulator.content;
    if (accumulator.partialReasoningTag) {
      const finalParse = parseReasoningTags(
        "",
        accumulator.partialReasoningTag,
        accumulator.insideReasoning || false,
        undefined,
        accumulator.implicitReasoningStart
      );
      finalContent += finalParse.messageContent;
      if (finalParse.partialTag) {
        if (!finalParse.insideReasoning) {
          finalContent += finalParse.partialTag;
        }
      }
    }

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

    const u = accumulator.usage;
    const tokenFields = {
      ...numberField("prompt_tokens", u.prompt_tokens),
      ...numberField("completion_tokens", u.completion_tokens),
      ...numberField("total_tokens", u.total_tokens),
    };
    const creditsExhaustedField = booleanField("credits_exhausted", u.credits_exhausted);
    const portalUsageExtras = {
      ...numberField("cost_micro_usd", u.cost_micro_usd),
      ...numberField("credits_used", u.credits_used),
      ...numberField("init_prompt_tokens", u.init_prompt_tokens),
      ...numberField("init_completion_tokens", u.init_completion_tokens),
      ...numberField("provider_cost_micro_usd", u.provider_cost_micro_usd),
      ...stringField("pricing_source", u.pricing_source),
      ...numberField("tool_cost_micro_usd", u.tool_cost_micro_usd),
    };
    const hasUsageExtras = Object.keys(portalUsageExtras).length > 0;
    const hasCreditsExhausted = Object.keys(creditsExhaustedField).length > 0;
    const usage =
      Object.keys(tokenFields).length > 0 || hasUsageExtras || hasCreditsExhausted
        ? { ...tokenFields, ...portalUsageExtras, ...creditsExhaustedField }
        : undefined;

    const hasPortalFields =
      accumulator.toolsChecksum !== undefined ||
      (accumulator.toolCallEvents?.length ?? 0) > 0 ||
      accumulator.imageModel !== undefined ||
      hasUsageExtras;

    const portal = hasPortalFields
      ? {
          ...(accumulator.toolsChecksum !== undefined && {
            tools_checksum: accumulator.toolsChecksum,
          }),
          ...(accumulator.toolCallEvents?.length && {
            tool_call_events: accumulator.toolCallEvents,
          }),
          ...stringField("image_model", accumulator.imageModel),
          ...portalUsageExtras,
        }
      : undefined;

    return {
      id: accumulator.responseId,
      model: accumulator.responseModel,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: finalContent,
            ...(toolCalls && { tool_calls: toolCalls }),
          },
          finish_reason: accumulator.finishReason ?? (toolCalls ? "tool_calls" : "stop"),
        },
      ],
      ...(usage && { usage }),
      ...(portal && { portal }),
      ...(accumulator.toolsChecksum !== undefined && {
        tools_checksum: accumulator.toolsChecksum,
      }),
      ...(accumulator.toolCallEvents?.length && {
        tool_call_events: accumulator.toolCallEvents,
      }),
      ...stringField("image_model", accumulator.imageModel),
    };
  }
}
