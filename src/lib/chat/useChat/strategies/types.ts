import type {
  LlmapiChatCompletionResponse,
  LlmapiChatCompletionTool,
  LlmapiMessage,
  LlmapiResponseReasoning,
  LlmapiResponseResponse,
  LlmapiThinkingOptions,
  LlmapiToolCallEvent,
} from "../../../../client";
import type { StreamAccumulator } from "../types";
import type { ProcessChunkResult } from "../utils";

/**
 * API type selector for useChat
 * - "auto": automatically selects the best API based on the model's known support
 * - "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
 * - "completions": OpenAI Chat Completions API (wider model compatibility)
 */
export type ApiType = "auto" | "responses" | "completions";

/**
 * Union type for API responses - raw pass-through from server.
 * Responses API returns LlmapiResponseResponse (with output[]).
 * Completions API returns LlmapiChatCompletionResponse (with choices[]).
 */
export type ApiResponse = LlmapiResponseResponse | LlmapiChatCompletionResponse;

/**
 * Arguments for building API request body
 */
export interface BuildRequestBodyArgs {
  messages: LlmapiMessage[];
  model: string;
  stream: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  tools?: LlmapiChatCompletionTool[];
  toolChoice?: string;
  // Responses-only options (ignored by completions strategy)
  reasoning?: LlmapiResponseReasoning;
  thinking?: LlmapiThinkingOptions;
  imageModel?: string;
  /** Groups requests belonging to the same conversation for observability. Pass-through only — not forwarded to the LLM provider. */
  conversationId?: string;
}

/**
 * Discriminator used to route portal-field extraction below.
 *
 * We identify the *Responses API* positively and default everything else to
 * Chat Completions, rather than keying on `choices`. Two reasons:
 *
 *  - A chat-completion error/empty envelope can arrive without a `choices`
 *    array; keying on `"choices" in r` would misclassify it as Responses.
 *  - The Chat Completions extraction branches all fall back from `portal` to
 *    the legacy top-level paths (`r.portal?.x ?? r.x`), so they read correctly
 *    for *both* shapes. The Responses branch reads only top-level / `output[]`.
 *    Defaulting to Chat Completions is therefore the safe choice: a
 *    misclassified Responses response still resolves via the fallback, whereas
 *    a misclassified chat completion would silently drop its `portal` data.
 *
 * The Responses API is identified by `object === "response"` (canonical OpenAI
 * discriminator) or, when `object` is absent on SDK-built responses, by the
 * presence of an `output` array — which only the Responses shape carries.
 */
function isChatCompletionResponse(r: ApiResponse): r is LlmapiChatCompletionResponse {
  if (r.object === "response") return false;
  if (Array.isArray((r as { output?: unknown }).output)) return false;
  return true;
}

/**
 * Portal-side fields live under `response.portal` for the Chat Completions API
 * (new OpenAI-compliant wire shape) and at the top level for the Responses API.
 *
 * The SDK's `buildFinalResponse` mirrors portal fields back onto the top level
 * (and into `usage`) for backwards compatibility, so for streaming chat
 * completions both paths carry the data. For non-streaming chat completions
 * the wire ships only the portal-nested form.
 *
 * Precedence is per *field*, not per object: `portal?.x ?? legacy.x` reads the
 * portal field when it is non-nullish and otherwise falls through to the legacy
 * location — so a present-but-partial `portal` (e.g. checksum set, cost unset)
 * still resolves each field from wherever it actually carries a value.
 */
export function getToolCallEvents(r: ApiResponse): LlmapiToolCallEvent[] | undefined {
  if (isChatCompletionResponse(r)) {
    return r.portal?.tool_call_events ?? r.tool_call_events;
  }
  return r.tool_call_events;
}

export function getToolsChecksum(r: ApiResponse): string | undefined {
  if (isChatCompletionResponse(r)) {
    return r.portal?.tools_checksum ?? r.tools_checksum;
  }
  return r.tools_checksum;
}

export function getCostMicroUsd(r: ApiResponse): number | undefined {
  if (isChatCompletionResponse(r)) {
    return r.portal?.cost_micro_usd ?? r.usage?.cost_micro_usd;
  }
  return r.usage?.cost_micro_usd;
}

export function getCreditsUsed(r: ApiResponse): number | undefined {
  if (isChatCompletionResponse(r)) {
    return r.portal?.credits_used ?? r.usage?.credits_used;
  }
  return r.usage?.credits_used;
}

/**
 * Image model the portal resolved for the request (set when an image-generation
 * tool ran). Chat Completions ships it under `portal.image_model` with a legacy
 * top-level mirror; the Responses API keeps it at the top level.
 */
export function getImageModel(r: ApiResponse): string | undefined {
  if (isChatCompletionResponse(r)) {
    return r.portal?.image_model ?? r.image_model;
  }
  return r.image_model;
}

/**
 * Pull the assistant's message text (and reasoning text, if present) out of
 * either response shape. Chat Completions ships content under
 * `choices[0].message.content` (string, or the legacy `[{ text }]` array);
 * Responses API ships it under `output[]` items keyed by `type`.
 *
 * Used by the abort/wasStopped paths in useChatStorage so partial streamed
 * text is persisted regardless of which API produced it.
 */
export function extractAssistantText(r: ApiResponse): {
  content: string;
  thinking?: string;
} {
  if (isChatCompletionResponse(r)) {
    const raw = r.choices?.[0]?.message?.content as
      | string
      | Array<{ text?: string }>
      | undefined
      | null;
    let content = "";
    if (typeof raw === "string") {
      content = raw;
    } else if (Array.isArray(raw)) {
      content = raw.map((part) => part.text || "").join("");
    }
    return { content };
  }
  type OutputItem = { type?: string; content?: Array<{ text?: string }> };
  const output = ((r as { output?: OutputItem[] }).output ?? []).filter(Boolean);
  const message = output.find((item) => item?.type === "message");
  const content = message?.content?.map((part) => part.text || "").join("") || "";
  const reasoning = output.find((item) => item?.type === "reasoning");
  const thinking = reasoning?.content?.map((part) => part.text || "").join("") || undefined;
  return { content, thinking };
}

/**
 * Return a copy of `r` with any pending tool-call payload removed.
 *
 * `resumeStream` accepts no tools, so a tool-request terminal is finalized as an
 * interrupted/stopped message. But `buildFinalResponse` still emits the
 * accumulated tool call (a `function_call` item for the Responses shape, a
 * `choices[].message.tool_calls` array for Completions). Persisting that dangling
 * call into history — or returning it to a caller that re-stores `data` — yields
 * an orphaned tool_call with no matching tool_result, which many providers reject
 * (or the model hallucinates around) on the next turn. Stripping it here keeps the
 * stopped row to content/thinking only, matching how `extractAssistantText`
 * already ignores tool items.
 */
export function stripToolCalls(r: ApiResponse): ApiResponse {
  if (isChatCompletionResponse(r)) {
    if (!r.choices?.some((c) => c?.message?.tool_calls)) return r;
    return {
      ...r,
      choices: r.choices.map((c) =>
        c?.message?.tool_calls ? { ...c, message: { ...c.message, tool_calls: undefined } } : c
      ),
    };
  }
  const output = (r as { output?: Array<{ type?: string }> }).output;
  if (!Array.isArray(output) || !output.some((item) => item?.type === "function_call")) {
    return r;
  }
  return {
    ...r,
    output: output.filter((item) => item?.type !== "function_call"),
  } as ApiResponse;
}

/**
 * Strategy interface for different LLM API backends.
 * Implementations handle request building, stream parsing, and response normalization.
 */
export interface ApiStrategy {
  /**
   * The API endpoint path (e.g., "/api/v1/responses" or "/api/v1/chat/completions")
   */
  readonly endpoint: string;

  /**
   * Build the request body for the API call
   */
  buildRequestBody(args: BuildRequestBodyArgs): Record<string, unknown>;

  /**
   * Process a streaming chunk and update the accumulator
   * Returns content and thinking deltas if present
   */
  processStreamChunk(chunk: unknown, accumulator: StreamAccumulator): ProcessChunkResult;

  /**
   * Build the final response from accumulated stream data.
   * Returns raw API format (Responses API or Completions API structure).
   */
  buildFinalResponse(accumulator: StreamAccumulator): ApiResponse;
}
