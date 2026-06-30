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
import { PII_PATTERNS, type PiiCategory } from "./patterns";

export interface PiiMatch {
  category: PiiCategory;
  original: string;
  placeholder: string;
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
  private categoryCounters = new Map<PiiCategory, number>();

  /**
   * Returns the current number of unique PII values tracked.
   */
  get size(): number {
    return this.valueToPlaceholder.size;
  }

  /**
   * Returns a snapshot of all placeholder → original value mappings.
   * Useful for debugging or UI display.
   */
  getMappings(): ReadonlyMap<string, string> {
    return this.placeholderToValue;
  }

  /**
   * Get or create a placeholder for a PII value.
   * The same value always gets the same placeholder within a redactor instance.
   */
  private getPlaceholder(category: PiiCategory, value: string): string {
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

    for (const pattern of PII_PATTERNS) {
      // Clone regex to reset lastIndex
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      const found: { match: string; index: number }[] = [];

      let m: RegExpExecArray | null;
      while ((m = regex.exec(redacted)) !== null) {
        const value = m[0];
        if (pattern.validate && !pattern.validate(value)) continue;
        if (pattern.requireContextBefore) {
          const before = redacted.slice(Math.max(0, m.index - 32), m.index);
          if (!pattern.requireContextBefore.test(before)) continue;
        }
        found.push({ match: value, index: m.index });
      }

      // Replace forward, adjusting indices as we go
      let offset = 0;
      for (const { match, index } of found) {
        const adjustedIndex = index + offset;
        const placeholder = this.getPlaceholder(pattern.category, match);
        matches.push({ category: pattern.category, original: match, placeholder });
        redacted =
          redacted.slice(0, adjustedIndex) +
          placeholder +
          redacted.slice(adjustedIndex + match.length);
        offset += placeholder.length - match.length;
      }
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
      // Assistant responses stay user-visible; outbound user/system/tool payloads go to the provider.
      if (msg.role !== "user" && msg.role !== "system" && msg.role !== "tool") {
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
    let restored = text;
    for (const [placeholder, original] of this.placeholderToValue) {
      // Replace all occurrences of the placeholder
      while (restored.includes(placeholder)) {
        restored = restored.replace(placeholder, original);
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
