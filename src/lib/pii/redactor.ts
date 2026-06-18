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

/** Escape a string for literal use inside a RegExp — category names are
 *  normally simple identifiers but a custom pattern could supply metacharacters. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  /**
   * Matches a numbered placeholder this redactor could mint — `[<category>_N]`
   * for one of its own active categories. Scoped to those categories so it
   * neither false-matches unrelated bracketed text (`[STEP_1]`) nor misses
   * custom / lowercase categories. Null only when there are no patterns.
   */
  private readonly residualPlaceholderPattern: RegExp | null;
  /**
   * Matches any placeholder-shaped token for this redactor's categories —
   * bracketed `[EMAIL_1]` OR bare `EMAIL_1`, case-insensitive — capturing the
   * body. Drives {@link restoreForStorage}: the extraction / consolidation
   * models echo placeholders mangled (brackets dropped, re-cased), and a single
   * pass with this matcher restores the assigned ones and flags the rest in one
   * go. Built from the (constant) category set; null only when there are none.
   */
  private readonly storagePattern: RegExp | null;
  /**
   * Cached body→value lookups for {@link restoreForStorage}, built lazily from
   * the assigned placeholders and invalidated on each mint. `exact` is keyed by
   * the literal body (collision-proof); `ci` by upper-cased body for re-cased
   * echoes, minus any `ciCollisions` where two distinct bodies share a form.
   */
  private storageLookup: {
    exact: Map<string, string>;
    ci: Map<string, string>;
    ciCollisions: Set<string>;
  } | null = null;
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
    const categories = [...new Set(this.patterns.map((p) => String(p.category)))];
    // Longest category first so a category that is a prefix of another can't
    // shadow it in the alternation.
    const categoryAlt = categories
      .slice()
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .join("|");
    this.residualPlaceholderPattern =
      categories.length > 0 ? new RegExp(`\\[(?:${categoryAlt})_\\d+\\]`) : null;
    // Storage-path matcher: bracketed `[EMAIL_1]` OR bare `EMAIL_1`, capturing
    // the body, case-insensitive, global. `\d+` (not a fixed body) so it spans
    // any index, and `\b` on the bare arm keeps it off prose like "email 1 of 3".
    this.storagePattern =
      categories.length > 0
        ? new RegExp(`\\[((?:${categoryAlt})_\\d+)\\]|\\b((?:${categoryAlt})_\\d+)\\b`, "gi")
        : null;
  }

  /**
   * True when `text` still contains a token shaped like a placeholder THIS
   * redactor could mint (`[EMAIL_1]`, `[passport_2]`, …).
   *
   * After {@link deAnonymize} restores every placeholder that was actually
   * assigned, such a residual token is one the model invented (never assigned
   * during redaction). Consumers persisting de-anonymized text use this to
   * reject the value rather than store an opaque `[SSN_1]` literal. Scoped to
   * this redactor's own categories — so legitimate bracketed text like
   * `[STEP_1]` is not misread, and custom/lowercase categories are covered.
   *
   * Exact (bracketed) only. The storage paths use {@link restoreForStorage},
   * which detects unresolved tokens during the restore pass over the ORIGINAL
   * text — so it tolerates bracket-dropped / re-cased echoes without re-scanning
   * a restored value (which would false-fire on a real value that happens to
   * contain a `<CATEGORY>_<n>` substring, e.g. the email `ssn_1@example.com`).
   */
  hasUnresolvedPlaceholder(text: string): boolean {
    return this.residualPlaceholderPattern?.test(text) ?? false;
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
    // A new placeholder joined the set — the cached storage lookup is now stale.
    this.storageLookup = null;
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
   *
   * Exact: matches the literal `[EMAIL_1]` form only. The storage paths use
   * {@link restoreForStorage} instead, which tolerates the mangled echoes the
   * extraction models produce.
   */
  deAnonymize(text: string): string {
    // Fast path: every placeholder is "[...]", so skip when there's no "[".
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
   * De-anonymize for PERSISTENCE (auto-extraction / consolidation), tolerant of
   * the ways the extraction models mangle a placeholder when echoing it back:
   * dropped brackets (`EMAIL_1`) and changed case (`email_1` / `Email_1`).
   *
   * Returns the restored text plus `unresolved` — true when a placeholder-shaped
   * token for one of this redactor's categories was NOT assigned during
   * redaction (a model hallucination, or an ambiguous re-cased collision).
   * Callers drop/degrade such facts so an opaque token never reaches the vault.
   *
   * One left-to-right pass over the ORIGINAL text. Two properties matter:
   * - a restored value is never re-scanned — so a real value that happens to
   *   contain a `<CATEGORY>_<n>` substring (e.g. the email `ssn_1@example.com`,
   *   or an API key containing `EMAIL_1`) is neither corrupted nor false-flagged;
   * - `unresolved` is derived from the lookup miss during this pass, not from a
   *   regex re-scan of the output — so it can't trip over a restored value.
   */
  restoreForStorage(text: string): { text: string; unresolved: boolean } {
    if (!this.storagePattern || this.placeholderToValue.size === 0) {
      return { text, unresolved: false };
    }
    this.storageLookup ??= this.buildStorageLookup();
    const { exact, ci, ciCollisions } = this.storageLookup;
    let unresolved = false;
    const restored = text.replace(
      this.storagePattern,
      (match: string, bracketed?: string, bare?: string) => {
        const body = bracketed ?? bare ?? "";
        // Exact-case body always resolves to its own value (collision-proof).
        const exactHit = exact.get(body);
        if (exactHit !== undefined) return exactHit;
        // Re-cased echo: resolve via upper-cased key only when unambiguous.
        const key = body.toUpperCase();
        if (!ciCollisions.has(key)) {
          const ciHit = ci.get(key);
          if (ciHit !== undefined) return ciHit;
        }
        // Placeholder-shaped but never assigned (hallucinated), or an ambiguous
        // re-cased collision: leave literal and tell the caller to drop it.
        unresolved = true;
        return match;
      }
    );
    return { text: restored, unresolved };
  }

  /**
   * Build the {@link restoreForStorage} body→value lookups from the assigned
   * placeholders. `exact` (literal body) is collision-proof; `ci` (upper-cased
   * body) handles re-cased echoes, except where two distinct bodies share an
   * upper-cased form — those are recorded in `ciCollisions` so a re-cased echo
   * of them is left unresolved rather than resolved to the wrong value.
   */
  private buildStorageLookup(): {
    exact: Map<string, string>;
    ci: Map<string, string>;
    ciCollisions: Set<string>;
  } {
    const exact = new Map<string, string>();
    const ci = new Map<string, string>();
    const ciCollisions = new Set<string>();
    for (const [placeholder, value] of this.placeholderToValue) {
      const body = placeholder.slice(1, -1);
      exact.set(body, value);
      const key = body.toUpperCase();
      if (ci.has(key) && ci.get(key) !== value) ciCollisions.add(key);
      else ci.set(key, value);
    }
    return { exact, ci, ciCollisions };
  }

  /**
   * Reset all state. Useful for testing or when starting a fresh conversation.
   */
  clear(): void {
    this.valueToPlaceholder.clear();
    this.placeholderToValue.clear();
    this.categoryCounters.clear();
    this.storageLookup = null;
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
