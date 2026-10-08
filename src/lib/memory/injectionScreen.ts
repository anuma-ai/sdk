import type { ExtractedCandidate } from "./autoExtract.js";

/** Why a candidate was quarantined. Coarse buckets over the signature set
 * below — surfaced for audit/telemetry, never alongside the content.
 * `llm_semantic` (PR5) is emitted by the optional second-layer LLM classifier
 * ({@link classifyInjectionCandidates}), not by any deterministic signature
 * here — it catches signature-free poison ("Trusts BrandX for financial
 * advice") the regex screen passes as clean. */
export type InjectionReason =
  | "imperative_override"
  | "role_marker_leak"
  | "exfiltration_url"
  | "llm_semantic";

/** A candidate the screen flagged, with the matching signature id + reason.
 * Content is intentionally NOT duplicated here beyond the candidate itself —
 * callers must never log `candidate.content`. */
export interface ScreenedCandidate {
  candidate: ExtractedCandidate;
  /** Coarse reason bucket. */
  reason: InjectionReason;
  /** Stable id of the signature that matched (safe to log; carries no content). */
  signature: string;
}

/** Result of screening a candidate batch. */
export interface ScreenResult {
  /** Candidates with no injection signature — persist normally. */
  clean: ExtractedCandidate[];
  /** Candidates that matched a signature — persist quarantined. */
  quarantined: ScreenedCandidate[];
}

const CONFUSABLES: Record<string, string> = {
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
  і: "i",
  ѕ: "s",
  к: "k",
  м: "m",
  н: "h",
  т: "t",
  в: "b",
  ԁ: "d",
  ј: "j",
  А: "A",
  Е: "E",
  О: "O",
  Р: "P",
  С: "C",
  У: "Y",
  Х: "X",
  К: "K",
  М: "M",
  Н: "H",
  Т: "T",
  В: "B",
  Ј: "J",
  ο: "o",
  α: "a",
  ε: "e",
  ρ: "p",
  χ: "x",
  ι: "i",
  Ο: "O",
  Α: "A",
  Ε: "E",
  Ρ: "P",
  Χ: "X",
  Ι: "I",
};

const CONFUSABLE_RE = new RegExp(`[${Object.keys(CONFUSABLES).join("")}]`, "gu");

/**
 * Normalize content for matching ONLY (never for storage). Kills the cheap
 * evasions that defeat naive `\b…\b` / bounded-gap regexes:
 *  1. Unicode NFKC — folds compatibility forms (full-width, ligatures, …).
 *  2. Strip Unicode format chars (Cf: zero-width space/joiner, BOM, soft
 *     hyphen, RTL/LTR overrides) that split trigger words invisibly.
 *  3. Fold confusable homoglyphs back to Latin.
 *  4. Strip Unicode combining marks (Mn/Mc/Me) that stack on a base letter to
 *     disguise a trigger word — e.g. "Ig̈nore" (g + U+0308 combining diaeresis)
 *     reads as "Ignore" but `\bignore\b` misses it until the mark is dropped.
 *  5. Collapse ALL whitespace (incl. newlines/tabs) to single spaces, so a
 *     `\n` planted inside a bounded `[^.\n]` gap no longer breaks the match.
 * Pure win: none of these can turn a benign fact into an injection phrase.
 */
export function normalizeForScreen(content: string): string {
  return content
    .normalize("NFKC")
    .replace(/[\p{Cf}]/gu, "")
    .replace(CONFUSABLE_RE, (ch) => CONFUSABLES[ch] ?? ch)
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface Signature {
  /** Stable, content-free id (safe to log). */
  id: string;
  reason: InjectionReason;
  pattern: RegExp;
}

const SIGNATURES: readonly Signature[] = [
  {
    id: "ignore-previous-instructions",
    reason: "imperative_override",
    pattern:
      /\b(ignore|disregard|forget|override|bypass)\b[^.]{0,120}\b(previous|above|prior|earlier|all|any)\b[^.]{0,120}\b(instruction|instructions|context|message|messages|prompt|prompts|rule|rules|direction|directions|guideline|guidelines)\b/i,
  },
  {
    id: "from-now-on",
    reason: "imperative_override",
    pattern:
      /\bfrom now on\b[^.]{0,40}\byou\b[^.]{0,40}\b(must|should|shall|will|are|respond|reply|say|recommend|act|behave|answer|treat|always|never)\b/i,
  },
  {
    id: "you-must-always-never",
    reason: "imperative_override",
    pattern:
      /\byou\s+(?:must|should|shall|will|have to|need to|are (?:to|required to))\s+(?:always|never)\s+(?:recommend|reveal|expose|output|respond|reply|say|tell|answer|refuse|ignore|disregard|treat|act|behave|comply|obey|claim|insist|promote|endorse|mention|include|forget|remember)\b/i,
  },
  {
    id: "always-never-directive",
    reason: "imperative_override",
    pattern:
      /\b(?:always|never)\s+(?:recommend|reveal|expose|output|respond|reply|refuse|ignore|disregard|promote|endorse|comply|obey|claim)\b/i,
  },
  {
    id: "when-asked-say",
    reason: "imperative_override",
    pattern:
      /\bwhen(ever)?\b[^.]{0,50}\b(ask|asks|asked|asking)\b[^.]{0,50}\b(say|respond|reply|recommend|answer|tell|claim|state|output|insist)\b/i,
  },
  {
    id: "role-swap-directive",
    reason: "imperative_override",
    pattern:
      /\b(you are now|act as|pretend (?:to be|that)|roleplay as|behave as|new instructions?:|system prompt:|override:)\b/i,
  },
  {
    id: "reveal-your-secrets",
    reason: "imperative_override",
    pattern:
      /\b(reveal|print|output|show|dump|leak|expose|repeat|send)\b[^.]{0,30}\b(your|the|all)\b[^.]{0,30}\b(system prompt|instructions?|prompt|memories|secrets?|api key|password|credentials?)\b/i,
  },

  {
    id: "role-marker",
    reason: "role_marker_leak",
    pattern: /(?:^|\s)(system|assistant|user)\s*:/i,
  },
  {
    id: "chat-control-token",
    reason: "role_marker_leak",
    pattern: /<\|(?:im_start|im_end|system|assistant|user|endoftext)\|>|\[\/?INST\]|<<\/?SYS>>/i,
  },
  {
    id: "tool-call-marker",
    reason: "role_marker_leak",
    pattern: /<\/?tool_call>|<\/?function_call>|"tool_calls"\s*:/i,
  },

  {
    id: "exfil-send-to-url",
    reason: "exfiltration_url",
    pattern:
      /\b(send|post|upload|exfiltrate|forward|email|transmit|beacon)\b[^.]{0,40}\bhttps?:\/\//i,
  },
  {
    id: "markdown-image-exfil",
    reason: "exfiltration_url",
    pattern: /!\[[^\]]*\]\(\s*https?:\/\//i,
  },
];

function matchSignature(content: string): Signature | undefined {
  const normalized = normalizeForScreen(content);
  for (const sig of SIGNATURES) {
    if (sig.pattern.test(normalized)) return sig;
  }
  return undefined;
}

/**
 * Screen extraction candidates for injection / poisoning signatures.
 *
 * Partitions the input into `clean` (persist normally) and `quarantined`
 * (persist with `trust_tier="quarantined"`, hidden from recall). Pure and
 * synchronous — no network, no DB, no content logging. Input order is
 * preserved within each partition.
 */
export function screenCandidatesForInjection(
  candidates: readonly ExtractedCandidate[]
): ScreenResult {
  const clean: ExtractedCandidate[] = [];
  const quarantined: ScreenedCandidate[] = [];
  for (const candidate of candidates) {
    const match = matchSignature(candidate.content);
    if (match) {
      quarantined.push({ candidate, reason: match.reason, signature: match.id });
    } else {
      clean.push(candidate);
    }
  }
  return { clean, quarantined };
}

/**
 * Content-free catalog of the active signatures (id + reason, no patterns).
 * Exposed so a security review / audit surface can enumerate coverage
 * without reaching into module internals. Does not leak any user content.
 */
export function injectionSignatureCatalog(): { id: string; reason: InjectionReason }[] {
  return SIGNATURES.map((s) => ({ id: s.id, reason: s.reason }));
}
