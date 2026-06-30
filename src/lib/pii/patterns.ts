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
   * If set, a hit is only redacted when this regex matches the text immediately
   * before it (a ~32-char window). Lets format-ambiguous patterns require a
   * contextual cue — e.g. only treat a date as a DOB when "born"/"DOB" precedes
   * it — instead of masking every value that fits the shape.
   */
  requireContextBefore?: RegExp;
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
  // Email — standard RFC-ish pattern
  {
    category: "EMAIL",
    regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
  },

  // SSN — US Social Security Number (must run before phone)
  {
    category: "SSN",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    validate: (match: string) => {
      const parts = match.split("-");
      const area = parseInt(parts[0], 10);
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

  // Phone numbers — US/international formats
  // Requires separator characters (dashes, spaces, dots, parens) to avoid matching
  // bare digit sequences that are actually credit cards, IPs, or years.
  {
    category: "PHONE",
    regex: /(?:\+\d{1,3}[\s.-])?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g,
  },

  // API keys / secrets — long alphanumeric strings with key-like prefixes
  {
    category: "API_KEY",
    regex: /\b(?:sk|pk|api|key|token|secret|bearer|access)[_-]?[a-zA-Z0-9_-]{20,}\b/gi,
  },

  // US street addresses — number + street name + suffix
  {
    category: "US_ADDRESS",
    regex:
      /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){1,3}(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Dr(?:ive)?|Ln|Lane|Rd|Road|Ct|Court|Pl(?:ace)?|Way|Cir(?:cle)?|Pkwy|Parkway|Hwy|Highway)\b\.?/gi,
  },

  // Dates of birth — common US date formats. Only redacted when a birth cue
  // ("born", "DOB", "date of birth", "birthday") precedes the date, so ordinary
  // dates ("meet on 06/30/2026") aren't masked and stripped of meaning. A bare
  // date is format-identical to a DOB, so context is the only safe signal.
  {
    category: "DATE_OF_BIRTH",
    regex: /\b(?:(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])[/-](?:19|20)\d{2})\b/g,
    requireContextBefore: /\b(?:born|d\.?o\.?b\.?|date of birth|birth\s?day)\b[^\n]{0,12}$/i,
  },
];
