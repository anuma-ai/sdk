/**
 * PII detection patterns for structured data types.
 *
 * Each pattern has a category (used for placeholder tags like [EMAIL_1]),
 * a regex, and an optional validator for reducing false positives.
 */

export type PiiCategory =
  | "EMAIL"
  | "PHONE"
  | "SSN"
  | "CREDIT_CARD"
  | "IP_ADDRESS"
  | "API_KEY"
  | "US_ADDRESS"
  | "DATE_OF_BIRTH";

interface PiiPattern {
  category: PiiCategory;
  regex: RegExp;
  /** Optional post-match validation to reduce false positives. */
  validate?: (match: string) => boolean;
  /**
   * Optional context guard. When set, a match is only redacted if this regex
   * matches the text immediately preceding it (a short window). Used to require
   * a cue word — e.g. only treat a date as a date-of-birth when "DOB" / "born"
   * appears just before it. Implemented with a window slice rather than a
   * lookbehind so it works on engines without lookbehind support (Hermes,
   * older Safari).
   */
  context?: RegExp;
}

// Luhn checksum for credit card validation
function luhnCheck(digits: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

/**
 * All patterns use the global flag so they can find multiple matches in a
 * single string. They are cloned (via `new RegExp`) before each scan to
 * reset `lastIndex`.
 */
/**
 * Pattern order matters: more specific patterns run before less specific ones
 * to prevent greedy matches. For example, SSN (###-##-####) must run before
 * phone, and IP addresses (dotted quads) must run before phone.
 */
export const PII_PATTERNS: PiiPattern[] = [
  // Email — standard RFC-ish pattern.
  // Quantifiers are bounded (local-part ≤ 64, domain ≤ 255, TLD ≤ 24 —
  // all at or above real RFC 5321 limits) so the engine cannot backtrack
  // quadratically on adversarial input like "a.a.a.a…" with no "@".
  {
    category: "EMAIL",
    regex: /\b[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,255}\.[a-zA-Z]{2,24}\b/g,
  },

  // SSN — US Social Security Number, dashed form (must run before phone)
  {
    category: "SSN",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    validate: (match: string) => {
      const parts = match.split("-");
      const area = parseInt(parts[0], 10);
      return area !== 0 && area !== 666 && area < 900;
    },
  },

  // SSN — dashless or space-separated form. Only redacted with an "SSN" /
  // "social security" cue nearby: a bare 9-digit run is too ambiguous
  // (ZIP+4, account numbers, etc.) to redact unconditionally.
  {
    category: "SSN",
    regex: /\b\d{3}[ ]?\d{2}[ ]?\d{4}\b/g,
    context: /(?:\bssn\b|\bsocial\s+security(?:\s+(?:number|no\.?|#))?\b)[^\d\n]{0,12}$/i,
    validate: (match: string) => {
      const digits = match.replace(/\D/g, "");
      if (digits.length !== 9) return false;
      const area = parseInt(digits.slice(0, 3), 10);
      return area !== 0 && area !== 666 && area < 900;
    },
  },

  // Credit card numbers — 13-19 contiguous digits or groups of 4 separated by spaces/dashes
  // Must run before phone to avoid partial matches
  {
    category: "CREDIT_CARD",
    regex: /\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{1,7}\b|\b\d{13,19}\b/g,
    validate: (match: string) => {
      const digits = match.replace(/\D/g, "");
      if (digits.length < 13 || digits.length > 19) return false;
      return luhnCheck(digits);
    },
  },

  // IPv4 addresses (must run before phone to avoid partial matches)
  {
    category: "IP_ADDRESS",
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    validate: (match: string) => {
      return match !== "0.0.0.0" && match !== "127.0.0.1" && match !== "255.255.255.255";
    },
  },

  // IPv6 addresses — full and compressed (::) forms. Each alternative requires
  // either a full 8-group address or a "::" compression, so ordinary
  // colon-separated text (timestamps like 12:34:56) does not match. Loopback
  // (::1) and unspecified (::) are excluded.
  {
    category: "IP_ADDRESS",
    regex:
      /(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:))/g,
    validate: (match: string) => match !== "::1" && match !== "::",
  },

  // Phone numbers. The separated form requires separator characters (dashes,
  // spaces, dots, parens) to avoid matching bare digit sequences that are
  // actually credit cards, IPs, or years. A second alternative matches E.164
  // (a leading "+" then 10–15 digits, e.g. +14155552671), which is
  // unambiguous; a bare 10-digit run with no "+" and no separators is
  // intentionally not matched to avoid false positives.
  {
    category: "PHONE",
    regex: /(?:\+\d{1,3}[\s.-])?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b|\+\d{10,15}\b/g,
  },

  // API keys / secrets — long token with a key-like prefix. The validator
  // requires entropy (at least one digit, or a mix of upper- and lower-case)
  // so long all-lowercase prose identifiers like
  // "accessibility_is_important_for_everyone" or
  // "access-control-list-management-feature" are not redacted. Real keys and
  // tokens essentially always contain digits or mixed case.
  {
    category: "API_KEY",
    regex: /\b(?:sk|pk|api|key|token|secret|bearer|access)[_-]?[a-zA-Z0-9_-]{20,}\b/gi,
    validate: (match: string) => {
      const hasDigit = /\d/.test(match);
      const hasMixedCase = /[a-z]/.test(match) && /[A-Z]/.test(match);
      return hasDigit || hasMixedCase;
    },
  },

  // US street addresses — house number + Title-Case street name + suffix.
  // Intentionally NOT case-insensitive: the `[A-Z][a-z]+` guard requires
  // properly-capitalized street words, so "123 main street", "100 MAIN
  // STREET" and prose like "3 blocks down the road" / "5 minutes to drive"
  // are not treated as addresses. Whitespace is `[ \t]` only (no newline
  // spanning), and the suffix must end the segment (punctuation / newline /
  // end of string) so "Driveway" or "Wayfair" don't match on the suffix.
  {
    category: "US_ADDRESS",
    regex:
      /\b\d{1,5}[ \t]+(?:[A-Z][a-z]+[ \t]+){1,3}(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Dr(?:ive)?|Ln|Lane|Rd|Road|Ct|Court|Pl(?:ace)?|Way|Cir(?:cle)?|Pkwy|Parkway|Hwy|Highway)\.?(?=[\s,.;:!?)]|$)/g,
    validate: (match: string) => {
      // House numbers don't have leading zeros.
      return !/^0/.test(match.trim());
    },
  },

  // Dates of birth — common US date formats. Only redacted when a birth-date
  // cue ("DOB", "born", "birthday", "date of birth") appears just before the
  // date, so ordinary calendar dates ("meeting 12/25/2024", deadlines,
  // invoices) are left intact for the model. A calendar validator also rejects
  // impossible dates like 02/31/1990.
  {
    category: "DATE_OF_BIRTH",
    regex: /\b(?:(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])[/-](?:19|20)\d{2})\b/g,
    context:
      /(?:\bdob\b|\bd\.?o\.?b\.?|\bborn\b|\bbirth\s?date\b|\bbirthdate\b|\bbirthday\b|\bdate\s+of\s+birth\b)[^\d\n]{0,12}$/i,
    validate: (match: string) => {
      const m = match.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      if (!m) return false;
      const month = parseInt(m[1], 10);
      const day = parseInt(m[2], 10);
      const year = parseInt(m[3], 10);
      const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
      const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
    },
  },
];
