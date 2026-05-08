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
 * Returns messages to append to the conversation, or nothing to leave
 * the conversation unchanged. Thrown errors are caught by the tool loop
 * so a failing pre-processor does not abort the LLM request.
 */
export type PromptPreProcessor = (
  ctx: PromptPreProcessorContext
) => LlmapiMessage[] | void | Promise<LlmapiMessage[] | void>;
