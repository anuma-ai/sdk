export type { ApiResponse, ApiType } from "./types";
// getCostMicroUsd / getCreditsUsed are intentionally NOT re-exported here:
// their only non-test consumer is the db layer (convertUsageToStored), which
// imports them straight from "./types" to avoid pulling the strategy
// singletons created in this barrel into the storage layer.
export { extractAssistantText, getImageModel, getToolCallEvents, getToolsChecksum } from "./types";

import { CompletionsStrategy } from "./completions";
import { getApiTypeForModel } from "./modelApiSupport";
import { ResponsesStrategy } from "./responses";
import type { ApiStrategy, ApiType } from "./types";

// Singleton instances for reuse
const responsesStrategy = new ResponsesStrategy();
const completionsStrategy = new CompletionsStrategy();

/**
 * Resolves the effective API type for a model.
 *
 * When `apiType` is `"auto"` (the default), the model is looked up in the
 * generated support map and the best endpoint is picked automatically.
 * Explicit `"responses"` or `"completions"` values are returned as-is.
 */
export function resolveApiType(
  apiType: ApiType = "auto",
  model?: string
): "responses" | "completions" {
  if (apiType !== "auto") return apiType;
  return model ? getApiTypeForModel(model) : "responses";
}

/**
 * Get the appropriate API strategy for the given type
 *
 * @param apiType - The resolved API type ("responses" or "completions"). Must not be "auto" — call `resolveApiType` first.
 * @returns The corresponding strategy instance
 */
export function getStrategy(apiType: "responses" | "completions" = "responses"): ApiStrategy {
  switch (apiType) {
    case "completions":
      return completionsStrategy;
    case "responses":
    default:
      return responsesStrategy;
  }
}
