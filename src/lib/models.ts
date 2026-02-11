/**
 * Get a friendly model name for display in conversation history.
 * Maps model IDs to user-friendly provider names.
 */
export function getFriendlyModelName(model?: string): string {
  if (!model) return "AI";

  const modelLower = model.toLowerCase();

  // Pattern-based matching for common providers
  const patterns: [string[], string][] = [
    [["grok"], "Grok"],
    [["claude", "anthropic"], "Claude"],
    [["gpt", "openai"], "GPT"],
    [["gemini"], "Gemini"],
    [["cerebras", "fireworks", "kimi"], "Anuma"],
    [["dall-e"], "DALL-E"],
  ];

  const match = patterns.find(([keywords]) =>
    keywords.some((k) => modelLower.includes(k))
  );

  return match?.[1] ?? "AI";
}
