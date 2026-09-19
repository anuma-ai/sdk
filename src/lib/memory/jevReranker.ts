/**
 * Jev reranker — a network cross-encoder substitute for the recall hot path.
 *
 * WHY THIS EXISTS. {@link ./reranker} runs `Xenova/ms-marco-MiniLM-L-6-v2`
 * on-device via `@huggingface/transformers`, which is not in the React Native
 * bundle. On mobile the import fails, `RerankerUnavailableError` is thrown,
 * and recall degrades to the fused cosine/BM25 ordering — see the
 * `rerank-unavailable` diagnostic in `recall.ts`, and the comment there noting
 * the requested budget flag "lied on RN". So today the eight memories handed
 * to the answer model on mobile are ordered by a numeric proxy with no
 * semantic judgment over them at all.
 *
 * This module is the same contract ({@link RerankFn}) over an API call, so it
 * behaves identically on every platform. It asks Jev one Noul per candidate —
 * "would this memory help answer the query?" — and uses the returned
 * probability as the score. A Noul probability is already in [0, 1], which is
 * the same range the cross-encoder's sigmoid produces, so `searchTool`'s
 * `v2 * (1 + ceWeight * score)` blend needs no change.
 *
 * ONE REQUEST, MANY QUESTIONS. Every candidate is judged in a single batched
 * request against shared state. The questions are independent and cannot see
 * each other's answers, so batching does not change any individual verdict —
 * it is purely a cost and latency win (TypeSafe's own benchmark: 13 questions
 * batched at $0.000497 / 0.27s, against $0.006090 / 2.71s sequential).
 *
 * The published re-ranking cookbook instead issues one request per (query,
 * candidate) pair, because its candidates are long court-opinion passages
 * where co-resident text acts as a distractor. Memory facts are one-liners: a
 * 30-candidate shortlist is a few thousand tokens total, well inside the 32k
 * state budget, and keeping them in one request keeps us to one round trip on
 * the recall critical path instead of 30 concurrent ones against a 1,200 rpm
 * account limit. {@link JevRerankOptions.maxContentChars} is the guard that
 * keeps that assumption true for an unusually long memory.
 *
 * FAILURE POSTURE. Identical to the cross-encoder's, because the caller's
 * handling is shared: no endpoint or no credential throws
 * {@link RerankerUnavailableError} (expected-unavailable, logged at debug,
 * degrade to fused ranking); anything else throws a plain Error (transient,
 * logged at warn, degrade to fused ranking). Recall never fails because a
 * rerank failed. There is deliberately no retry — the fallback ordering is
 * already computed and free, and this sits in front of a user waiting for an
 * answer.
 *
 * PRIVACY. Memory content leaves the device on this path, as it already does
 * for extraction and consolidation. Callers on the client route through the
 * portal (see {@link JevRerankOptions.endpoint}), which holds the vendor
 * credential; the key is never shipped to a client. Redaction is the caller's
 * decision, as in `portalLlm.ts`.
 */

import { BASE_URL } from "../../clientConfig.js";
import { validateEndpointOverride } from "../chat/endpointOverride.js";
import { getLogger } from "../logger.js";
import { type PortalLlmAuth, resolvePortalAuthHeaders } from "./portalLlm.js";
import {
  formatRerankDoc,
  type RerankedItem,
  type RerankerItem,
  RerankerUnavailableError,
} from "./reranker.js";

/** Read per-call so tests that mutate `process.env` between imports take effect. */
function defaultBaseUrl(): string {
  return (typeof process !== "undefined" && process.env?.ANUMA_PORTAL_BASE_URL) || BASE_URL;
}

/**
 * Portal path for the System One proxy. The portal holds the vendor key and
 * forwards the request body unchanged; nothing here ever sees the credential.
 */
export const DEFAULT_JEV_ENDPOINT = "/api/v1/systemone";

/**
 * Sent for completeness, but the portal pins the model server-side and
 * overrides whatever arrives here — the route is unbilled, so letting a caller
 * name the model would be a free lever on our vendor quota. Change the model
 * with `PORTAL_SYSTEMONE_MODEL`, not from here.
 */
export const DEFAULT_JEV_MODEL = "jev-latest";

/**
 * Per-candidate content cap, in characters.
 *
 * Two jobs. It keeps a 30-candidate shortlist inside Jev's 32k-token state
 * budget even if several memories are unusually long, and it limits how much
 * unrelated text sits beside the candidate actually being judged — Jev's
 * published jaggedness notes list irrelevant context as a distractor whose
 * effect grows with state size. A memory long enough to be truncated here is
 * already an outlier: the extractor writes single durable facts.
 */
export const DEFAULT_MAX_CONTENT_CHARS = 400;

/**
 * Wall-clock budget for the whole batched call.
 *
 * Sized for the hot path, not for a slow provider: recall blocks the answer
 * model, and the fallback ordering is already in hand. Deliberately far below
 * `portalLlm.ts`'s 60s default, which is sized for generation.
 */
export const DEFAULT_TIMEOUT_MS = 4_000;

/** Instruction text, held constant so the wording is identical across callers
 * and an eval run and a production recall are comparing the same question. */
const RELEVANCE_INSTRUCTIONS =
  "Would this stored memory about the user help answer the user's current message?";

const RELEVANCE_CRITERIA = {
  true: "The memory states a fact the answer needs, or context that changes what a correct answer looks like.",
  false:
    "The memory is about a different subject, or it adds nothing the current message does not already supply.",
};

/** @public */
export interface JevRerankOptions extends PortalLlmAuth {
  /** Portal origin. Defaults to `ANUMA_PORTAL_BASE_URL`, else the SDK's `BASE_URL`. */
  baseUrl?: string;
  /** Root-relative portal path. Defaults to {@link DEFAULT_JEV_ENDPOINT}. */
  endpoint?: string;
  /** Ignored by the portal, which pins the model. See {@link DEFAULT_JEV_MODEL}. */
  model?: string;
  /** Whole-call budget in ms. Defaults to {@link DEFAULT_TIMEOUT_MS}. */
  timeoutMs?: number;
  /** Per-candidate content cap. Defaults to {@link DEFAULT_MAX_CONTENT_CHARS}. */
  maxContentChars?: number;
  /** Override fetch (for tests). */
  fetchFn?: typeof fetch;
}

/** The shape we send. Exported for the portal contract test. */
interface SystemOneRequest {
  model: string;
  state: {
    query: string;
    candidates: Array<{ index: number; memory: string }>;
  };
  questions: Record<
    string,
    {
      type: "noul";
      instructions: string;
      criteria: { true: string; false: string };
    }
  >;
}

/**
 * Question id for a candidate's slot in the batch.
 *
 * Ids are for our code and are never shown to the model, so the question text
 * carries the candidate reference instead (a backticked state path, which is
 * how TypeSafe expects nested state to be addressed). Keyed by position rather
 * than by the memory's own id because a vault id is user-derived and has no
 * business in a request body we do not control the parsing of.
 */
function questionId(index: number): string {
  return `c${index}`;
}

/** Clamp to [0, 1]; a non-finite or out-of-range value scores 0 rather than
 * poisoning the blend with NaN (which would sort unpredictably). */
function clampScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function truncate(content: string, maxChars: number): string {
  return content.length <= maxChars ? content : content.slice(0, maxChars);
}

/**
 * Rerank a candidate set against a query using Jev.
 *
 * Returns items sorted by score descending, matching {@link RerankFn}. Empty
 * input, or an empty query, returns `[]` without a network call — the same
 * short-circuit the cross-encoder makes.
 *
 * @throws {RerankerUnavailableError} when no credential is configured, which
 * the caller treats as an expected degradation rather than a fault.
 */
export async function rerankPairsWithJev(
  query: string,
  items: RerankerItem[],
  options: JevRerankOptions = {}
): Promise<RerankedItem[]> {
  if (items.length === 0 || !query) return [];

  const log = getLogger();
  const tag = "memory/jev-rerank";

  // Neither credential means this lane was never wired up in this environment
  // — the same category of fact as "the transformers package isn't bundled",
  // so it reports the same way instead of as a transient failure. Note this
  // diverges from `resolvePortalAuthHeaders`, which throws a plain Error on
  // the same condition; here an unconfigured lane must degrade, not surface.
  if (!options.apiKey && !options.getToken) {
    throw new RerankerUnavailableError(new Error("no portal credential configured"));
  }

  const endpoint = options.endpoint ?? DEFAULT_JEV_ENDPOINT;
  const validation = validateEndpointOverride(endpoint);
  if (!validation.valid) {
    // A caller wiring bug, not an environment fact: surface it rather than
    // silently degrading every recall to the fused ordering.
    throw new Error(`[${tag}] invalid endpoint: ${endpoint}`);
  }

  const headers = await resolvePortalAuthHeaders(options, tag);
  if (headers === null) {
    // Token fetch failed. Transient — a plain Error so the caller logs at warn.
    throw new Error(`[${tag}] could not resolve auth headers`);
  }

  const maxChars = options.maxContentChars ?? DEFAULT_MAX_CONTENT_CHARS;
  const questions: SystemOneRequest["questions"] = {};
  const candidates = items.map((item, index) => {
    questions[questionId(index)] = {
      type: "noul",
      // The backticked path is how the model is pointed at one candidate; the
      // ids above never reach it.
      instructions: `${RELEVANCE_INSTRUCTIONS} Judge the memory at \`candidates[${index}].memory\` only.`,
      criteria: RELEVANCE_CRITERIA,
    };
    return {
      index,
      // Date-prefix exactly as the cross-encoder does, so temporal alignment
      // is visible to both implementations and an eval comparing them is
      // comparing the ranking, not the input.
      memory: truncate(formatRerankDoc(item.content, item.dateMs), maxChars),
    };
  });

  const body: SystemOneRequest = {
    model: options.model ?? DEFAULT_JEV_MODEL,
    state: { query, candidates },
    questions,
  };

  const baseUrl = options.baseUrl ?? defaultBaseUrl();
  const doFetch = options.fetchFn ?? fetch;
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let payload: unknown;
  try {
    const res = await doFetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`[${tag}] portal returned ${res.status}`);
    }
    payload = await res.json();
  } finally {
    // Cleared in `finally` so an early throw cannot leave a pending timer
    // holding the Node event loop open in a CLI or eval run.
    clearTimeout(timer);
  }

  const answers = (payload as { answers?: Record<string, { noul?: unknown }> })?.answers;
  if (!answers || typeof answers !== "object") {
    throw new Error(`[${tag}] response carried no answers`);
  }

  // An answer we cannot read scores 0 rather than dropping the candidate:
  // dropping would shorten the head slice and silently lose a memory the
  // fused ranking had already admitted. Scoring 0 only forgoes the rerank
  // lift for that one item.
  let missing = 0;
  const scored: RerankedItem[] = items.map((item, index) => {
    const answer = answers[questionId(index)];
    if (!answer || typeof answer !== "object" || !("noul" in answer)) missing += 1;
    return {
      id: item.id,
      content: item.content,
      score: clampScore(answer?.noul),
    };
  });

  if (missing > 0) {
    log.warn(`[${tag}] ${missing}/${items.length} candidates had no usable answer`);
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/**
 * Bind options into a {@link RerankFn} for handing to the vault search layer,
 * which takes the two-argument form and knows nothing about transport.
 *
 * @public
 */
export function makeJevReranker(
  options: JevRerankOptions
): (query: string, items: RerankerItem[]) => Promise<RerankedItem[]> {
  return (query, items) => rerankPairsWithJev(query, items, options);
}
