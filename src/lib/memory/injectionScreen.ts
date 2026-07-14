/**
 * Write-time memory-poisoning screen — Tier-0 security (PR3).
 *
 * Deterministic, network-free, and always on. Scans each extraction
 * candidate's `content` for prompt-injection / memory-poisoning
 * signatures and routes flagged candidates to quarantine instead of the
 * live vault.
 *
 * WHY a signature scan (not an LLM classifier): this runs on the write
 * path for every extracted fact, so it must be cheap, offline, and must
 * never leak content to a model. It also gives a small false-positive
 * surface here: durable third-person facts about the user ("Lives in San
 * Francisco", "Allergic to shellfish", "Works in engineering") almost
 * never contain second-person imperatives aimed at the assistant, chat
 * role markers, or beacon URLs — the exact shapes these signatures look
 * for. An optional LLM injection classifier is deferred to PR5.
 *
 * WHY quarantine, not drop: a flagged candidate is still persisted (see
 * `extractAndRetain`) with `trust_tier="quarantined"` so it stays an
 * auditable record, recoverable by an operator via the `includeQuarantined`
 * read path. The `baseVaultConditions` choke point excludes quarantined
 * rows from every recall lane, so a poisoned fact never reaches the answer
 * model even though it lives in the DB.
 *
 * This MITIGATES memory poisoning (MINJA / AgentPoison; OWASP ASI06 2026).
 * It is not a complete solve — a poison phrased as a plain third-person
 * fact ("Prefers the BrandX credit card") carries no injection signature
 * and will pass. The proof-count ranking boost (once-seen facts stay
 * low-ranked) and the read-time isolation in `formatRecallResult` are the
 * complementary layers.
 */

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

/**
 * Confusable / homoglyph map: non-Latin code points that render like the
 * Latin letters used in trigger words. Attackers swap e.g. a Cyrillic "о"
 * (U+043E) into "Ignоre" so `\bignore\b` misses it while the text reads
 * identically. We fold these back to Latin BEFORE matching (matching only —
 * the original is always what gets stored). Only characters that are
 * genuinely confusable with a Latin letter appear here, so folding a
 * legitimate non-Latin fact can't manufacture an English injection phrase.
 */
const CONFUSABLES: Record<string, string> = {
  // Cyrillic → Latin
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
  // Greek → Latin
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
 *  4. Collapse ALL whitespace (incl. newlines/tabs) to single spaces, so a
 *     `\n` planted inside a bounded `[^.\n]` gap no longer breaks the match.
 * Pure win: none of these can turn a benign fact into an injection phrase.
 */
export function normalizeForScreen(content: string): string {
  return content
    .normalize("NFKC")
    .replace(/[\p{Cf}]/gu, "")
    .replace(CONFUSABLE_RE, (ch) => CONFUSABLES[ch] ?? ch)
    .replace(/\s+/g, " ")
    .trim();
}

interface Signature {
  /** Stable, content-free id (safe to log). */
  id: string;
  reason: InjectionReason;
  pattern: RegExp;
}

/**
 * Injection signatures, ordered most- to least-specific. The scan is
 * first-match: a candidate is quarantined on the first signature that
 * fires, and the first match's reason/id are reported.
 *
 * Patterns run against `normalizeForScreen(content)`, so `\n` never appears
 * (whitespace is collapsed to single spaces) — the bounded `[^.\n]{0,N}`
 * gaps therefore span what were previously line breaks too, while `.`
 * (period) still bounds a gap to one clause. Gaps are widened enough to
 * defeat filler-padding without going unbounded (ReDoS-safe). All are
 * case-insensitive; none use the `g` flag (so `.test()` is stateless).
 *
 * FALSE-POSITIVE posture: signatures target the ASSISTANT as the object of
 * an imperative (second-person directive verbs, chat role markers, explicit
 * exfil verbs+URL). Benign third-person facts about the user ("always
 * remember to bring an umbrella", "believes you should always tip") no
 * longer match — see the verb-list narrowing below. On a miss we lean
 * toward availability (keep the fact) since a false negative only reaches
 * the additional read-time isolation + proof-count ranking layers.
 */
const SIGNATURES: readonly Signature[] = [
  // ── Imperative overrides aimed at the assistant ──────────────────────
  {
    // "ignore/disregard/forget/override/bypass ... previous/above/prior/all
    //  ... instructions/context/messages/prompt/rules". Gaps widened to 120
    //  so filler padding between the anchors can't slip the match.
    id: "ignore-previous-instructions",
    reason: "imperative_override",
    pattern:
      /\b(ignore|disregard|forget|override|bypass)\b[^.]{0,120}\b(previous|above|prior|earlier|all|any)\b[^.]{0,120}\b(instruction|instructions|context|message|messages|prompt|prompts|rule|rules|direction|directions|guideline|guidelines)\b/i,
  },
  {
    // "from now on ... you ... <assistant directive>". Requires the second
    // person "you" so a first-person durable fact ("From now on I only eat
    // vegan") no longer trips it; poison of the form "from now on always
    // recommend X" is still caught by always-never-directive below.
    id: "from-now-on",
    reason: "imperative_override",
    pattern:
      /\bfrom now on\b[^.]{0,40}\byou\b[^.]{0,40}\b(must|should|shall|will|are|respond|reply|say|recommend|act|behave|answer|treat|always|never)\b/i,
  },
  {
    // second-person standing directive AT the assistant: "you must/should/…
    // always/never <directive verb>". The directive verb is required so an
    // opinion ("believes you should always tip") no longer matches — only a
    // command to the assistant's behavior does.
    id: "you-must-always-never",
    reason: "imperative_override",
    pattern:
      /\byou\s+(?:must|should|shall|will|have to|need to|are (?:to|required to))\s+(?:always|never)\s+(?:recommend|reveal|expose|output|respond|reply|say|tell|answer|refuse|ignore|disregard|treat|act|behave|comply|obey|claim|insist|promote|endorse|mention|include|forget|remember)\b/i,
  },
  {
    // "always/never <injection-signal verb>". The verb list is deliberately
    // narrow: benign reminder verbs (remember/forget/tell/say/mention) were
    // REMOVED — "always remember to bring an umbrella" is a real fact, not
    // poison. Only verbs that signal steering the assistant remain.
    id: "always-never-directive",
    reason: "imperative_override",
    pattern:
      /\b(?:always|never)\s+(?:recommend|reveal|expose|output|respond|reply|refuse|ignore|disregard|promote|endorse|comply|obey|claim)\b/i,
  },
  {
    // "when(ever) (someone) asks ... say/respond/recommend/tell ..." — the
    // classic trigger-and-payload injection. (Residual FP: a third-person
    // "when asked, she says X" fact — rare; accepted, recoverable.)
    id: "when-asked-say",
    reason: "imperative_override",
    pattern:
      /\bwhen(ever)?\b[^.]{0,50}\b(ask|asks|asked|asking)\b[^.]{0,50}\b(say|respond|reply|recommend|answer|tell|claim|state|output|insist)\b/i,
  },
  {
    // role-swap / prompt-override phrases: "you are now", "act as",
    // "pretend to be", "new instructions:", "system prompt:"
    id: "role-swap-directive",
    reason: "imperative_override",
    pattern:
      /\b(you are now|act as|pretend (?:to be|that)|roleplay as|behave as|new instructions?:|system prompt:|override:)\b/i,
  },
  {
    // extraction-style directives inside a stored fact: "reveal/print/dump
    //  your (system) prompt/instructions/memories/secrets/api key"
    id: "reveal-your-secrets",
    reason: "imperative_override",
    pattern:
      /\b(reveal|print|output|show|dump|leak|expose|repeat|send)\b[^.]{0,30}\b(your|the|all)\b[^.]{0,30}\b(system prompt|instructions?|prompt|memories|secrets?|api key|password|credentials?)\b/i,
  },

  // ── Chat role / tool-format marker leakage ───────────────────────────
  {
    // a chat role marker token ("system:", "assistant:", "user:") appearing
    // as a standalone token — a stored fact is prose, not a transcript, so a
    // role marker is an attempt to inject a fake turn. NOT line-anchored:
    // normalization collapses newlines, so we match the marker after any
    // whitespace or at the start (catches mid-sentence "... system : ..."
    // too). The trailing colon keeps false positives low ("systems
    // administrator", "system prompt" without a colon do not match).
    id: "role-marker",
    reason: "role_marker_leak",
    pattern: /(?:^|\s)(system|assistant|user)\s*:/i,
  },
  {
    // model chat-format control tokens (ChatML, Llama INST/SYS, etc.)
    id: "chat-control-token",
    reason: "role_marker_leak",
    pattern: /<\|(?:im_start|im_end|system|assistant|user|endoftext)\|>|\[\/?INST\]|<<\/?SYS>>/i,
  },
  {
    // tool-call framing smuggled into content
    id: "tool-call-marker",
    reason: "role_marker_leak",
    pattern: /<\/?tool_call>|<\/?function_call>|"tool_calls"\s*:/i,
  },

  // ── Data-exfiltration URLs ───────────────────────────────────────────
  //
  // A bare query-string URL is NOT flagged — bookmarks, recipe links, and
  // billing URLs all carry `?key=value` and were false-positiving. We now
  // require either an explicit exfil verb next to the URL or a data-beacon
  // shape (auto-loading markdown image).
  {
    // "send/post/upload/forward/email ... http(s)://..." — explicit exfil.
    // Common ambiguous verbs (get/fetch/curl/post-as-publish) are excluded
    // to avoid flagging "get your ticket at https://…".
    id: "exfil-send-to-url",
    reason: "exfiltration_url",
    pattern:
      /\b(send|post|upload|exfiltrate|forward|email|transmit|beacon)\b[^.]{0,40}\bhttps?:\/\//i,
  },
  {
    // markdown image that auto-loads on render → silent data exfil via URL.
    id: "markdown-image-exfil",
    reason: "exfiltration_url",
    pattern: /!\[[^\]]*\]\(\s*https?:\/\//i,
  },
];

/**
 * First signature that matches, or undefined. Matches against the NORMALIZED
 * copy (homoglyph-folded, zero-width-stripped, whitespace-collapsed) so
 * cheap evasions don't get a free pass; the original content is untouched.
 */
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
