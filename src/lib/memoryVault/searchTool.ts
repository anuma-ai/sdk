/**
 * Memory Vault Search Tool
 *
 * Provides a tool for LLMs to search the user's memory vault
 * using semantic similarity over pre-computed embeddings.
 */

import type { ToolConfig } from "../chat/useChat/types";
import { isEncrypted } from "../db/encryption-utils";
import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import { getAllVaultMemoriesOp, updateVaultMemoryEmbeddingOp } from "../db/memoryVault/operations";
import { getLogger } from "../logger";
import { applyMMR } from "../memory/mmr";
import type { PortalLlmAuth } from "../memory/portalLlm";
import { recencyMultiplier, type RecencyOptions } from "../memory/recency";
import { RerankerUnavailableError, rerankPairs } from "../memory/reranker";
import { rrfFuse } from "../memory/rrf";
import { DEFAULT_API_EMBEDDING_MODEL } from "../memoryEngine/constants";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import type { EmbeddingOptions } from "../memoryEngine/types";
import { cosineSimilarity } from "../memoryEngine/vector";
import { scoreBM25 } from "./bm25";
import { decomposeQuery } from "./decomposeQuery";

export { createVaultEmbeddingCache, DEFAULT_VAULT_CACHE_SIZE } from "./lruCache";

/**
 * Embedding cache keyed by content string. Stores pre-computed embeddings
 * so that search only needs to embed the query, not the vault entries.
 */
export type VaultEmbeddingCache = Map<string, Float32Array>;

/**
 * Options for the vault search tool.
 */
export interface MemoryVaultSearchOptions {
  /** Maximum number of results to return (default: 5) */
  limit?: number;
  /** Minimum similarity threshold below which results are discarded (default: 0.1) */
  minSimilarity?: number;
  /** When provided, only search memories with these scopes */
  scopes?: string[];
  /** When provided, only search memories in this folder (null for unfiled) */
  folderId?: string | null;
  /** Typed memory (PR1) — when provided, only search memories of these fact
   * types. Applied at load time via `Q.oneOf` on the indexed `fact_type`
   * column. Omit for no type filter. */
  factTypes?: string[];
  /**
   * PR5 — optional per-FactType score multiplier applied in the boost stage
   * (e.g. `{ identity: 1.2, ongoing_context: 0.8 }`). Empty/omitted = uniform
   * (no behavior change). See {@link rankFusedVaultMemories}.
   */
  factTypeWeights?: Record<string, number>;
  /**
   * PR5 — include archived (decayed) rows in the candidate load. Default false
   * (the baseVaultConditions choke point excludes them). retain()'s dedup
   * search sets this so a re-observed fact can merge into — and un-archive — an
   * archived row instead of creating a fresh duplicate.
   */
  includeArchived?: boolean;
  /**
   * Use the hybrid fusion ranker (cosine + BM25 + RRF + recency) instead of
   * cosine-only. Default true — new W1 pipeline. Pass false to fall back
   * to the legacy cosine-only ranker (e.g. for benchmark A/B comparison).
   */
  useFusion?: boolean;
  /**
   * Run the cross-encoder reranker on the top-N V2 candidates. Default false.
   * When true, switches to the async pipeline (rankFusedVaultMemoriesAsync).
   */
  rerank?: boolean;
  /** Number of CE rerank candidates. Default 30. */
  rerankTopN?: number;
  /** Multiplicative cross-encoder blend weight. Default 0.1. Only used when `rerank` is true. */
  ceWeight?: number;
  /** Recency boost slope applied in the fused ranker. Default 1.0. */
  recencyAlpha?: number;
  /** Recency decay curve overrides (per-year decay slope, floor, no-date multiplier). */
  recency?: RecencyOptions;
  /**
   * Apply Maximal Marginal Relevance after the relevance pass. Default false.
   * Only effective on the rerank (async) pipeline.
   */
  mmr?: boolean;
  /** Supersession score-gap transfer factor. Default 0.8. */
  supersessionBoost?: number;
  /** Hard cap on the supersession candidate window. Default 50. */
  supersessionWindow?: number;
  /** Proof-count log-boost scale (Hindsight α). Default 0.1. */
  proofCountAlpha?: number;
  /** Divisor mapping BM25 scores to the admission floor (`bm25 / divisor`). Default 50. */
  bm25AdmissionDivisor?: number;
  /** RRF smoothing constant for lane fusion. Default 60. */
  rrfK?: number;
  /**
   * LLM-based query decomposition for composite/abstract queries. When set,
   * each query is classified + (if composite) decomposed into 3–5 facet
   * sub-queries via gpt-5-mini, then ranked via {@link rankComposite}.
   * Requires `decomposeOptions` (auth) when set to "llm".
   */
  decompose?: "off" | "llm";
  /** Auth + endpoint for the decomposition LLM call. Required when
   * decompose="llm". Auth is the dual pattern — one of `apiKey` /
   * `getToken`; see {@link PortalLlmAuth}. */
  decomposeOptions?: PortalLlmAuth & {
    baseUrl?: string;
    model?: string;
  };
  /**
   * W5 graph lane — pre-built ranking of memory IDs by entity-overlap
   * score with the query. RRF-fused alongside cosine + BM25. Build via
   * {@link rankByEntityOverlap} or pass-through from `recall()` when
   * `RecallContext.entityCtx` is available.
   */
  entityRanking?: string[];
  /**
   * W6 temporal lane — pre-built ranking of memory IDs whose event-time
   * overlaps the resolved query window, ordered by overlap score
   * (descending). RRF-fused alongside cosine + BM25 + graph. Build via
   * `getMemoriesByEventTimeOp` + `scoreEventTimeOverlap`, or
   * pass-through from `recall()` when the query has a temporal phrase.
   */
  temporalRanking?: string[];
}

/**
 * An item with a pre-computed embedding, ready for ranking.
 */
/**
 * Coerce a free-form `eventTimeKind` string from the vault row into the
 * fixed enum the recall executor knows how to format. Unknown / casing
 * variants collapse to null so we never silently render a range memory
 * as a point date (or vice versa).
 */
function normalizeEventTimeKind(
  kind: string | null | undefined
): "point" | "range" | "ongoing" | null {
  return kind === "point" || kind === "range" || kind === "ongoing" ? kind : null;
}

interface EmbeddedItem {
  id: string;
  content: string;
  embedding: ArrayLike<number>;
  /** Original creation timestamp — what `RankedMemory.createdAt` surfaces.
   * Distinct from `updatedAt` since `proofCountIncrement` re-observation
   * doesn't bump `created_at`. */
  createdAt?: Date;
  /** Last update timestamp — used for supersession detection + recency. */
  updatedAt?: Date;
  /** Number of times this fact has been re-observed (W4 — auto-merge). */
  proofCount?: number | null;
  /** C3 re-observation watermark (Unix ms). Used for C2 trend labels + C4
   * date-prefixed CE pairs when no event_time is set. */
  lastObservedAt?: number | null;
  /** W6 temporal-lane anchors — carried through to VaultSearchResult so the
   * recall executor can surface event dates without a second DB+decrypt. */
  eventTimeStart?: number | null;
  eventTimeEnd?: number | null;
  eventTimeKind?: "point" | "range" | "ongoing" | null;
  /** Typed memory (PR1) — carried through to VaultSearchResult alongside the
   * event-time anchors so recall results can surface the fact's type. */
  factType?: string | null;
  /** Message ids this fact was extracted from — carried through to
   * VaultSearchResult so recall() can suppress the originating chunk in the
   * chunk lane (a fact and the chunk it came from shouldn't both surface). */
  sourceChunkIds?: string[] | null;
}

/**
 * C4 date for cross-encoder pairs: prefer the fact's anchored event time,
 * then the C3 re-observation watermark, then write-time stamps.
 */
function rerankDateMs(item: {
  eventTimeStart?: number | null;
  lastObservedAt?: number | null;
  updatedAt?: Date;
  createdAt?: Date;
}): number | undefined {
  if (item.eventTimeStart !== null && item.eventTimeStart !== undefined && Number.isFinite(item.eventTimeStart)) {
    return item.eventTimeStart;
  }
  if (item.lastObservedAt !== null && item.lastObservedAt !== undefined && Number.isFinite(item.lastObservedAt)) {
    return item.lastObservedAt;
  }
  const updatedMs = item.updatedAt?.getTime();
  if (updatedMs !== null && updatedMs !== undefined && Number.isFinite(updatedMs)) return updatedMs;
  const createdMs = item.createdAt?.getTime();
  if (createdMs !== null && createdMs !== undefined && Number.isFinite(createdMs)) return createdMs;
  return undefined;
}

/**
 * Minimum pairwise cosine similarity between two memories for the older
 * one to be considered superseded by the newer one.
 */
const SUPERSESSION_SIMILARITY_THRESHOLD = 0.7;

/**
 * Minimum time gap (in milliseconds) between two memories for supersession
 * to apply. Memories created close together are likely complementary, not
 * superseding. Default: 30 days.
 */
const SUPERSESSION_MIN_AGE_GAP_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * How much of the score gap to transfer from the older memory to the newer
 * one. At 1.0 this is equivalent to a full swap; at 0.0 no adjustment
 * happens. A value around 0.5–0.8 boosts the newer memory while keeping
 * the older one in contention for recall.
 */
const SUPERSESSION_BOOST_FACTOR = 0.8;

/**
 * Hard cap on the supersession candidate window. Independent of the caller's
 * `limit` — `rankFusedVaultMemoriesAsync` and the bench pass `limit=items.length`
 * so they can probe the long tail, but supersession's O(n²) pairwise cosine
 * scales catastrophically (1k memories → 500k pairwise comparisons → ~1.7s
 * per query). The signal lives entirely in the top candidates anyway: an old
 * memory that doesn't even rank in the top 50 isn't going to be wrongly
 * surfaced over its newer replacement.
 */
const SUPERSESSION_MAX_WINDOW = 50;

/**
 * Supersession adjustment for a single pair. Returns the score delta to
 * add to the newer item (and subtract from the older item).
 */
function supersessionDelta(
  olderScore: number,
  newerScore: number,
  boostFactor: number = SUPERSESSION_BOOST_FACTOR
): number {
  const gap = olderScore - newerScore;
  return gap * boostFactor;
}

/**
 * Find supersession pairs among scored candidates. When two items have
 * pairwise embedding similarity above the threshold and the older one
 * outranks the newer one, they form a supersession pair whose scores
 * should be adjusted via boost/penalty.
 *
 * Candidate pairs are scored by confidence (pairwise similarity * time gap
 * weight) and assigned greedily highest-confidence-first so that the
 * strongest supersession signals aren't blocked by weaker pairs that
 * happen to iterate first.
 *
 * Returns an array of [oldId, newId] pairs to adjust.
 */
function findSupersessionPairs(
  candidates: Array<{
    id: string;
    embedding: ArrayLike<number>;
    updatedAt?: Date;
    similarity: number;
  }>
): Array<[string, string]> {
  // Collect all valid pairs with confidence scores
  const allPairs: Array<{ oldId: string; newId: string; confidence: number }> = [];

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      if (!a.updatedAt || !b.updatedAt) continue;

      const sim = cosineSimilarity(a.embedding, b.embedding);
      if (sim < SUPERSESSION_SIMILARITY_THRESHOLD) continue;

      const gap = Math.abs(a.updatedAt.getTime() - b.updatedAt.getTime());
      if (gap < SUPERSESSION_MIN_AGE_GAP_MS) continue;

      const [older, newer] = a.updatedAt < b.updatedAt ? [a, b] : [b, a];
      if (older.similarity <= newer.similarity) continue;

      // Higher pairwise similarity + larger time gap = more confident supersession
      const gapDays = gap / (24 * 60 * 60 * 1000);
      const confidence = sim * Math.min(gapDays / 30, 3);
      allPairs.push({ oldId: older.id, newId: newer.id, confidence });
    }
  }

  // Greedy assignment: highest confidence first, each ID used at most once
  allPairs.sort((a, b) => b.confidence - a.confidence);
  const claimed = new Set<string>();
  const result: Array<[string, string]> = [];
  for (const pair of allPairs) {
    if (claimed.has(pair.oldId) || claimed.has(pair.newId)) continue;
    result.push([pair.oldId, pair.newId]);
    claimed.add(pair.oldId);
    claimed.add(pair.newId);
  }
  return result;
}

/**
 * Pure ranking function: scores, filters, and ranks items using cosine
 * similarity with supersession detection. When items include `updatedAt`
 * timestamps, pairs of highly similar items are checked for supersession —
 * a fraction of the score gap is transferred from the older item to the
 * newer one, boosting the replacement without fully evicting the original.
 *
 * @param queryEmbedding - Pre-computed embedding for the query
 * @param items - Items with pre-computed embeddings to rank
 * @param options - Ranking options (limit, minSimilarity)
 * @returns Ranked results sorted by descending similarity
 */
export function rankVaultMemories(
  _query: string,
  queryEmbedding: number[],
  items: EmbeddedItem[],
  options?: {
    limit?: number;
    minSimilarity?: number;
    /** Fraction of the score gap transferred old→new on supersession. Default 0.8. */
    supersessionBoost?: number;
    /** Hard cap on the supersession candidate window. Default 50. */
    supersessionWindow?: number;
  }
): VaultSearchResult[] {
  const limit = options?.limit ?? 5;
  const minSimilarity = options?.minSimilarity ?? 0.1;
  const supersessionWindowCap = options?.supersessionWindow ?? SUPERSESSION_MAX_WINDOW;

  const scored = items.map((item) => ({
    uniqueId: item.id,
    content: item.content,
    embedding: item.embedding,
    updatedAt: item.updatedAt,
    createdAt: item.createdAt,
    eventTimeStart: item.eventTimeStart,
    sourceChunkIds: item.sourceChunkIds,
    eventTimeEnd: item.eventTimeEnd,
    eventTimeKind: item.eventTimeKind,
    factType: item.factType,
    similarity: cosineSimilarity(queryEmbedding, item.embedding),
  }));

  const filtered = scored.filter((r) => r.similarity >= minSimilarity);
  filtered.sort((a, b) => b.similarity - a.similarity);

  // Check top candidates for supersession — boost newer items and penalize
  // older ones when they are highly similar and the older one outranks.
  // Capped at SUPERSESSION_MAX_WINDOW to keep O(n²) bounded; tail items are
  // already too low-ranked for supersession to matter.
  const window = filtered.slice(0, Math.min(limit * 3, supersessionWindowCap));
  const pairs = findSupersessionPairs(
    window.map((r) => ({
      id: r.uniqueId,
      embedding: r.embedding,
      updatedAt: r.updatedAt,
      similarity: r.similarity,
    }))
  );

  if (pairs.length > 0) {
    const scoreMap = new Map(filtered.map((r) => [r.uniqueId, r.similarity]));
    const itemMap = new Map(filtered.map((r) => [r.uniqueId, r]));
    for (const [oldId, newId] of pairs) {
      const oldScore = scoreMap.get(oldId)!;
      const newScore = scoreMap.get(newId)!;
      const delta = supersessionDelta(oldScore, newScore, options?.supersessionBoost);
      const oldItem = itemMap.get(oldId);
      const newItem = itemMap.get(newId);
      if (oldItem && newItem) {
        oldItem.similarity = oldScore - delta;
        newItem.similarity = newScore + delta;
        scoreMap.set(oldId, oldItem.similarity);
        scoreMap.set(newId, newItem.similarity);
      }
    }
    filtered.sort((a, b) => b.similarity - a.similarity);
  }

  const itemById = new Map(items.map((i) => [i.id, i]));
  return filtered.slice(0, limit).map((r) => {
    const item = itemById.get(r.uniqueId);
    return {
      uniqueId: r.uniqueId,
      content: r.content,
      similarity: r.similarity,
      createdAt: item?.createdAt ?? item?.updatedAt,
      updatedAt: item?.updatedAt,
      sourceChunkIds: item?.sourceChunkIds,
    };
  });
}

/**
 * Hybrid ranker (V2 — Hindsight pattern): cosine+supersession as the base
 * relevance score, gentle multiplicative recency boost on top, BM25 used
 * to admit out-of-cosine candidates with a small additive contribution.
 *
 * Why not RRF as the final ranker:
 *  - On 100s of memories with only 2 signals, equal-weight RRF puts BM25 on
 *    par with cosine. For natural-language queries, BM25 noise dominates.
 *  - RRF rank-quantization (1/(k+rank)) erases score magnitude so recency
 *    boosts can't differentiate close pairs.
 *  - Hindsight (vectorize-io/hindsight) uses RRF for candidate *selection*
 *    only, then ranks by `CE_score * (1 + α*(recency - 0.5))`. Without a
 *    cross-encoder, we substitute supersession-adjusted cosine for CE.
 *
 * Pipeline:
 *  1. Run rankVaultMemories internally (cosine + existing supersession)
 *  2. Build BM25 admission set: items absent from rankVaultMemories' output
 *     but with positive BM25 — these come in with a small fixed score
 *  3. Apply gentle recency boost: score *= 1 + 0.2*(recency - 0.5),
 *     yielding ±10% from neutral. Items without updatedAt get neutral 1.0.
 *  4. Sort by boosted score, take top-K.
 *
 * The returned `similarity` field carries the boosted score; ordering
 * semantics are preserved relative to {@link VaultSearchResult}.
 */
export function rankFusedVaultMemories(
  query: string,
  queryEmbedding: number[],
  items: EmbeddedItem[],
  options?: {
    limit?: number;
    minSimilarity?: number;
    /**
     * Recency boost slope. Default 1.0 → boost in [0.6, 1.5] across the
     * recency multiplier range [0.1, 1.0]. Tuned empirically against the
     * 100-query vault benchmark — α=1.0 lifts temporal recall by ~5pp
     * without regressing any other category. Hindsight uses α=0.2 because
     * their boost rides on top of a cross-encoder rerank score; we don't
     * have a CE here so cosine carries more responsibility, hence the
     * stronger boost.
     */
    recencyAlpha?: number;
    recency?: RecencyOptions;
    /** Fraction of the score gap transferred old→new on supersession. Default 0.8. */
    supersessionBoost?: number;
    /** Hard cap on the supersession candidate window. Default 50. */
    supersessionWindow?: number;
    /**
     * Proof-count log-boost scale (Hindsight α). Default 0.1 →
     * `1 + α·log(1+proofCount) − α·log(2)`, neutral at proofCount=1.
     */
    proofCountAlpha?: number;
    /**
     * Divisor mapping a positive BM25 score onto the admission floor:
     * `min(minSimilarity, bm25 / divisor)`. Default 50. Smaller values let
     * BM25-only hits enter the ranking with higher scores.
     */
    bm25AdmissionDivisor?: number;
    /** RRF smoothing constant for the side-lane fusion. Default 60. */
    rrfK?: number;
    /**
     * W5 graph lane — pre-built ranking of memory IDs by entity-overlap
     * score. RRF-fused with the cosine+BM25 head when present. Items in
     * `entityRanking` but absent from base cosine/BM25 admit at the
     * tail with their RRF-only contribution (graph is a retrieval lane,
     * not a boost). Build via {@link rankByEntityOverlap}.
     */
    entityRanking?: string[];
    /**
     * W6 temporal lane — pre-built ranking of memory IDs whose event-time
     * overlaps the resolved query window. Same lane semantics as
     * entityRanking: tail-admission for items absent from the cosine head.
     */
    temporalRanking?: string[];
    /**
     * PR5 — optional per-FactType score multiplier applied in the boost stage
     * (e.g. `{ identity: 1.2, ongoing_context: 0.8 }`). A type absent from the
     * map (and untyped/null rows) uses 1.0, so an empty/omitted map is a no-op
     * (uniform weighting = the pre-PR5 behavior). Non-finite / ≤0 entries are
     * ignored (treated as 1.0) so a bad weight can't zero out a lane.
     */
    factTypeWeights?: Record<string, number>;
  }
): VaultSearchResult[] {
  const limit = options?.limit ?? 5;
  const minSimilarity = options?.minSimilarity ?? 0.1;
  const recencyAlpha = options?.recencyAlpha ?? 1.0;
  const proofCountAlpha = options?.proofCountAlpha ?? 0.1;
  const bm25AdmissionDivisor = options?.bm25AdmissionDivisor ?? 50;
  const factTypeWeights = options?.factTypeWeights;

  if (items.length === 0) return [];

  // Stage 1 — base cosine + supersession via existing ranker.
  const baseRanked = rankVaultMemories(query, queryEmbedding, items, {
    limit: items.length,
    minSimilarity,
    ...(options?.supersessionBoost !== undefined && {
      supersessionBoost: options.supersessionBoost,
    }),
    ...(options?.supersessionWindow !== undefined && {
      supersessionWindow: options.supersessionWindow,
    }),
  });
  const baseIds = new Set(baseRanked.map((r) => r.uniqueId));

  // Stage 2 — BM25 admission for items not in the cosine ranking.
  const bm25Scores = scoreBM25(
    query,
    items.map((i) => ({ id: i.id, content: i.content }))
  );
  const itemById = new Map(items.map((i) => [i.id, i]));
  const admitted: VaultSearchResult[] = [];
  for (const item of items) {
    if (baseIds.has(item.id)) continue;
    const bm25 = bm25Scores.get(item.id) ?? 0;
    if (bm25 <= 0) continue;
    // Map BM25 score to a small floor under the cosine threshold so
    // BM25-only hits enter the ranking but rarely outrank cosine winners.
    admitted.push({
      uniqueId: item.id,
      content: item.content,
      similarity: Math.min(minSimilarity, bm25 / bm25AdmissionDivisor),
      createdAt: item.createdAt ?? item.updatedAt,
      updatedAt: item.updatedAt,
      eventTimeStart: item.eventTimeStart,
      sourceChunkIds: item.sourceChunkIds,
      eventTimeEnd: item.eventTimeEnd,
      eventTimeKind: item.eventTimeKind,
      factType: item.factType,
    });
  }

  // Stage 3 — recency + proof-count boosts on the union.
  // proof_count: re-observed facts get a small log-curve lift (Hindsight α=0.1).
  // Items with no proof_count (legacy / unset) treated as 1 → log(2)≈0.69 → boost ~7%.
  const boostFor = (id: string): number => {
    const item = itemById.get(id);
    const recency = recencyMultiplier(item?.updatedAt, options?.recency);
    const recencyBoost = 1 + recencyAlpha * (recency - 0.5);
    const proofCount = Math.max(1, item?.proofCount ?? 1);
    const proofBoost =
      1 + proofCountAlpha * Math.log(1 + proofCount) - proofCountAlpha * Math.log(2);
    // PR5 — optional per-type weight. Absent type / untyped row / bad weight → 1.0.
    const rawTypeWeight = item?.factType ? factTypeWeights?.[item.factType] : undefined;
    const typeWeight =
      rawTypeWeight !== undefined && Number.isFinite(rawTypeWeight) && rawTypeWeight > 0
        ? rawTypeWeight
        : 1;
    return recencyBoost * proofBoost * typeWeight;
  };
  let combined: VaultSearchResult[] = [...baseRanked, ...admitted].map((r) => ({
    ...r,
    similarity: r.similarity * boostFor(r.uniqueId),
  }));

  // Stage 4 — W5 graph lane fusion. RRF the boosted cosine+BM25 head with
  // the entity-overlap ranking. Same logic as the async/CE path: graph
  // remains a retrieval lane (admits zero-cosine candidates with shared
  // entities) without overruling cosine on items it has already seen.
  // Cosine head weighted 2× via duplication so each side lane is a
  // tiebreaker, not an overrule.
  const sideLanes: string[][] = [];
  if (options?.entityRanking && options.entityRanking.length > 0) {
    sideLanes.push(options.entityRanking);
  }
  if (options?.temporalRanking && options.temporalRanking.length > 0) {
    sideLanes.push(options.temporalRanking);
  }
  if (sideLanes.length > 0) {
    combined.sort((a, b) => b.similarity - a.similarity);
    const headIds = combined.map((r) => r.uniqueId);
    const fused = rrfFuse([headIds, headIds, ...sideLanes], options?.rrfK);
    // Multiply boostFor back in so the recency · proof multiplier from
    // Stage 3 isn't discarded by the RRF score replacement. Without
    // this, the high-budget side-lane path drops exactly the signal
    // it's supposed to layer on top of cosine + BM25.
    combined = combined.map((r) => ({
      ...r,
      similarity: (fused.get(r.uniqueId) ?? 0) * boostFor(r.uniqueId),
    }));
    const seen = new Set(combined.map((r) => r.uniqueId));
    for (const lane of sideLanes) {
      for (const id of lane) {
        if (seen.has(id)) continue;
        const it = itemById.get(id);
        if (!it) continue;
        combined.push({
          uniqueId: id,
          content: it.content,
          similarity: (fused.get(id) ?? 0) * boostFor(id),
          createdAt: it.createdAt ?? it.updatedAt,
          updatedAt: it.updatedAt,
          sourceChunkIds: it.sourceChunkIds,
        });
        seen.add(id);
      }
    }
  }

  return combined.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
}

/**
 * Knowledge-graph retrieval lane (W5).
 *
 * Returns a ranked list of items by entity-overlap score, descending. Items
 * with zero shared entities are dropped — graph is a *retrieval lane*, not
 * a boost: it surfaces candidates that the cosine/BM25 lanes might miss,
 * and contributes to final ordering through RRF fusion (in
 * {@link rankFusedVaultMemoriesAsync} and {@link rankComposite}).
 *
 * Score formula: `tanh(0.5 × shared_entity_count)` — copied from Hindsight's
 * `link_expansion_retrieval.py`. Count-based (not ratio): a memory sharing
 * 3 entities scores higher than one sharing "1-of-1", which is what
 * "tell me about Peter" actually wants. Saturates near 3+ entities so a
 * memory tagged with every query entity doesn't blow out the rest.
 *
 * The returned list contains only items with overlap > 0; callers fuse it
 * with V2/V2+CE rankings via RRF, so missing items contribute zero.
 */
export function rankByEntityOverlap(
  queryEntities: Set<string>,
  items: Array<{ id: string; content: string; entities: Set<string> }>
): VaultSearchResult[] {
  if (queryEntities.size === 0 || items.length === 0) return [];
  const scored: VaultSearchResult[] = [];
  for (const item of items) {
    let shared = 0;
    for (const e of queryEntities) if (item.entities.has(e)) shared++;
    if (shared === 0) continue;
    // entityRanking is consumed by upstream RRF as an id-only ranking;
    // eventTime / timestamps don't need to round-trip here since the
    // primary lane already carries them on the merged result.
    scored.push({
      uniqueId: item.id,
      content: item.content,
      similarity: Math.tanh(0.5 * shared),
    });
  }
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored;
}

/**
 * Async variant of {@link rankFusedVaultMemories} that adds an optional
 * cross-encoder rerank stage on top of the V2 pipeline. Mirrors Hindsight's
 * `budget: high` path where a CE refines the top-N candidates after the
 * lexical/semantic fusion stage.
 *
 * Combination: the CE score is folded in as a *multiplicative boost* on
 * the V2 score, not a replacement. This is intentional — CE values
 * lexical overlap (e.g. "Lives in Portland" outscores "Relocated to SF"
 * on a "where do I live now" query because of token match), so using CE
 * alone tanks temporal recall. Multiplicative blending keeps V2's
 * temporal+supersession signal while letting CE bump precision on
 * non-temporal categories.
 *
 * Pipeline:
 *  1. Run synchronous V2 ranker → top-N candidates
 *  2. Rerank those N with the cross-encoder (Xenova/ms-marco-MiniLM-L-6-v2)
 *  3. final = v2_score * (1 + ceWeight * ce_score)
 *  4. Sort, take top-K
 *
 * @param rerankTopN - how many V2 candidates to feed the reranker. Default 30.
 * @param ceWeight - multiplicative blend weight on the CE score. Default 0.1
 *   (tuned by sweep — ce=0.1 captures the precision/specificity wins from
 *   the CE without introducing the ranking-violation regressions that
 *   higher weights cause; CE's lexical bias on temporal queries dominates
 *   above ~0.3).
 *
 * @public
 */
export async function rankFusedVaultMemoriesAsync(
  query: string,
  queryEmbedding: number[],
  items: EmbeddedItem[],
  options?: {
    limit?: number;
    minSimilarity?: number;
    recencyAlpha?: number;
    recency?: RecencyOptions;
    rerank?: boolean;
    rerankTopN?: number;
    ceWeight?: number;
    /** Fraction of the score gap transferred old→new on supersession. Default 0.8. */
    supersessionBoost?: number;
    /** Hard cap on the supersession candidate window. Default 50. */
    supersessionWindow?: number;
    /** Proof-count log-boost scale. Default 0.1. */
    proofCountAlpha?: number;
    /** Divisor mapping BM25 scores to the admission floor. Default 50. */
    bm25AdmissionDivisor?: number;
    /** RRF smoothing constant for the side-lane fusion. Default 60. */
    rrfK?: number;
    /**
     * Apply Maximal Marginal Relevance after the relevance pass to spread
     * the top-K across distinct memory clusters. Off by default; on
     * lifts composite (multi-fact) recall significantly without
     * regressing single-answer categories.
     */
    mmr?: boolean;
    /** MMR diversity tradeoff. 1=pure relevance, 0=pure diversity. Default 0.7. */
    mmrLambda?: number;
    /** How many candidates to feed MMR. Default 20. */
    mmrTopN?: number;
    /**
     * W5 — knowledge-graph retrieval lane. Pre-built ranking of memory IDs
     * (descending by entity-overlap score). When provided, RRF-fuses with
     * the V2 ranking *before* CE rerank — graph is a retrieval lane, not
     * a boost. Build with {@link rankByEntityOverlap}.
     */
    entityRanking?: string[];
    /**
     * W6 — temporal retrieval lane. Pre-built ranking of memory IDs whose
     * event-time overlaps the resolved query window, descending by overlap
     * score. Same lane semantics as `entityRanking`.
     */
    temporalRanking?: string[];
    /** PR5 — optional per-FactType score multiplier. See
     * {@link rankFusedVaultMemories}. Empty/omitted = uniform (no-op). */
    factTypeWeights?: Record<string, number>;
    /**
     * Optional out-param. Set `{ applied: true }` iff the cross-encoder rerank
     * actually ran over a non-empty head (not merely requested-then-degraded,
     * and not skipped on an empty V2 head). Lets callers report an honest
     * `reranked` diagnostic per call.
     */
    rerankStats?: { applied: boolean };
    /**
     * Optional out-param. Set `{ hadResults: true }` iff the V2 head (cosine/BM25
     * fusion before side lanes) was non-empty. Lets callers distinguish "CE skipped
     * because V2 head was empty (lane-only hits)" from "CE failed on a non-empty head".
     */
    v2HeadStats?: { hadResults: boolean };
  }
): Promise<VaultSearchResult[]> {
  const limit = options?.limit ?? 5;
  const v2Ranked = rankFusedVaultMemories(query, queryEmbedding, items, {
    limit: items.length,
    minSimilarity: options?.minSimilarity,
    recencyAlpha: options?.recencyAlpha,
    recency: options?.recency,
    supersessionBoost: options?.supersessionBoost,
    supersessionWindow: options?.supersessionWindow,
    proofCountAlpha: options?.proofCountAlpha,
    bm25AdmissionDivisor: options?.bm25AdmissionDivisor,
    rrfK: options?.rrfK,
    ...(options?.factTypeWeights && { factTypeWeights: options.factTypeWeights }),
  });

  // Track whether the V2 head was non-empty (before side-lane fusion).
  // Used by recall() to distinguish "CE skipped on empty head" from "CE failed".
  if (options?.v2HeadStats) {
    options.v2HeadStats.hadResults = v2Ranked.length > 0;
  }

  // Don't short-circuit on empty V2: queries that only match the W5
  // (entityRanking) or W6 (temporalRanking) lanes still need to surface
  // their hits. The side-lane fusion below pulls candidates straight
  // from `items` when they're absent from the V2 head.
  // Note: lane-only hits skip the CE rerank even at budget:high — the
  // rerank stage runs over the V2 head, which is empty in that case.
  // Lane RRF still produces a usable ordering; CE precision is sacrificed
  // for the recall gain. Revisit if eval shows the lane-only path
  // needs CE.
  let combined: VaultSearchResult[];
  let tailSlice: VaultSearchResult[] = [];
  const itemById = new Map(items.map((i) => [i.id, i]));

  if (options?.rerank) {
    const rerankTopN = options.rerankTopN ?? 30;
    const ceWeight = options.ceWeight ?? 0.1;
    const headSlice = v2Ranked.slice(0, rerankTopN);

    // The cross-encoder runs on-device (transformers.js), not over the
    // network. Either way a rerank failure degrades to the V2 ordering we
    // already computed rather than erroring the whole recall — the executor's
    // outer catch would otherwise turn a CE hiccup into "Error searching vault"
    // and surface zero memories to the answer model. A missing optional dep
    // (RN) is the expected-unavailable case and logs at debug; genuine
    // transient failures warn. recall() reports the honest `reranked` flag via
    // isRerankerAvailable().
    try {
      const reranked = await rerankPairs(
        query,
        headSlice.map((r) => ({
          id: r.uniqueId,
          content: r.content,
          // C4: date-prefix the CE doc so temporal alignment influences rank.
          dateMs: rerankDateMs(itemById.get(r.uniqueId) ?? r),
        }))
      );
      tailSlice = v2Ranked.slice(rerankTopN);

      const v2ScoreById = new Map(headSlice.map((r) => [r.uniqueId, r.similarity]));
      const ceScoreById = new Map(reranked.map((r) => [r.id, r.score]));

      combined = headSlice.map((r) => {
        const v2 = v2ScoreById.get(r.uniqueId) ?? 0;
        const ce = ceScoreById.get(r.uniqueId) ?? 0;
        // Spread the source result so provenance (sourceChunkIds) and
        // event-time anchors survive the rerank — rebuilding a bare row
        // here strips them, and recall()'s cross-lane chunk suppression
        // then can't see which chunk a reranked fact came from.
        return { ...r, similarity: v2 * (1 + ceWeight * ce) };
      });
      combined.sort((a, b) => b.similarity - a.similarity);
      // CE ran over a real head — record it so recall() reports reranked
      // honestly. An empty head (lane-only hits) leaves applied=false.
      if (headSlice.length > 0 && options.rerankStats) options.rerankStats.applied = true;
    } catch (err) {
      if (err instanceof RerankerUnavailableError) {
        getLogger().debug("[memory/search] cross-encoder unavailable; using V2 ranking");
      } else {
        getLogger().warn("[memory/search] cross-encoder rerank failed; using V2 ranking", err);
      }
      combined = v2Ranked;
    }
  } else {
    combined = v2Ranked;
  }

  // W5 lane fusion — RRF the post-CE ranking with the entity-overlap
  // ranking. Lane fusion runs *after* CE rerank so the CE's lexical/
  // temporal signal isn't washed out by graph lift on superseded
  // memories (graph alone would pull "Lives in Portland" above
  // "Relocated to SF" on a "where now" query because both share user
  // entities; CE-then-RRF preserves the temporal demotion).
  //
  // CE-ranked head is weighted 2× so graph remains a tiebreaker that
  // surfaces candidates V2 missed entirely (e.g. zero-cosine items with
  // shared entities — the hard_negatives win), without overruling the
  // CE's lexical decisions on items it has already seen.
  const sideLanesAsync: string[][] = [];
  if (options?.entityRanking && options.entityRanking.length > 0) {
    sideLanesAsync.push(options.entityRanking);
  }
  if (options?.temporalRanking && options.temporalRanking.length > 0) {
    sideLanesAsync.push(options.temporalRanking);
  }
  if (sideLanesAsync.length > 0) {
    const headIds = combined.map((r) => r.uniqueId);
    const fused = rrfFuse([headIds, headIds, ...sideLanesAsync], options?.rrfK);
    const fusedHead = combined
      .map((r) => ({ ...r, similarity: fused.get(r.uniqueId) ?? r.similarity }))
      .sort((a, b) => b.similarity - a.similarity);
    // Items in side lanes but absent from the CE head re-enter the pipeline
    // at the bottom so they're available to RRF even if CE didn't see them.
    const seen = new Set(combined.map((r) => r.uniqueId));
    const itemById = new Map(items.map((i) => [i.id, i]));
    for (const lane of sideLanesAsync) {
      for (const id of lane) {
        if (seen.has(id)) continue;
        const it = itemById.get(id);
        if (!it) continue;
        fusedHead.push({
          uniqueId: id,
          content: it.content,
          similarity: fused.get(id) ?? 0,
          createdAt: it.createdAt ?? it.updatedAt,
          updatedAt: it.updatedAt,
          sourceChunkIds: it.sourceChunkIds,
        });
        seen.add(id);
      }
    }
    fusedHead.sort((a, b) => b.similarity - a.similarity);
    combined = fusedHead;
  }

  if (options?.mmr) {
    const lambda = options.mmrLambda ?? 0.7;
    const mmrTopN = options.mmrTopN ?? 20;
    const itemById = new Map(items.map((i) => [i.id, i]));
    const mmrCandidates = combined.slice(0, mmrTopN).map((r) => ({
      id: r.uniqueId,
      score: r.similarity,
      embedding: itemById.get(r.uniqueId)?.embedding ?? [],
      content: r.content,
    }));
    const picked = applyMMR(mmrCandidates, limit, lambda);
    const pickedIds = new Set(picked.map((p) => p.id));
    const resultMap = new Map(combined.map((r) => [r.uniqueId, r]));
    const pickedResults: VaultSearchResult[] = picked.map((p) => {
      const orig = resultMap.get(p.id);
      return {
        uniqueId: p.id,
        content: p.content,
        similarity: p.score,
        createdAt: orig?.createdAt,
        updatedAt: orig?.updatedAt,
        eventTimeStart: orig?.eventTimeStart,
        sourceChunkIds: orig?.sourceChunkIds,
        eventTimeEnd: orig?.eventTimeEnd,
        eventTimeKind: orig?.eventTimeKind,
        factType: orig?.factType,
      };
    });
    // For benchmark + temporal-margin analysis, callers that want the
    // long tail must pass `limit: items.length`. The function respects
    // limit strictly so production callers (tool executor) get exactly
    // what they asked for.
    const remainingTail = combined.filter((r) => !pickedIds.has(r.uniqueId));
    // Filter tailSlice too — an id present in both MMR picks and the
    // pre-MMR tail would otherwise appear twice in the returned list.
    const tailFiltered = tailSlice.filter((r) => !pickedIds.has(r.uniqueId));
    return [...pickedResults, ...remainingTail, ...tailFiltered].slice(0, limit);
  }

  return [...combined, ...tailSlice].slice(0, limit);
}

/**
 * Composite ranker — sub-query decomposition + RRF fusion.
 *
 * For abstract/multi-faceted questions ("tell me about the user", "what is
 * my tech stack"), the V2/V2+CE pipeline scores about equally against every
 * personal fact since the query has no lexical or semantic anchor. The fix
 * (LlamaIndex pattern, departing from Hindsight's "skip query rewriting"
 * stance because their workload is factual): rewrite the *left side* —
 * decompose into 3–5 concrete facets, run the existing fused ranker per
 * facet, fuse the rank lists with RRF.
 *
 * The recency/proof-count/supersession signals are already applied inside
 * each per-facet `rankFusedVaultMemories` call; RRF only fuses ranks, so
 * those boosts shape the per-facet ordering before fusion.
 *
 * Optional rerank stage scores the top-N fused candidates against the
 * *original* query (not the sub-queries) so a CE that sees "tell me about
 * X" can weight thematic relevance back into the ordering — useful when
 * sub-queries miss a facet the user actually cared about.
 *
 * @param subQueries  3–5 facet questions with pre-computed embeddings.
 * @returns Ranked results. When `limit < items.length`, the tail is
 *   appended in fused-score order so callers (e.g. the benchmark) can
 *   probe IDs beyond K for margin analysis.
 */
export async function rankComposite(
  originalQuery: string,
  originalQueryEmbedding: number[],
  subQueries: Array<{ query: string; embedding: number[] }>,
  items: EmbeddedItem[],
  options?: {
    limit?: number;
    minSimilarity?: number;
    recencyAlpha?: number;
    recency?: RecencyOptions;
    rerank?: boolean;
    rerankTopN?: number;
    ceWeight?: number;
    rrfK?: number;
    /** Fraction of the score gap transferred old→new on supersession. Default 0.8. */
    supersessionBoost?: number;
    /** Hard cap on the supersession candidate window. Default 50. */
    supersessionWindow?: number;
    /** Proof-count log-boost scale. Default 0.1. */
    proofCountAlpha?: number;
    /** Divisor mapping BM25 scores to the admission floor. Default 50. */
    bm25AdmissionDivisor?: number;
    /**
     * Apply an MMR diversity pass to the post-rerank head. Default off.
     * Same semantics as {@link rankFusedVaultMemoriesAsync} so an MMR
     * sweep means the same thing on the composite and specific paths.
     */
    mmr?: boolean;
    /** MMR relevance/diversity balance. Default 0.7 (relevance-biased). */
    mmrLambda?: number;
    /** Pool size fed to MMR. Default 20. */
    mmrTopN?: number;
    /**
     * Truncate each sub-query's ranked list before RRF. Default 10. The
     * LlamaIndex sub-query pattern is to fuse *top hits per facet*, not
     * full lists — long tails dilute the fusion signal because every
     * memory ends up in every list.
     */
    perFacetTopN?: number;
    /**
     * W5 — pre-built entity-overlap ranking of memory IDs. Added as an
     * additional RRF facet alongside the original query and sub-queries,
     * so memories sharing entities with the question get lifted by graph
     * convergence the same way they get lifted by sub-query convergence.
     * Build with {@link rankByEntityOverlap}.
     */
    entityRanking?: string[];
    /**
     * W6 — pre-built temporal-overlap ranking of memory IDs whose
     * event-time intersects the resolved query window. Added as a
     * top-N RRF facet so temporal hits survive composite decomposition.
     */
    temporalRanking?: string[];
    /** PR5 — optional per-FactType score multiplier forwarded to every
     * per-facet ranking. See {@link rankFusedVaultMemories}. Empty = no-op. */
    factTypeWeights?: Record<string, number>;
    /**
     * Bench-only: append every vault item absent from facet fusion to the
     * result at `similarity: 0`, so eval margin-analysis can locate any id.
     * Default OFF — production `recall()` must never see this zero-score tail
     * (it bypasses the caller's `minSimilarity`/`factMinScore` floor and pads
     * the answer LLM's context with zero-relevance memories). Set it only from
     * the eval harness.
     */
    includeUnrankedTail?: boolean;
    /**
     * Optional out-param. Set `{ applied: true }` iff the cross-encoder rerank
     * actually ran over a non-empty head. Same semantics as
     * {@link rankFusedVaultMemoriesAsync}'s `rerankStats`.
     */
    rerankStats?: { applied: boolean };
    /**
     * Optional out-param. Set `{ hadResults: true }` iff there were facet fusion
     * results before rerank. Lets callers distinguish "CE skipped on empty head"
     * from "CE failed on a non-empty head".
     */
    v2HeadStats?: { hadResults: boolean };
  }
): Promise<VaultSearchResult[]> {
  const limit = options?.limit ?? 5;
  const perFacetTopN = options?.perFacetTopN ?? 10;
  if (items.length === 0 || subQueries.length === 0) return [];

  // Shared tuning knobs forwarded to every per-facet ranking call.
  const facetTuning = {
    ...(options?.recencyAlpha !== undefined && { recencyAlpha: options.recencyAlpha }),
    ...(options?.recency && { recency: options.recency }),
    ...(options?.supersessionBoost !== undefined && {
      supersessionBoost: options.supersessionBoost,
    }),
    ...(options?.supersessionWindow !== undefined && {
      supersessionWindow: options.supersessionWindow,
    }),
    ...(options?.proofCountAlpha !== undefined && { proofCountAlpha: options.proofCountAlpha }),
    ...(options?.bm25AdmissionDivisor !== undefined && {
      bm25AdmissionDivisor: options.bm25AdmissionDivisor,
    }),
    ...(options?.rrfK !== undefined && { rrfK: options.rrfK }),
    ...(options?.factTypeWeights && { factTypeWeights: options.factTypeWeights }),
  };

  // Stage 1 — per-facet V2 ranking. Each sub-query contributes only its
  // top-N (default 10) to RRF. The original query also contributes a
  // ranking with extra weight (replicated facets) so that when a
  // technically-specific query is mislabeled as composite, the original
  // ranking dominates and rescues recall.
  const originalRanked = rankFusedVaultMemories(originalQuery, originalQueryEmbedding, items, {
    limit: perFacetTopN,
    minSimilarity: options?.minSimilarity ?? 0,
    ...facetTuning,
  }).map((r) => r.uniqueId);

  const perFacetRankings: string[][] = [];
  // Weight the original query 3x (triplicated facet) — empirically rescues
  // mis-classified specific queries without diluting true composites,
  // which still have 3–5 sub-query facets dominating the fusion.
  perFacetRankings.push(originalRanked, originalRanked, originalRanked);

  for (const sq of subQueries) {
    const ranked = rankFusedVaultMemories(sq.query, sq.embedding, items, {
      limit: perFacetTopN,
      minSimilarity: options?.minSimilarity ?? 0,
      ...facetTuning,
    });
    perFacetRankings.push(ranked.map((r) => r.uniqueId));
  }

  // W5 — graph lane as one more facet (truncated to the same top-N so it
  // doesn't dominate when the query has many shared entities).
  if (options?.entityRanking && options.entityRanking.length > 0) {
    perFacetRankings.push(options.entityRanking.slice(0, perFacetTopN));
  }
  // W6 — temporal lane facet, same truncation rule.
  if (options?.temporalRanking && options.temporalRanking.length > 0) {
    perFacetRankings.push(options.temporalRanking.slice(0, perFacetTopN));
  }

  // Stage 2 — RRF fusion across facet rankings.
  const fused = rrfFuse(perFacetRankings, options?.rrfK);
  const itemById = new Map(items.map((i) => [i.id, i]));
  const mappedResults: (VaultSearchResult | null)[] = Array.from(fused.entries()).map(
    ([id, score]) => {
      const item = itemById.get(id);
      if (!item) return null;
      return {
        uniqueId: id,
        content: item.content,
        similarity: score,
        createdAt: item.createdAt ?? item.updatedAt,
        updatedAt: item.updatedAt,
        eventTimeStart: item.eventTimeStart,
        sourceChunkIds: item.sourceChunkIds,
        eventTimeEnd: item.eventTimeEnd,
        eventTimeKind: item.eventTimeKind,
        factType: item.factType,
      };
    }
  );
  let combined: VaultSearchResult[] = mappedResults.filter(
    (r): r is VaultSearchResult => r !== null
  );
  combined.sort((a, b) => b.similarity - a.similarity);

  // Track whether there were facet fusion results (before rerank).
  // Used by recall() to distinguish "CE skipped on empty head" from "CE failed".
  if (options?.v2HeadStats) {
    options.v2HeadStats.hadResults = combined.length > 0;
  }

  // Bench parity (opt-in ONLY): append items absent from any facet's top-N at
  // similarity 0 so eval margin-analysis can locate any id. Never in
  // production — this tail bypasses the caller's minSimilarity floor and would
  // pad recall() (and the answer LLM) with zero-relevance memories.
  if (options?.includeUnrankedTail) {
    const fusedIds = new Set(combined.map((r) => r.uniqueId));
    for (const item of items) {
      if (!fusedIds.has(item.id)) {
        combined.push({
          uniqueId: item.id,
          content: item.content,
          similarity: 0,
          createdAt: item.createdAt ?? item.updatedAt,
          updatedAt: item.updatedAt,
          eventTimeStart: item.eventTimeStart,
          sourceChunkIds: item.sourceChunkIds,
          eventTimeEnd: item.eventTimeEnd,
          eventTimeKind: item.eventTimeKind,
          factType: item.factType,
        });
      }
    }
  }

  // Stage 3 — optional CE rerank against the *original* query. On a transient
  // CE failure, keep the already-computed fused ordering rather than letting
  // the throw bubble to the executor and zero the recall.
  if (options?.rerank && combined.length > 0) {
    const rerankTopN = options.rerankTopN ?? 30;
    const ceWeight = options.ceWeight ?? 0.1;
    const headSlice = combined.slice(0, rerankTopN);
    const tailSlice = combined.slice(rerankTopN);

    try {
      const reranked = await rerankPairs(
        originalQuery,
        headSlice.map((r) => ({
          id: r.uniqueId,
          content: r.content,
          // C4: date-prefix the CE doc so temporal alignment influences rank.
          dateMs: rerankDateMs(itemById.get(r.uniqueId) ?? r),
        }))
      );
      const ceById = new Map(reranked.map((r) => [r.id, r.score]));

      const head = headSlice.map((r) => ({
        ...r,
        similarity: r.similarity * (1 + ceWeight * (ceById.get(r.uniqueId) ?? 0)),
      }));
      head.sort((a, b) => b.similarity - a.similarity);
      combined = [...head, ...tailSlice];
      if (headSlice.length > 0 && options.rerankStats) options.rerankStats.applied = true;
    } catch (err) {
      if (err instanceof RerankerUnavailableError) {
        getLogger().debug("[memory/search] cross-encoder unavailable; using fused ranking");
      } else {
        getLogger().warn(
          "[memory/search] composite cross-encoder rerank failed; using fused ranking",
          err
        );
      }
    }
  }

  // Stage 4 — optional MMR diversity pass, mirroring
  // rankFusedVaultMemoriesAsync so the MMR knob behaves identically on
  // the composite path (previously it silently no-opped here).
  if (options?.mmr) {
    const lambda = options.mmrLambda ?? 0.7;
    const mmrTopN = options.mmrTopN ?? 20;
    const mmrCandidates = combined.slice(0, mmrTopN).map((r) => ({
      id: r.uniqueId,
      score: r.similarity,
      embedding: itemById.get(r.uniqueId)?.embedding ?? [],
      content: r.content,
    }));
    const picked = applyMMR(mmrCandidates, limit, lambda);
    const pickedIds = new Set(picked.map((p) => p.id));
    const resultMap = new Map(combined.map((r) => [r.uniqueId, r]));
    const pickedResults: VaultSearchResult[] = picked.map((p) => {
      const orig = resultMap.get(p.id);
      return {
        uniqueId: p.id,
        content: p.content,
        similarity: p.score,
        createdAt: orig?.createdAt,
        updatedAt: orig?.updatedAt,
        eventTimeStart: orig?.eventTimeStart,
        sourceChunkIds: orig?.sourceChunkIds,
        eventTimeEnd: orig?.eventTimeEnd,
        eventTimeKind: orig?.eventTimeKind,
        factType: orig?.factType,
      };
    });
    const remainingTail = combined.filter((r) => !pickedIds.has(r.uniqueId));
    return [...pickedResults, ...remainingTail].slice(0, limit);
  }

  return combined.slice(0, limit);
}

/**
 * Pre-embed all vault memories that are not yet in the cache.
 * Call this at init time so searches are instant.
 */
export async function preEmbedVaultMemories(
  vaultCtx: VaultMemoryOperationsContext,
  embeddingOptions: EmbeddingOptions,
  cache: VaultEmbeddingCache,
  options?: { scopes?: string[] }
): Promise<void> {
  const memories = await getAllVaultMemoriesOp(vaultCtx, options);
  const currentModel = embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL;
  const uncachedTexts: string[] = [];
  const uncachedKeys: string[] = [];
  const uncachedIds: string[] = [];
  for (const m of memories) {
    const content = m.content;
    // Never embed (or cache) ciphertext — decryption is best-effort and
    // returns the enc:vN: payload when the key is unavailable.
    if (isEncrypted(content)) continue;
    // Cache is keyed by memory id (not content): keeps plaintext out of the
    // key space and lets edits/deletes invalidate by id.
    if (!cache.has(m.uniqueId)) {
      // Use a persisted embedding only if it was produced by the current
      // model. null/undefined = legacy, grandfathered (coalesces to the
      // current model). Stale-model vectors are re-embedded so a model change
      // doesn't poison the cache.
      const modelCompatible = (m.embeddingModel ?? currentModel) === currentModel;
      if (m.embedding && modelCompatible) {
        try {
          const parsed = JSON.parse(m.embedding) as number[];
          if (Array.isArray(parsed)) {
            cache.set(m.uniqueId, Float32Array.from(parsed));
            continue;
          }
        } catch {
          // Invalid JSON, re-embed
        }
      }
      uncachedTexts.push(m.content);
      uncachedKeys.push(m.uniqueId);
      uncachedIds.push(m.uniqueId);
    }
  }
  if (uncachedTexts.length > 0) {
    const embeddings = await generateEmbeddings(uncachedTexts, embeddingOptions);
    for (let i = 0; i < uncachedKeys.length; i++) {
      cache.set(uncachedKeys[i], Float32Array.from(embeddings[i]));
      // Persist embedding + model to DB (fire-and-forget)
      updateVaultMemoryEmbeddingOp(
        vaultCtx,
        uncachedIds[i],
        JSON.stringify(embeddings[i]),
        currentModel
      ).catch(() => {});
    }
  }
}

/**
 * Eagerly embed a single piece of content and store it in the cache.
 * Call this when a vault memory is created or updated.
 */
export async function eagerEmbedContent(
  content: string,
  embeddingOptions: EmbeddingOptions,
  cache: VaultEmbeddingCache,
  vaultCtx?: VaultMemoryOperationsContext,
  memoryId?: string
): Promise<void> {
  // Same guard as preEmbedVaultMemories: never embed (or persist a
  // vector for) content that is still ciphertext — a caller passing DB
  // content while decryption is degraded would otherwise store a
  // ciphertext embedding that poisons ranking even after the key returns.
  if (isEncrypted(content)) return;
  const embedding = await generateEmbedding(content, embeddingOptions);
  // Cache is keyed by memory id (not content). Without an id there's nothing
  // to key on, so skip the cache write and rely on the DB-persist below /
  // next search to populate it.
  if (memoryId) cache.set(memoryId, Float32Array.from(embedding));
  if (vaultCtx && memoryId) {
    const currentModel = embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL;
    updateVaultMemoryEmbeddingOp(vaultCtx, memoryId, JSON.stringify(embedding), currentModel).catch(
      // Silently swallow – SDK must not use console.*; embedding will be retried on next search
      () => {}
    );
  }
}

/**
 * A single vault search result with its similarity score.
 */
export interface VaultSearchResult {
  uniqueId: string;
  content: string;
  similarity: number;
  /** Optional — surfaced by the rankers so downstream `RankedMemory` carries
   * real timestamps. Omitted when an item lacks the field upstream. */
  createdAt?: Date;
  updatedAt?: Date;
  /** Times this fact has been re-observed — for C2 trend labels. */
  proofCount?: number | null;
  /** C3 re-observation watermark (Unix ms) — for C2 trends + C4 CE dates. */
  lastObservedAt?: number | null;
  /** W6 temporal-lane anchors carried through to downstream `RankedMemory`
   * so the recall executor can surface dates to the answer model without
   * a second per-fact DB lookup + decrypt. Unix ms; null when the fact
   * has no anchored event time. */
  eventTimeStart?: number | null;
  eventTimeEnd?: number | null;
  eventTimeKind?: "point" | "range" | "ongoing" | null;
  /** Typed memory (PR1) — the fact's FactType, threaded through from the
   * storage row alongside the event-time anchors. Null/undefined when
   * untyped. Loose string (originates from a stored column). */
  factType?: string | null;
  /** Message ids this fact was extracted from (provenance). recall() uses
   * these to suppress the originating chunk in the chunk lane. */
  sourceChunkIds?: string[] | null;
}

/**
 * Internal search that also returns the vault size, avoiding a second vault load.
 */
export async function searchVaultMemoriesWithSize(
  query: string,
  vaultCtx: VaultMemoryOperationsContext,
  embeddingOptions: EmbeddingOptions,
  cache: VaultEmbeddingCache,
  searchOptions?: MemoryVaultSearchOptions
): Promise<{
  results: VaultSearchResult[];
  vaultSize: number;
  reranked: boolean;
  hadV2Head: boolean;
}> {
  const limit = searchOptions?.limit ?? 5;
  const minSimilarity = searchOptions?.minSimilarity ?? 0.1;
  const scopes = searchOptions?.scopes;

  if (!query || typeof query !== "string") {
    return { results: [], vaultSize: 0, reranked: false, hadV2Head: false };
  }

  const folderId = searchOptions?.folderId;

  const queryOpts: {
    scopes?: string[];
    folderId?: string | null;
    factTypes?: string[];
    includeArchived?: boolean;
  } = {};
  if (scopes?.length) queryOpts.scopes = scopes;
  if (folderId !== undefined) queryOpts.folderId = folderId;
  if (searchOptions?.factTypes?.length) queryOpts.factTypes = searchOptions.factTypes;
  if (searchOptions?.includeArchived) queryOpts.includeArchived = true;

  const loaded = await getAllVaultMemoriesOp(
    vaultCtx,
    Object.keys(queryOpts).length > 0 ? queryOpts : undefined
  );
  // Decryption is best-effort (decryptField returns the raw enc:vN:
  // payload when the key is unavailable). Still-encrypted content must
  // not reach ranking: BM25 would tokenize hex garbage, the embedder
  // would embed ciphertext, and the recall tool would hand enc:vN:
  // blocks to the answer model as "memories". Exclude and report.
  const memories = loaded.filter((m) => !isEncrypted(m.content));
  if (memories.length < loaded.length) {
    getLogger().warn(
      `memoryVault: ${loaded.length - memories.length}/${loaded.length} memories still ` +
        "encrypted (key unavailable?) — excluded from search"
    );
  }
  // vaultSize reports rows that EXIST (loaded), not rows that were
  // searchable: callers treat vaultSize === 0 as "the vault is empty —
  // nothing saved yet" and say so to the LLM, which would invite
  // duplicate saves while decryption is temporarily unavailable.
  if (memories.length === 0) {
    return { results: [], vaultSize: loaded.length, reranked: false, hadV2Head: false };
  }

  // Embed the query
  const queryEmbedding = await generateEmbedding(query, embeddingOptions);
  const currentModel = embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL;

  // Batch-(re)embed any vault entries that aren't cached with a usable vector.
  // A persisted DB vector is usable only when it (a) parses, (b) was produced
  // by the current model — `embedding_model` null is grandfathered as
  // current-model-compatible (legacy rows), non-null must match — and (c) has
  // the same dimension as the query embedding. Stale-model or wrong-dim vectors
  // are re-embedded and re-stamped instead of being loaded; otherwise an
  // embedding-model change would silently rank the whole vault at cosine 0.
  const uncachedTexts: string[] = [];
  const uncachedIndices: number[] = [];
  let staleReembedCount = 0;
  for (let i = 0; i < memories.length; i++) {
    const content = memories[i].content;
    const memoryId = memories[i].uniqueId;
    // A cache hit is usable only if its dimension matches the query. The cache
    // is keyed by memory id (not model) and can be seeded by preEmbedVaultMemories
    // — which has no query vector to dim-check against — so a grandfathered
    // wrong-dim vector could otherwise live in the cache and evade re-embed.
    const cached = cache.get(memoryId);
    if (cached && cached.length === queryEmbedding.length) continue;
    if (cached) cache.delete(memoryId); // wrong-dim cache entry — drop and re-resolve

    // Check for a usable persisted embedding in DB first. null/undefined model
    // is grandfathered (coalesces to current); a real different model is stale.
    const storedModel = memories[i].embeddingModel;
    const modelCompatible = (storedModel ?? currentModel) === currentModel;
    if (memories[i].embedding && modelCompatible) {
      try {
        const parsed = JSON.parse(memories[i].embedding!) as number[];
        if (Array.isArray(parsed) && parsed.length === queryEmbedding.length) {
          cache.set(memoryId, Float32Array.from(parsed));
          continue;
        }
        // Dimension mismatch — model changed dims (even a grandfathered
        // null row). Fall through to re-embed.
      } catch {
        // Invalid JSON, re-embed
      }
    }
    if (memories[i].embedding && !modelCompatible) staleReembedCount++;
    uncachedTexts.push(content);
    uncachedIndices.push(i);
  }
  if (staleReembedCount > 0) {
    getLogger().warn(
      `memoryVault: re-embedding ${staleReembedCount} memories whose stored embedding ` +
        `model differs from the current model (${currentModel}) — embedding-model change detected`
    );
  }
  if (uncachedTexts.length > 0) {
    const newEmbeddings = await generateEmbeddings(uncachedTexts, embeddingOptions);
    for (let j = 0; j < uncachedTexts.length; j++) {
      cache.set(memories[uncachedIndices[j]].uniqueId, Float32Array.from(newEmbeddings[j]));
      // Persist embedding + model to DB (fire-and-forget)
      updateVaultMemoryEmbeddingOp(
        vaultCtx,
        memories[uncachedIndices[j]].uniqueId,
        JSON.stringify(newEmbeddings[j]),
        currentModel
      ).catch(
        // Silently swallow – SDK must not use console.*; embedding will be retried on next search
        () => {}
      );
    }
  }

  // Missing embeddings → []; cosine returns 0 (lane no-op), but W5/W6
  // side lanes can still admit the row.
  const embeddedItems: EmbeddedItem[] = memories.map((m) => ({
    id: m.uniqueId,
    content: m.content,
    embedding: cache.get(m.uniqueId) ?? [],
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    proofCount: m.proofCount,
    lastObservedAt: m.lastObservedAt,
    eventTimeStart: m.eventTimeStart,
    sourceChunkIds: m.sourceChunkIds,
    eventTimeEnd: m.eventTimeEnd,
    eventTimeKind: normalizeEventTimeKind(m.eventTimeKind),
    factType: m.factType,
  }));

  // Dimension net. The load loop above re-embeds stale-model and wrong-dim
  // vectors, so this should normally be empty; it still fires if a re-embed
  // returned an inconsistent dimension (model/API drift mid-batch). A nonzero
  // count here means those rows score 0 on cosine — keep the warn so the
  // condition stays debuggable rather than silently emptying recall.
  if (queryEmbedding.length > 0) {
    const mismatched = embeddedItems.filter(
      (it) => it.embedding.length > 0 && it.embedding.length !== queryEmbedding.length
    ).length;
    if (mismatched > 0) {
      getLogger().warn(
        `memoryVault: ${mismatched}/${embeddedItems.length} embeddings still mismatch the query ` +
          `dimension (${queryEmbedding.length}) after re-embed — possible embedding model/API drift`
      );
    }
  }

  // The rankers below all return bare {uniqueId, content, similarity}
  // — they're pure functions over EmbeddedItem and don't always carry the
  // memory's timestamps / C2–C4 metadata. Stamp on the way out so
  // downstream RankedMemory is complete even when a lane rebuilds a row.
  const metaById = new Map(
    memories.map((m) => [
      m.uniqueId,
      {
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        proofCount: m.proofCount,
        lastObservedAt: m.lastObservedAt,
      },
    ])
  );
  const stampTimestamps = (out: {
    results: VaultSearchResult[];
    vaultSize: number;
    reranked?: boolean;
    hadV2Head?: boolean;
  }): {
    results: VaultSearchResult[];
    vaultSize: number;
    reranked: boolean;
    hadV2Head: boolean;
  } => {
    const results = out.results.map((r) => {
      const meta = metaById.get(r.uniqueId);
      return meta
        ? {
            ...r,
            createdAt: meta.createdAt,
            updatedAt: meta.updatedAt,
            proofCount: meta.proofCount,
            lastObservedAt: meta.lastObservedAt,
          }
        : r;
    });
    return {
      results,
      vaultSize: out.vaultSize,
      reranked: out.reranked ?? false,
      hadV2Head: out.hadV2Head ?? false,
    };
  };

  // Records whether the cross-encoder actually ran (set by the async rankers
  // on a real, non-empty head). Threaded up so recall() reports reranked
  // per-call — not "requested" (which lied on RN) and not "ever loaded".
  const rerankStats = { applied: false };

  const useFusion = searchOptions?.useFusion ?? true;

  // Ranking tuning knobs shared by every fusion path below. Only defined
  // fields are forwarded so each ranker's own defaults stay authoritative.
  const tuning = {
    ...(searchOptions?.recencyAlpha !== undefined && { recencyAlpha: searchOptions.recencyAlpha }),
    ...(searchOptions?.recency && { recency: searchOptions.recency }),
    ...(searchOptions?.supersessionBoost !== undefined && {
      supersessionBoost: searchOptions.supersessionBoost,
    }),
    ...(searchOptions?.supersessionWindow !== undefined && {
      supersessionWindow: searchOptions.supersessionWindow,
    }),
    ...(searchOptions?.proofCountAlpha !== undefined && {
      proofCountAlpha: searchOptions.proofCountAlpha,
    }),
    ...(searchOptions?.bm25AdmissionDivisor !== undefined && {
      bm25AdmissionDivisor: searchOptions.bm25AdmissionDivisor,
    }),
    ...(searchOptions?.rrfK !== undefined && { rrfK: searchOptions.rrfK }),
    ...(searchOptions?.factTypeWeights && { factTypeWeights: searchOptions.factTypeWeights }),
  };

  // Composite path — LLM decomposes the query into sub-queries, embeds them,
  // and runs the multi-facet RRF ranker. Falls through to V2/V2+CE on
  // "specific" mode so single-fact queries don't pay the decomposition cost.
  if (useFusion && searchOptions?.decompose === "llm" && searchOptions.decomposeOptions) {
    const decomp = await decomposeQuery(query, searchOptions.decomposeOptions);
    if (decomp.mode === "composite") {
      const subEmbeddings = await generateEmbeddings(decomp.subQueries, embeddingOptions);
      const subQueries = decomp.subQueries.map((sq, i) => ({
        query: sq,
        embedding: subEmbeddings[i],
      }));
      const v2HeadStats = { hadResults: false };
      const composite = await rankComposite(query, queryEmbedding, subQueries, embeddedItems, {
        limit,
        minSimilarity,
        rerank: !!searchOptions.rerank,
        ...(searchOptions.rerankTopN !== undefined && {
          rerankTopN: searchOptions.rerankTopN,
        }),
        ...(searchOptions.ceWeight !== undefined && { ceWeight: searchOptions.ceWeight }),
        ...(searchOptions.mmr !== undefined && { mmr: searchOptions.mmr }),
        ...tuning,
        ...(searchOptions.entityRanking && { entityRanking: searchOptions.entityRanking }),
        ...(searchOptions.temporalRanking && { temporalRanking: searchOptions.temporalRanking }),
        rerankStats,
        v2HeadStats,
      });
      return stampTimestamps({
        results: composite,
        vaultSize: loaded.length,
        reranked: rerankStats.applied,
        hadV2Head: v2HeadStats.hadResults,
      });
    }
    // mode === "specific" — fall through to V2/V2+CE below.
  }

  if (useFusion && searchOptions?.rerank) {
    const v2HeadStats = { hadResults: false };
    const results = await rankFusedVaultMemoriesAsync(query, queryEmbedding, embeddedItems, {
      limit,
      minSimilarity,
      rerank: true,
      ...(searchOptions.rerankTopN !== undefined && {
        rerankTopN: searchOptions.rerankTopN,
      }),
      ...(searchOptions.ceWeight !== undefined && { ceWeight: searchOptions.ceWeight }),
      ...(searchOptions.mmr !== undefined && { mmr: searchOptions.mmr }),
      ...tuning,
      ...(searchOptions.entityRanking && { entityRanking: searchOptions.entityRanking }),
      ...(searchOptions.temporalRanking && { temporalRanking: searchOptions.temporalRanking }),
      rerankStats,
      v2HeadStats,
    });
    return stampTimestamps({
      results,
      vaultSize: loaded.length,
      reranked: rerankStats.applied,
      hadV2Head: v2HeadStats.hadResults,
    });
  }

  if (useFusion) {
    const results = rankFusedVaultMemories(query, queryEmbedding, embeddedItems, {
      limit,
      minSimilarity,
      ...tuning,
      ...(searchOptions?.entityRanking && { entityRanking: searchOptions.entityRanking }),
      ...(searchOptions?.temporalRanking && { temporalRanking: searchOptions.temporalRanking }),
    });
    // Sync fusion path doesn't rerank, so hadV2Head is true if any results exist.
    return stampTimestamps({ results, vaultSize: loaded.length, hadV2Head: results.length > 0 });
  }

  const results = rankVaultMemories(query, queryEmbedding, embeddedItems, {
    limit,
    minSimilarity,
    ...(searchOptions?.supersessionBoost !== undefined && {
      supersessionBoost: searchOptions.supersessionBoost,
    }),
    ...(searchOptions?.supersessionWindow !== undefined && {
      supersessionWindow: searchOptions.supersessionWindow,
    }),
  });

  // Cosine-only path doesn't rerank, so hadV2Head is true if any results exist.
  return stampTimestamps({ results, vaultSize: loaded.length, hadV2Head: results.length > 0 });
}

/**
 * Search vault memories by semantic similarity. Returns structured results
 * sorted by descending similarity, filtered by threshold and limit.
 *
 * This is the standalone search logic extracted from `createMemoryVaultSearchTool`
 * so it can be called programmatically (e.g., for pre-retrieval injection).
 *
 * @returns Sorted results (empty array on invalid input or empty vault)
 */
export async function searchVaultMemories(
  query: string,
  vaultCtx: VaultMemoryOperationsContext,
  embeddingOptions: EmbeddingOptions,
  cache: VaultEmbeddingCache,
  searchOptions?: MemoryVaultSearchOptions
): Promise<VaultSearchResult[]> {
  const { results } = await searchVaultMemoriesWithSize(
    query,
    vaultCtx,
    embeddingOptions,
    cache,
    searchOptions
  );
  return results;
}

/** Numbered "[N] (id: …, similarity: …)\n<content>" rendering shared by the
 * chat-tool's recall-delegated and useFusion:false branches. */
function formatVaultHits(hits: Array<{ id: string; content: string; score: number }>): string {
  return hits
    .map((h, i) => `[${i + 1}] (id: ${h.id}, similarity: ${h.score.toFixed(2)})\n${h.content}`)
    .join("\n\n");
}

/**
 * Creates a memory vault search tool for use with chat completions.
 *
 * The tool allows the LLM to search through vault memories using semantic
 * similarity. Vault entries should have their embeddings pre-computed in the
 * cache (via preEmbedVaultMemories or eagerEmbedContent). Any missing
 * embeddings are computed on the fly as a fallback.
 *
 * @param vaultCtx - Vault operations context for database access
 * @param embeddingOptions - Options for embedding generation (auth, base URL)
 * @param cache - Pre-populated embedding cache
 * @param searchOptions - Optional search configuration
 * @returns A ToolConfig that can be passed to chat completion tools
 */
export function createMemoryVaultSearchTool(
  vaultCtx: VaultMemoryOperationsContext,
  embeddingOptions: EmbeddingOptions,
  cache: VaultEmbeddingCache,
  searchOptions?: MemoryVaultSearchOptions
): ToolConfig {
  const limit = searchOptions?.limit ?? 5;
  const minSimilarity = searchOptions?.minSimilarity ?? 0.1;

  // Ranking tuning knobs forwarded verbatim to recall() (fusion path) and
  // searchVaultMemories (legacy cosine path). Only defined fields are
  // forwarded so the downstream defaults stay authoritative.
  const tuningForward = {
    ...(searchOptions?.rerankTopN !== undefined && { rerankTopN: searchOptions.rerankTopN }),
    ...(searchOptions?.ceWeight !== undefined && { ceWeight: searchOptions.ceWeight }),
    ...(searchOptions?.recencyAlpha !== undefined && { recencyAlpha: searchOptions.recencyAlpha }),
    ...(searchOptions?.recency && { recency: searchOptions.recency }),
    ...(searchOptions?.mmr !== undefined && { mmr: searchOptions.mmr }),
    ...(searchOptions?.supersessionBoost !== undefined && {
      supersessionBoost: searchOptions.supersessionBoost,
    }),
    ...(searchOptions?.supersessionWindow !== undefined && {
      supersessionWindow: searchOptions.supersessionWindow,
    }),
    ...(searchOptions?.proofCountAlpha !== undefined && {
      proofCountAlpha: searchOptions.proofCountAlpha,
    }),
    ...(searchOptions?.bm25AdmissionDivisor !== undefined && {
      bm25AdmissionDivisor: searchOptions.bm25AdmissionDivisor,
    }),
    ...(searchOptions?.rrfK !== undefined && { rrfK: searchOptions.rrfK }),
  };

  return {
    type: "function",
    function: {
      name: "memory_vault_search",
      description:
        "Search the user's memory vault for stored facts and preferences using semantic similarity. " +
        "Use this before saving a new vault memory to check for duplicates, and whenever the user's " +
        "question might relate to something previously stored (their name, preferences, important facts). " +
        "Returns matching entries with their IDs for reference or updates.",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Natural language search query to match against vault memories.",
          },
          limit: {
            type: "integer",
            description: `Maximum number of results to return. Default: ${limit}.`,
          },
          folder_id: {
            type: ["string", "null"],
            description:
              "Optional folder ID to scope the search to a specific folder. " +
              "Pass null to search only unfiled memories. " +
              "Omit to search all folders.",
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>): Promise<string> => {
      const query = args.query as string;
      const requestLimit = (args.limit as number) ?? limit;
      const argFolderId = args.folder_id as string | null | undefined;

      if (!query || typeof query !== "string") {
        return "Error: A search query is required.";
      }

      try {
        // Route through the unified recall() API so the chat tool, the
        // SDK's programmatic surface, and any future consumer all share
        // one ranking pipeline. searchOptions.rerank/decompose/decomposeOptions
        // map onto recall's `budget` for the legacy MemoryVaultSearchOptions
        // shape.
        const budget: "low" | "mid" | "high" =
          searchOptions?.decompose === "llm" && searchOptions.decomposeOptions
            ? "high"
            : searchOptions?.rerank
              ? "mid"
              : "low";
        // Host's configured folder wins — the LLM can't escape a host-
        // imposed scope. When the host has *not* set a folder, the LLM's
        // explicit folder_id (including `null` for unfiled) is used.
        const folderId = searchOptions?.folderId ?? argFolderId;

        // useFusion:false callers want cosine-only — skip recall's fusion.
        if (searchOptions?.useFusion === false) {
          const legacy = await searchVaultMemories(query, vaultCtx, embeddingOptions, cache, {
            limit: requestLimit,
            minSimilarity,
            useFusion: false,
            ...tuningForward,
            ...(folderId !== undefined && { folderId }),
            ...(searchOptions?.scopes && { scopes: searchOptions.scopes }),
          });
          if (legacy.length === 0) {
            return "No relevant memories found in the vault.";
          }
          return formatVaultHits(
            legacy.map((r) => ({ id: r.uniqueId, content: r.content, score: r.similarity }))
          );
        }

        const { recall } = await import("../memory/recall.js");
        const result = await recall(
          query,
          { vaultCtx, embeddingOptions, vaultCache: cache },
          {
            types: ["fact"],
            limit: requestLimit,
            minScore: minSimilarity,
            budget,
            ...tuningForward,
            ...(folderId !== undefined && { folderId }),
            ...(searchOptions?.scopes && { scopes: searchOptions.scopes }),
            ...(searchOptions?.decompose === "llm" &&
              searchOptions.decomposeOptions && {
                decomposeOptions: searchOptions.decomposeOptions,
              }),
          }
        );

        if (result.vaultSize === 0) {
          const hasFolderFilter =
            searchOptions?.folderId !== undefined || argFolderId !== undefined;
          if (hasFolderFilter) {
            return "No memories found in this folder.";
          }
          return "The memory vault is empty. No memories have been saved yet.";
        }

        if (result.memories.length === 0) {
          return "No relevant memories found in the vault.";
        }

        // Surface whatever ranker score the pipeline produced (fused
        // under useFusion=true, raw cosine when useFusion=false). The
        // LLM sees a single "similarity" number on the same scale the
        // legacy tool returned — the underlying metric just changes
        // with the active ranking mode.
        const formatted = formatVaultHits(
          result.memories.map((m) => ({
            id: m.id,
            content: m.content,
            score: m.scoreBreakdown?.fused ?? m.scoreBreakdown?.cosine ?? m.score,
          }))
        );
        return `Found ${result.memories.length} vault memories:\n\n${formatted}`;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return `Error searching vault: ${message}`;
      }
    },
  };
}
