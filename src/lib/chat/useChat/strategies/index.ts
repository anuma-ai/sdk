export type { ApiResponse, ApiStrategy, ApiType, BuildRequestBodyArgs } from "./types";
export { ResponsesStrategy } from "./responses";
export { CompletionsStrategy } from "./completions";

import type { ApiStrategy, ApiType } from "./types";
import { ResponsesStrategy } from "./responses";
import { CompletionsStrategy } from "./completions";

// Singleton instances for reuse
const responsesStrategy = new ResponsesStrategy();
const completionsStrategy = new CompletionsStrategy();

/**
 * Get the appropriate API strategy for the given type
 *
 * @param apiType - The API type to use ("responses" or "completions")
 * @returns The corresponding strategy instance
 *
 * @example
 * ```ts
 * const strategy = getStrategy("completions");
 * const body = strategy.buildRequestBody({ messages, model, stream: true });
 * ```
 */
export function getStrategy(apiType: ApiType = "responses"): ApiStrategy {
  switch (apiType) {
    case "completions":
      return completionsStrategy;
    case "responses":
    default:
      return responsesStrategy;
  }
}
