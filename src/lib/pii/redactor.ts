/**
 * PII redaction engine.
 *
 * Scans text for personally identifiable information, replaces matches with
 * tagged placeholders ([EMAIL_1], [PHONE_2], …), and maintains a mapping
 * table so the original values can be restored in LLM responses.
 *
 * One `PiiRedactor` instance should be used per conversation to keep
 * placeholder numbering consistent across turns.
 */

import type { LlmapiMessage, LlmapiMessageContentPart } from "../../client";
import { PII_PATTERNS, type PiiCategory, type PiiPattern } from "./patterns";

export interface PiiMatch {
  category: PiiCategory | (string & {});
  original: string;
  placeholder: string;
}

/**
 * Options for constructing a {@link PiiRedactor}. Lets apps disable noisy
 * built-in categories or supply their own detection patterns.
 */
export interface PiiRedactorOptions {
  /**
   * Replace the entire default pattern set. When set, `extraPatterns` and
   * `excludeCategories` are ignored. Order matters — more specific patterns
   * should come first (see {@link PII_PATTERNS}).
   */
  patterns?: PiiPattern[];
  /**
   * Additional patterns appended after the (optionally filtered) built-ins.
   * Ignored when `patterns` is provided.
   */
  extraPatterns?: PiiPattern[];
  /**
   * Built-in categories to disable, e.g. the higher-false-positive
   * `["US_ADDRESS", "DATE_OF_BIRTH"]`. Ignored when `patterns` is provided.
   */
  excludeCategories?: (PiiCategory | (string & {}))[];
}

export interface RedactionResult {
  /** The redacted text with placeholders. */
  text: string;
  /** Matches found in this redaction pass. */
  matches: PiiMatch[];
}

export interface MessageRedactionResult {
  /** Redacted messages (new array — originals are not mutated). */
  messages: LlmapiMessage[];
  /** All matches found across all messages. */
  matches: PiiMatch[];
}

/**
 * Matches the numbered placeholder shape `redactText` emits — `[EMAIL_1]`,
 * `[SSN_2]`, `[CREDIT_CARD_1]`, … — for the built-in (uppercase) categories.
 *
 * After {@link PiiRedactor.deAnonymize} restores every placeholder that was
 * actually assigned, any token still matching this shape is one the model
 * invented (never assigned during redaction). Consumers that persist
 * de-anonymized text use this to detect and reject such residue rather than
 * storing an opaque `[SSN_1]` literal. Non-global so `.test()` stays stateless.
 */
export const PII_PLACEHOLDER_PATTERN = /\[[A-Z][A-Z0-9_]*_\d+\]/;

/**
 * Stateful PII redactor that tracks placeholder assignments across multiple
 * calls. Create one per conversation so "[EMAIL_1]" always refers to the
 * same email address throughout the conversation.
 */
export class PiiRedactor {
  /** Maps original PII value → placeholder tag. */
  private valueToPlaceholder = new Map<string, string>();
  /** Maps placeholder tag → original PII value (reverse lookup for de-anonymization). */
  private placeholderToValue = new Map<string, string>();
  /** Next index per category for placeholder numbering. */
  private categoryCounters = new Map<string, number>();
  /** The active detection patterns (defaults, optionally filtered/extended). */
  private readonly patterns: PiiPattern[];
  /** Whether the non-text-content bypass warning has already been emitted. */
  private warnedNonText = false;

  constructor(options: PiiRedactorOptions = {}) {
    if (options.patterns) {
      this.patterns = options.patterns;
    } else {
      let base = PII_PATTERNS;
      if (options.excludeCategories?.length) {
        const excluded = new Set<string>(options.excludeCategories);
        base = base.filter((p) => !excluded.has(p.category));
      }
      this.patterns = options.extraPatterns ? [...base, ...options.extraPatterns] : base;
    }
  }

  /**
   * Returns the current number of unique PII values tracked.
   */
  get size(): number {
    return this.valueToPlaceholder.size;
  }

  /**
   * Returns a snapshot of all placeholder → original value mappings.
   * Useful for debugging or UI display. This is a copy — mutating it (or
   * later redactions) does not affect the returned map and vice versa.
   */
  getMappings(): ReadonlyMap<string, string> {
    return new Map(this.placeholderToValue);
  }

  /**
   * Get or create a placeholder for a PII value.
   * The same value always gets the same placeholder within a redactor instance.
   */
  private getPlaceholder(category: PiiCategory | (string & {}), value: string): string {
    const normalizedValue = value.trim();
    const existing = this.valueToPlaceholder.get(normalizedValue);
    if (existing) return existing;

    const count = (this.categoryCounters.get(category) ?? 0) + 1;
    this.categoryCounters.set(category, count);

    const placeholder = `[${category}_${count}]`;
    this.valueToPlaceholder.set(normalizedValue, placeholder);
    this.placeholderToValue.set(placeholder, normalizedValue);
    return placeholder;
  }

  /**
   * Scan text for PII and rebuild it, replacing each match with whatever
   * `makeReplacement(category, value)` returns. Shared by `redactText`
   * (numbered, stateful placeholders) and `maskText` (unnumbered, stateless).
   */
  private scan(
    text: string,
    makeReplacement: (category: PiiCategory | (string & {}), value: string) => string
  ): RedactionResult {
    const matches: PiiMatch[] = [];
    let redacted = text;

    for (const pattern of this.patterns) {
      // Clone regex to reset lastIndex
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      const found: { match: string; index: number }[] = [];

      let m: RegExpExecArray | null;
      while ((m = regex.exec(redacted)) !== null) {
        const value = m[0];
        if (pattern.validate && !pattern.validate(value)) continue;
        if (pattern.context) {
          // Check a short preceding window for a required cue word. Uses a
          // window slice (not a lookbehind) for engine portability.
          const before = redacted.slice(Math.max(0, m.index - 40), m.index);
          if (!pattern.context.test(before)) continue;
        }
        found.push({ match: value, index: m.index });
      }

      if (found.length === 0) continue;

      // Rebuild the string in a single pass. `found` is non-overlapping and
      // ascending (global regex advances lastIndex past each match), so a
      // cursor walk is O(text length) rather than O(matches × text length).
      let result = "";
      let cursor = 0;
      for (const { match, index } of found) {
        const placeholder = makeReplacement(pattern.category, match);
        matches.push({ category: pattern.category, original: match, placeholder });
        result += redacted.slice(cursor, index) + placeholder;
        cursor = index + match.length;
      }
      result += redacted.slice(cursor);
      redacted = result;
    }

    return { text: redacted, matches };
  }

  /**
   * Scan and redact PII from a single text string, using numbered, reversible
   * placeholders ([EMAIL_1], …) tracked on this instance.
   */
  redactText(text: string): RedactionResult {
    return this.scan(text, (category, value) => this.getPlaceholder(category, value));
  }

  /**
   * Mask PII with unnumbered, NON-reversible tokens ([EMAIL], [SSN], …) without
   * mutating this instance's state. Use for one-way purposes where the value is
   * never restored — notably embedding inputs: it keeps real PII off the
   * embeddings endpoint while staying deterministic, so the same content always
   * masks identically and search stays consistent across conversations.
   */
  maskText(text: string): string {
    return this.scan(text, (category) => `[${category}]`).text;
  }

  /**
   * Redact PII from an array of LlmapiMessage objects.
   * Returns new message objects — originals are not mutated.
   *
   * All roles' text content is redacted, not just user/system: tool results
   * can return PII fetched from external systems, and assistant history is
   * persisted with original (de-anonymized) values, so both must be re-redacted
   * before they go back over the wire. Placeholders the model already emitted
   * are inert here (they don't match any PII pattern), so re-redaction is safe.
   */
  redactMessages(messages: LlmapiMessage[]): MessageRedactionResult {
    const allMatches: PiiMatch[] = [];

    const redactedMessages = messages.map((msg) => {
      if (!msg.content) return msg;

      const newContent: LlmapiMessageContentPart[] = msg.content.map((part) => {
        if (part.type === "text" && part.text) {
          const result = this.redactText(part.text);
          allMatches.push(...result.matches);
          if (result.matches.length > 0) {
            return { ...part, text: result.text };
          }
        } else if (part.type !== "text") {
          // Non-text parts (images, files, attachments) are not scanned. Warn
          // once so callers know PII in those payloads is not redacted.
          this.warnNonTextBypass();
        }
        return part;
      });

      return { ...msg, content: newContent };
    });

    return { messages: redactedMessages, matches: allMatches };
  }

  /** Emit the non-text bypass warning at most once per redactor instance. */
  private warnNonTextBypass(): void {
    if (this.warnedNonText) return;
    this.warnedNonText = true;
    console.warn(
      "[PiiRedactor] A message contains non-text content (images, files, or " +
        "attachments) that is NOT scanned for PII — only text parts are redacted."
    );
  }

  /**
   * Restore original PII values in text that contains placeholders.
   * Used to de-anonymize LLM responses before displaying to the user.
   */
  deAnonymize(text: string): string {
    // Fast path: every placeholder starts with "[", so text without one
    // cannot contain any placeholder.
    if (!text.includes("[")) return text;
    let restored = text;
    for (const [placeholder, original] of this.placeholderToValue) {
      if (restored.includes(placeholder)) {
        // split/join replaces every occurrence in a single pass and, unlike
        // String.replace with a string pattern, does not interpret "$"
        // sequences in the original value as replacement specials.
        restored = restored.split(placeholder).join(original);
      }
    }
    return restored;
  }

  /**
   * Reset all state. Useful for testing or when starting a fresh conversation.
   */
  clear(): void {
    this.valueToPlaceholder.clear();
    this.placeholderToValue.clear();
    this.categoryCounters.clear();
    this.warnedNonText = false;
  }
}

/**
 * Structural (duck-typed) check for a {@link PiiRedactor}. Used instead of
 * `instanceof` because dual ESM/CJS packaging or an SSR/client boundary can
 * produce a redactor from a *duplicate* class copy, for which `instanceof`
 * silently returns false — the worst failure mode for a privacy feature.
 */
export function isPiiRedactor(value: unknown): value is PiiRedactor {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as PiiRedactor).redactMessages === "function" &&
    typeof (value as PiiRedactor).deAnonymize === "function"
  );
}

/**
 * Resolve a `piiRedaction` option (`true` | `false` | `PiiRedactor`) into a
 * redactor instance or `undefined`. `true` creates a fresh redactor; a
 * redactor-like value is used as-is. Any other truthy value is a programming
 * error: it warns loudly and disables redaction rather than failing silently.
 */
export function resolvePiiRedactor(
  piiRedaction: boolean | PiiRedactor | undefined
): PiiRedactor | undefined {
  if (piiRedaction === true) return new PiiRedactor();
  if (!piiRedaction) return undefined; // false / null / undefined
  if (isPiiRedactor(piiRedaction)) return piiRedaction;
  console.warn(
    "[PiiRedactor] `piiRedaction` is neither `true` nor a PiiRedactor instance; " +
      "PII redaction is DISABLED for this request."
  );
  return undefined;
}

/**
 * Wraps an output sink so a streamed sequence of chunks is de-anonymized
 * correctly even when a placeholder ("[EMAIL_1]") is split across chunk
 * boundaries — which happens routinely because the stream smoother emits text
 * a few characters at a time.
 *
 * Each `push` emits everything that is safe to restore now and holds back any
 * trailing fragment that could be the start of a placeholder ("[", optionally
 * followed by placeholder-body characters) until it completes. Call `flush`
 * when the stream ends to emit whatever remains.
 */
export function createStreamingDeAnonymizer(
  redactor: PiiRedactor,
  emit: (chunk: string) => void
): { push: (chunk: string) => void; flush: () => void } {
  let buffer = "";
  // A "[" followed by zero or more placeholder-body chars, anchored to the end
  // of the buffer — i.e. a possibly-incomplete placeholder to hold back.
  const trailingFragment = /\[[A-Za-z0-9_]*$/;
  return {
    push(chunk: string): void {
      if (!chunk) return;
      buffer += chunk;
      const m = buffer.match(trailingFragment);
      if (!m || m.index === undefined) {
        // No trailing fragment — the whole buffer is safe to restore.
        emit(redactor.deAnonymize(buffer));
        buffer = "";
      } else if (m.index > 0) {
        // Emit the safe prefix; keep the trailing fragment for the next push.
        emit(redactor.deAnonymize(buffer.slice(0, m.index)));
        buffer = buffer.slice(m.index);
      }
      // m.index === 0: the entire buffer is a potential placeholder — hold it.
    },
    flush(): void {
      if (buffer) {
        emit(redactor.deAnonymize(buffer));
        buffer = "";
      }
    },
  };
}
