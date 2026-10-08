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
 * Returns context messages to insert before the latest user message, or nothing to leave
 * the conversation unchanged. Thrown errors are caught by the tool loop
 * so a failing pre-processor does not abort the LLM request.
 */
export type PromptPreProcessor = (
  ctx: PromptPreProcessorContext
) => LlmapiMessage[] | void | Promise<LlmapiMessage[] | void>;

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
