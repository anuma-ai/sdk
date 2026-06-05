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
 * Carriers for the legacy top-level mirrors: the chunk, its `portal` envelope,
 * and the wrapped-`response` variants of each. Exactly one is populated per
 * request, depending on whether the portal streamed incrementally or fell back
 * to a wrapped envelope. The chunk and wrapped `response` only ever carry the
 * legacy mirror fields at their top level, so the carrier type is narrowed to
 * `LegacyMirrorCarrier` — the raw chunk is never asserted to hold portal-only
 * fields (cost/credits/image_model/...), which it does not declare.
 */
function legacyMirrorCarriers(chunk: CompletionsStreamingChunk): LegacyMirrorCarrier[] {
  return [chunk, chunk.portal, chunk.response, chunk.response?.portal].filter(
    (carrier): carrier is LegacyMirrorCarrier => carrier !== undefined
  );
}

/**
 * Carriers for the portal-only fields (cost/credits, image_model, the
 * init/provider/pricing breakdown). These appear solely under a `portal`
 * envelope on the chunk or the wrapped `response`.
 */
function portalEnvelopes(chunk: CompletionsStreamingChunk): CompletionsPortalEnvelope[] {
  return [chunk.portal, chunk.response?.portal].filter(
    (carrier): carrier is CompletionsPortalEnvelope => carrier !== undefined
  );
}

/** Return the first carrier's value for `pick` that is not `undefined`. */
function firstPortalField<C, T>(carriers: C[], pick: (carrier: C) => T | undefined): T | undefined {
  for (const carrier of carriers) {
    const value = pick(carrier);
    if (value !== undefined) return value;
  }
  return undefined;
}

/**
 * Build a single-key object only when the value is present, so spreading the
 * result never introduces an `undefined`-valued key (which would defeat the
 * `Object.keys(...).length` presence checks downstream). Returns `{}` otherwise.
 */
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

    // Portal-specific request fields (image_model, conversation_id) live under
    // a `portal` envelope per the new OpenAI-compliant schema; only build the
    // envelope when there's at least one value to send.
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
      ...(maxOutputTokens !== undefined && { max_tokens: maxOutputTokens }),
      ...(tools && { tools }),
      ...(toolChoice && { tool_choice: toolChoice }),
      ...(portal && { portal }),
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
    // Portal-side fields arrive on different carriers (see the carrier helpers);
    // resolve each from whichever one the server populated.
    const legacyCarriers = legacyMirrorCarriers(typedChunk);
    const portalEnvs = portalEnvelopes(typedChunk);

    // Capture tools_checksum. Coerce an empty string to `undefined` so it
    // doesn't shadow a real checksum on a later carrier (mirrors the empty-array
    // skip for tool_call_events below) — `firstPortalField` stops at the first
    // non-undefined value, and the truthy guard would otherwise discard "".
    const checksumCandidate = firstPortalField(
      legacyCarriers,
      (c) => c.tools_checksum || undefined
    );
    if (checksumCandidate && !accumulator.toolsChecksum) {
      accumulator.toolsChecksum = checksumCandidate;
    }

    // Capture tool_call_events (skip empty arrays from early chunks).
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

    // Accumulate usage data. Per-chunk usage frames still carry `cost_micro_usd`
    // and `credits_used` inside `usage` (unchanged by the OpenAI-compliant
    // migration). The fallback envelope moves those to `portal`; merge both
    // sources so the accumulator's internal representation stays consistent.
    if (typedChunk.usage) {
      // Every field on the OpenAI usage frame is optional, and the portal may
      // emit more than one usage frame per stream (e.g. tokens in one, cost in
      // a later fallback). Spread every field conditionally so an omission in a
      // later frame never wipes a value an earlier frame already set, and so the
      // accumulator only ever holds fields that actually arrived (no
      // `undefined`-valued keys leaking into `buildFinalResponse`).
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
      };
    }
    // Image model resolved by the portal (rides only on the portal envelope).
    const portalImageModel = firstPortalField(portalEnvs, (c) => c.image_model || undefined);
    if (portalImageModel && !accumulator.imageModel) {
      accumulator.imageModel = portalImageModel;
    }

    // Cost/usage breakdown from the portal fallback envelope. The OpenAI-compliant
    // schema moved these out of the flat `usage` shape into `portal`; merge each
    // conditionally so a later frame's omission never wipes an earlier value.
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
        // Coerce "" to undefined so an empty value doesn't shadow a real
        // pricing_source on a later carrier (mirrors image_model / tools_checksum).
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
          // Only emit non-empty content to avoid false error detection.
          // NOTE: use `.length > 0` (not `.trim().length > 0`) so whitespace-only
          // deltas (`"\n\n"`, `"  \n"`, ` `) still reach onData. Stripping them
          // breaks live-streaming markdown: headings glue to the following
          // paragraph because the `\n\n` between them never reaches the client.
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
            // For non-streaming, we always emit the final content (reasoning is already separated).
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

    // Build the response in the new OpenAI-compliant shape (portal envelope +
    // OpenAI-only usage) AND also mirror the portal-side fields back onto the
    // top level / inside `usage`. The override on `LlmapiChatCompletionResponse`
    // in src/clientCompat.ts types both paths as optional, so SDK consumers can
    // keep reading the legacy locations (`response.tools_checksum`,
    // `response.usage.cost_micro_usd`, ...) while the wire shape stays
    // OpenAI-compliant for clients reading `response.portal.*`.
    // `accumulator.usage` only holds fields that actually arrived (the chunk
    // merge above spreads every field conditionally), so each presence check
    // below reflects a real value. Split the OpenAI token counts from the
    // portal-side cost/usage breakdown: tokens stay in `usage`, while the
    // breakdown is mirrored into BOTH `usage` (legacy `LlmapiChatCompletionUsage`
    // readers) and `portal` (the OpenAI-compliant location).
    const u = accumulator.usage;
    const tokenFields = {
      ...numberField("prompt_tokens", u.prompt_tokens),
      ...numberField("completion_tokens", u.completion_tokens),
      ...numberField("total_tokens", u.total_tokens),
    };
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
    const usage =
      Object.keys(tokenFields).length > 0 || hasUsageExtras
        ? { ...tokenFields, ...portalUsageExtras }
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
          finish_reason: toolCalls ? "tool_calls" : "stop",
        },
      ],
      ...(usage && { usage }),
      ...(portal && { portal }),
      // Legacy top-level mirrors — kept for SDK consumers that haven't migrated
      // to reading `response.portal.*` yet.
      //
      // TODO(deprecate-legacy-chat-completion-mirrors) [#548]: remove these
      // mirrors (and the corresponding optional top-level fields on the
      // LlmapiChatCompletionResponse override in src/clientCompat.ts) once the
      // next SDK MAJOR bump lands. Until then they ride alongside `portal` so a
      // minor bump doesn't break name-pinned readers. Deprecation steps:
      //   1. This release: emit both shapes (done); the read helpers in
      //      strategies/types.ts already prefer `portal`.
      //   2. Announce in CHANGELOG that top-level `tools_checksum` /
      //      `tool_call_events` and in-`usage` cost fields are deprecated.
      //   3. Next MAJOR: delete this block + the override's legacy fields;
      //      consumers read `response.portal.*` exclusively.
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
