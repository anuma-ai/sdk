/**
 * Shared junk gate — the single low-signal content filter for every memory
 * write path (auto-extraction, the `memory_vault_save` tool, and any future
 * retain() caller).
 *
 * Having ONE gate is the point: before this, the extraction path rejected
 * scraps but the model's tool-create path did not, so junk like "1"/"2"/"3"
 * (and bare punctuation) could enter the vault only through the tool. Routing
 * both paths through the same predicate closes that gap.
 *
 * Language-agnostic by design. It must never drop a valid CJK-language fact —
 * Japanese/Chinese put no spaces between words — nor a legit one-word fact
 * ("Vegan", "Left-handed"). It rejects only genuinely content-free input:
 * too-short strings, and strings with no letter/ideograph at all ("1", "42",
 * "---", "  ..").
 */

/**
 * Minimum normalized length (after trimming and stripping trailing `.!?`)
 * for a memory to be considered durable. Shared with the auto-extraction gate
 * (via {@link isJunkMemoryContent}) so the tool and the extractor reject
 * identically.
 */
export const MIN_CONTENT_LENGTH = 3;

/**
 * True when `content` is too short or carries no letter/ideograph to be a
 * durable memory, i.e. it should NOT be written to the vault.
 *
 * Normalizes exactly like the extraction gate did (trim + strip trailing
 * sentence punctuation), then rejects when either:
 * - the normalized length is below {@link MIN_CONTENT_LENGTH}, or
 * - it contains no Unicode letter. `\p{L}` matches Latin AND CJK/ideographic
 *   scripts, so "菜食主義" passes while "1", "42", and "---" are rejected.
 *
 * Deliberately NO "single token / no whitespace" heuristic — that was an
 * English-only signal that silently dropped every CJK fact and killed legit
 * one-word facts.
 */
export function isJunkMemoryContent(content: string): boolean {
  const normalized = content.trim().replace(/[.!?]+$/, "");
  if (normalized.length < MIN_CONTENT_LENGTH) return true;
  // No letter or ideograph anywhere → pure digits / punctuation / symbols.
  if (!/\p{L}/u.test(normalized)) return true;
  return false;
}
