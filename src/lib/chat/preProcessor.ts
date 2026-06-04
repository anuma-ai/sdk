/**
 * Prompt pre-processors run after the last user message is received but
 * before the first LLM request. Each pre-processor gets the prompt text
 * and a shared embedding (computed once per request) and can return
 * additional messages to enrich the conversation.
 *
 * Typical uses: classify-then-fetch flows (web search, weather, stocks),
 * retrieval augmentation, rule-based context injection.
 */

import type { LlmapiMessage } from "../../client";

export type PromptPreProcessorContext = {
  /** Text of the last user message. */
  prompt: string;
  /** Embedding of `prompt`, computed once and shared across pre-processors. */
  embedding: number[];
  /** Abort signal forwarded from the tool loop. */
  signal?: AbortSignal;
};

/**
 * Optional UI artifact a pre-processor may emit alongside its enrichment
 * messages. The SDK does not interpret `payload` — it surfaces the artifact
 * via the `onPreProcessorArtifact` callback (pre-LLM render) and on
 * `RunToolLoopResult.preProcessorArtifacts` (post-stream / persistence).
 *
 * Renderers on the consumer side route by `type` and dedupe by `(type, key)`.
 */
export type PreProcessorArtifact = {
  /**
   * Open string. Well-known (built-in) types: `"weather"`, `"crypto_chart"`,
   * `"stock_chart"`, `"search_citations"`. Consumers route known types to
   * renderers and ignore unknown ones.
   *
   * **Namespacing convention**: built-in types are unprefixed. Third-party
   * and custom emitters SHOULD use a reverse-DNS-style prefix to avoid
   * collisions with future built-ins or other emitters — e.g.
   * `"com.myorg.calendar_event"` or `"acme.contact_card"`. Renderers route
   * by exact string match, so a third-party `"weather"` would collide with
   * the built-in and the user-facing card would route to whichever renderer
   * the consumer registered last.
   */
  type: string;
  /**
   * Renderer-specific payload. Must be JSON-serializable. Wrappers are
   * responsible for trimming to under 10KB after `JSON.stringify` before
   * emitting — the SDK does not enforce or trim, but emits a console
   * warning at the `runPreProcessors` boundary so oversized payloads
   * surface during development.
   */
  payload: unknown;
  /**
   * Dedupe key — consumers skip re-rendering the same `(type, key)` tuple
   * inside a single response. Optional; omit when the artifact has no
   * natural collision dimension.
   */
  key?: string;
};

/**
 * Pre-processor return shape that carries UI artifacts alongside the
 * conversation enrichment messages. The runtime appends `messages` to the
 * LLM request and surfaces `artifacts` via `onPreProcessorArtifact` plus
 * the final result.
 *
 * Use this shape from a pre-processor (or a built-in `fetch*Data` callback)
 * when you want to render a UI card without making the LLM follow up with
 * a `display_*` tool call. Returning a plain `LlmapiMessage[]` from a
 * pre-processor remains valid for the text-only case.
 */
export type EnrichedPreProcessorResult = {
  /** Enrichment messages appended to the LLM request. May be empty when the
   *  artifact is the only payload. */
  messages: LlmapiMessage[];
  /** UI artifacts to surface to the consumer. Order is preserved. */
  artifacts?: PreProcessorArtifact[];
};

/**
 * Returns messages to append to the conversation, an enriched
 * `{ messages, artifacts }` result, or nothing to leave the conversation
 * unchanged. Thrown errors are caught by the tool loop so a failing
 * pre-processor does not abort the LLM request.
 */
export type PromptPreProcessor = (
  ctx: PromptPreProcessorContext
) =>
  | LlmapiMessage[]
  | EnrichedPreProcessorResult
  | void
  | Promise<LlmapiMessage[] | EnrichedPreProcessorResult | void>;

/**
 * Wrap a pre-processor's fetch-result string in a single `LlmapiMessage`
 * with the given prefix. Used by the built-in pre-processor factories
 * (web-search, crypto-price, stock-price, weather) to keep the message
 * shape consistent. Returns an empty array if `text` is empty or
 * whitespace-only — callers can spread it into a result or return it
 * directly and the tool loop will treat it as "no injection".
 */
export function wrapAsUserText(prefix: string, text: string): LlmapiMessage[] {
  if (!text || !text.trim()) return [];
  return [{ role: "user", content: [{ type: "text", text: `${prefix}\n${text}` }] }];
}

/**
 * Internal type-guard for `EnrichedPreProcessorResult`. Exported for the
 * tool loop and the `runPreProcessors` helper.
 */
export function isEnrichedPreProcessorResult(value: unknown): value is EnrichedPreProcessorResult {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "messages" in value &&
    Array.isArray((value as { messages: unknown }).messages)
  );
}
