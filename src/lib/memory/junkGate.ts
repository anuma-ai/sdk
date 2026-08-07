/**
 * Shared junk gate — the single low-signal content filter for every memory
 * write path (auto-extraction, the `memory_vault_save` tool, and any future
 * retain() caller). It ALSO drives the consolidation sweep's junk purge
 * (soft-delete of existing rows), so a false-positive here retroactively
 * deletes real data — hence the deliberately conservative rules below.
 *
 * Having ONE gate is the point: before this, the extraction path rejected
 * scraps but the model's tool-create path did not, so junk like "1"/"2"/"3"
 * (and bare punctuation) could enter the vault only through the tool. Routing
 * both paths through the same predicate closes that gap.
 *
 * Language-agnostic by design. It must never drop a valid CJK-language fact —
 * Japanese/Chinese/Korean put no spaces between words and pack a whole word
 * into 1–2 characters — nor a legit one-word fact ("Vegan", "Left-handed"), nor
 * a legit numeric fact that carries structure ("555-1234", "2024"). It rejects
 * only genuinely content-free input: too-short strings, pure punctuation, and
 * short bare integers ("1", "42") that are list-index / rating / rank noise.
 */

/**
 * Minimum normalized length (after trimming and stripping trailing `.!?`)
 * for a Latin/other-script memory to be considered durable. Shared with the
 * auto-extraction gate (via {@link isJunkMemoryContent}) so the tool and the
 * extractor reject identically. CJK content uses a lower floor (see below).
 */
export const MIN_CONTENT_LENGTH = 3;

/**
 * A CJK / ideographic character (Han, Hiragana, Katakana, Hangul). These scripts
 * are dense — a 2-character string like "独身" (single) or "既婚" (married) is a
 * complete durable fact — so the generic {@link MIN_CONTENT_LENGTH} floor would
 * wrongly drop it. When an ideograph is present we lower the length floor to 2.
 */
const CJK_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

/** A purely-numeric token — digits only, no letter, punctuation or separator. */
const PURE_DIGITS_RE = /^\d+$/;

/**
 * True when `content` is too low-signal to be a durable memory, i.e. it should
 * NOT be written to the vault.
 *
 * Normalizes exactly like the extraction gate did (trim + strip trailing
 * sentence punctuation), then rejects when ANY of these hold:
 *
 * 1. **Too short.** Below the length floor — {@link MIN_CONTENT_LENGTH} (3) for
 *    Latin/other scripts, or 2 when the string contains a CJK/ideographic
 *    character (a 2-char kanji word is a full fact). So "cat"/"独身" pass; "hi"
 *    is rejected.
 * 2. **Pure punctuation / symbols.** No letter AND no digit anywhere
 *    (`!/[\p{L}\p{N}]/u`). Rejects "---" and "  .." while letting anything with
 *    a letter or a digit through — so "555-1234", "2024" and a postcode survive.
 * 3. **Short bare integer.** A purely-digit token of length ≤ 3 ("1", "2", "42",
 *    "999"). These are overwhelmingly list-index / rating / rank scraps — the
 *    exact junk the model smuggled in before the shared gate existed. A 4+ digit
 *    run is allowed because it is far more likely a meaningful number (a year
 *    like "2024", a PIN, a house number). Trade-off: a genuine 1–3 digit fact is
 *    rare and reads better re-stated with context, so we bias toward rejecting
 *    bare short integers. Mixed digit+punctuation ("555-1234") is NOT purely
 *    numeric and passes.
 *
 * Deliberately NO "single token / no whitespace" heuristic — that was an
 * English-only signal that silently dropped every CJK fact and killed legit
 * one-word facts.
 */
export function isJunkMemoryContent(content: string): boolean {
  const normalized = content.trim().replace(/[.!?]+$/, "");

  // (1) Length floor — lower for CJK (a 2-char ideographic string is a word).
  const minLength = CJK_RE.test(normalized) ? 2 : MIN_CONTENT_LENGTH;
  if (normalized.length < minLength) return true;

  // (2) Pure punctuation / symbols — no letter and no digit anywhere.
  if (!/[\p{L}\p{N}]/u.test(normalized)) return true;

  // (3) Short bare integer — list-index / rating / rank noise. 4+ digits are
  // kept (year / PIN / house number are meaningful).
  if (PURE_DIGITS_RE.test(normalized) && normalized.length <= 3) return true;

  return false;
}
