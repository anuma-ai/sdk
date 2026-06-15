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
import { type PiiCategory, type PiiPattern, PII_PATTERNS } from "./patterns";

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
   * Scan and redact PII from a single text string.
   */
  redactText(text: string): RedactionResult {
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
        const placeholder = this.getPlaceholder(pattern.category, match);
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
   * Redact PII from an array of LlmapiMessage objects.
   * Returns new message objects — originals are not mutated.
   */
  redactMessages(messages: LlmapiMessage[]): MessageRedactionResult {
    const allMatches: PiiMatch[] = [];

    const redactedMessages = messages.map((msg) => {
      // Only redact user and system messages — don't touch assistant or tool responses
      if (msg.role !== "user" && msg.role !== "system") {
        return msg;
      }

      if (!msg.content) return msg;

      const newContent: LlmapiMessageContentPart[] = msg.content.map((part) => {
        if (part.type === "text" && part.text) {
          const result = this.redactText(part.text);
          allMatches.push(...result.matches);
          if (result.matches.length > 0) {
            return { ...part, text: result.text };
          }
        }
        return part;
      });

      return { ...msg, content: newContent };
    });

    return { messages: redactedMessages, matches: allMatches };
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
  }
}
