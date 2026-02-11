/**
 * Get a friendly model name for display in conversation history.
 * Maps model IDs to user-friendly provider names.
 *
 * Model format: "provider/model-name" (e.g., "openai/gpt-5.2", "cerebras/gpt-oss-120b")
 */
export function getFriendlyModelName(model?: string): string {
  if (!model) return "AI";

  const modelLower = model.toLowerCase();

  // Extract provider prefix (before first "/")
  const provider = modelLower.split("/")[0];

  // Map provider prefixes to friendly names
  const providerMap: Record<string, string> = {
    openai: "GPT",
    anthropic: "Claude",
    gemini: "Gemini",
    grok: "Grok",
    cerebras: "Anuma",
    fireworks: "Anuma",
  };

  if (provider && providerMap[provider]) {
    return providerMap[provider];
  }

  // Fallback: check for keywords in the full model string
  if (modelLower.includes("dall-e")) return "DALL-E";
  if (modelLower.includes("grok")) return "Grok";
  if (modelLower.includes("claude")) return "Claude";
  if (modelLower.includes("gemini")) return "Gemini";

  return "AI";
}
