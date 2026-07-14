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
 * below — surfaced for audit/telemetry, never alongside the content. */
export type InjectionReason = "imperative_override" | "role_marker_leak" | "exfiltration_url";

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
 * Bounds on the `[^.\n]{0,N}` gaps keep each pattern anchored to a single
 * clause so unrelated words far apart in a long fact don't co-trigger a
 * match. All are case-insensitive; none use the `g` flag (so `.test()` is
 * stateless and safe to reuse across calls).
 */
const SIGNATURES: readonly Signature[] = [
  // ── Imperative overrides aimed at the assistant ──────────────────────
  {
    // "ignore/disregard/forget/override ... previous/above/prior/all ...
    //  instructions/context/messages/prompt/rules"
    id: "ignore-previous-instructions",
    reason: "imperative_override",
    pattern:
      /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|above|prior|earlier|all|any)\b[^.\n]{0,40}\b(instruction|instructions|context|message|messages|prompt|prompts|rule|rules|direction|directions)\b/i,
  },
  {
    // "from now on ... you/always/never/respond/say/recommend ..."
    id: "from-now-on",
    reason: "imperative_override",
    pattern:
      /\bfrom now on\b[^.\n]{0,60}\b(you|always|never|respond|reply|say|recommend|answer|act|behave|treat|only)\b/i,
  },
  {
    // second-person standing directive: "you must/should/have to always/never"
    id: "you-must-always-never",
    reason: "imperative_override",
    pattern:
      /\byou\s+(must|should|shall|will|have to|need to|are (?:to|required to))\s+(always|never)\b/i,
  },
  {
    // "always/never say/respond/recommend/reveal/output ..." — imperative
    // directive to the assistant's behavior.
    id: "always-never-directive",
    reason: "imperative_override",
    pattern:
      /\b(always|never)\s+(say|respond|reply|recommend|suggest|answer|tell|mention|include|refuse|reveal|output|repeat|remember|forget)\b/i,
  },
  {
    // "when(ever) (someone) asks ... say/respond/recommend/tell ..." — the
    // classic trigger-and-payload injection.
    id: "when-asked-say",
    reason: "imperative_override",
    pattern:
      /\bwhen(ever)?\b[^.\n]{0,50}\b(ask|asks|asked|asking)\b[^.\n]{0,50}\b(say|respond|reply|recommend|answer|tell|claim|state|output|insist)\b/i,
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
      /\b(reveal|print|output|show|dump|leak|expose|repeat|send)\b[^.\n]{0,30}\b(your|the|all)\b[^.\n]{0,30}\b(system prompt|instructions?|prompt|memories|secrets?|api key|password|credentials?)\b/i,
  },

  // ── Chat role / tool-format marker leakage ───────────────────────────
  {
    // a line that begins with a chat role marker ("system:", "assistant:")
    // — a stored fact is prose, not a transcript, so a leading role marker
    // is an attempt to inject a fake turn.
    id: "role-marker-line",
    reason: "role_marker_leak",
    pattern: /(?:^|\n)\s*(system|assistant|user|developer|tool)\s*:/i,
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
  {
    // a URL carrying a query string — the "beacon the data out" shape.
    // Durable personal facts don't embed tracking URLs with params.
    id: "exfil-url-query",
    reason: "exfiltration_url",
    pattern: /https?:\/\/[^\s)]+\?[^\s)]*=/i,
  },
  {
    // "send/post/upload/forward/email ... http(s)://..." — explicit exfil.
    id: "exfil-send-to-url",
    reason: "exfiltration_url",
    pattern:
      /\b(send|post|upload|exfiltrate|forward|leak|email|curl|fetch|GET|POST)\b[^.\n]{0,40}\bhttps?:\/\//i,
  },
  {
    // markdown image that auto-loads on render → silent data exfil via URL.
    id: "markdown-image-exfil",
    reason: "exfiltration_url",
    pattern: /!\[[^\]]*\]\(\s*https?:\/\//i,
  },
];

/** First signature that matches `content`, or undefined. */
function matchSignature(content: string): Signature | undefined {
  for (const sig of SIGNATURES) {
    if (sig.pattern.test(content)) return sig;
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
