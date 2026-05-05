/**
 * Memory Vault Search Tool
 *
 * Provides a tool for LLMs to search the user's memory vault
 * using semantic similarity over pre-computed embeddings.
 */

import type { ToolConfig } from "../chat/useChat/types";
import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import { getAllVaultMemoriesOp, updateVaultMemoryEmbeddingOp } from "../db/memoryVault/operations";
import { applyMMR } from "../memory/mmr";
import { recencyMultiplier, type RecencyOptions } from "../memory/recency";
import { rerankPairs } from "../memory/reranker";
import { rrfFuse } from "../memory/rrf";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import type { EmbeddingOptions } from "../memoryEngine/types";
import { scoreBM25 } from "./bm25";
import { decomposeQuery } from "./decomposeQuery";

export { createVaultEmbeddingCache, DEFAULT_VAULT_CACHE_SIZE } from "./lruCache";

/**
 * Embedding cache keyed by content string. Stores pre-computed embeddings
 * so that search only needs to embed the query, not the vault entries.
 */
export type VaultEmbeddingCache = Map<string, number[]>;

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
  /**
   * LLM-based query decomposition for composite/abstract queries. When set,
   * each query is classified + (if composite) decomposed into 3–5 facet
   * sub-queries via gpt-5-mini, then ranked via {@link rankComposite}.
   * Requires `decomposeOptions` (auth) when set to "llm".
   */
  decompose?: "off" | "llm";
  /** Auth + endpoint for the decomposition LLM call. Required when decompose="llm". */
  decomposeOptions?: {
    apiKey: string;
    baseUrl?: string;
    model?: string;
  };
}

/**
 * Compute cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * An item with a pre-computed embedding, ready for ranking.
 */
interface EmbeddedItem {
  id: string;
  content: string;
  embedding: number[];
  /** Last update timestamp — used for supersession detection. */
  updatedAt?: Date;
  /** Number of times this fact has been re-observed (W4 — auto-merge). */
  proofCount?: number | null;
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
function supersessionDelta(olderScore: number, newerScore: number): number {
  const gap = olderScore - newerScore;
  return gap * SUPERSESSION_BOOST_FACTOR;
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
  candidates: Array<{ id: string; embedding: number[]; updatedAt?: Date; similarity: number }>
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
  }
): VaultSearchResult[] {
  const limit = options?.limit ?? 5;
  const minSimilarity = options?.minSimilarity ?? 0.1;

  const scored = items.map((item) => ({
    uniqueId: item.id,
    content: item.content,
    embedding: item.embedding,
    updatedAt: item.updatedAt,
    similarity: cosineSimilarity(queryEmbedding, item.embedding),
  }));

  const filtered = scored.filter((r) => r.similarity >= minSimilarity);
  filtered.sort((a, b) => b.similarity - a.similarity);

  // Check top candidates for supersession — boost newer items and penalize
  // older ones when they are highly similar and the older one outranks.
  // Capped at SUPERSESSION_MAX_WINDOW to keep O(n²) bounded; tail items are
  // already too low-ranked for supersession to matter.
  const window = filtered.slice(0, Math.min(limit * 3, SUPERSESSION_MAX_WINDOW));
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
      const delta = supersessionDelta(oldScore, newScore);
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

  return filtered.slice(0, limit).map((r) => ({
    uniqueId: r.uniqueId,
    content: r.content,
    similarity: r.similarity,
  }));
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
  }
): VaultSearchResult[] {
  const limit = options?.limit ?? 5;
  const minSimilarity = options?.minSimilarity ?? 0.1;
  const recencyAlpha = options?.recencyAlpha ?? 1.0;

  if (items.length === 0) return [];

  // Stage 1 — base cosine + supersession via existing ranker.
  const baseRanked = rankVaultMemories(query, queryEmbedding, items, {
    limit: items.length,
    minSimilarity,
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
      similarity: Math.min(minSimilarity, bm25 / 50),
    });
  }

  // Stage 3 — recency + proof-count boosts on the union.
  // proof_count: re-observed facts get a small log-curve lift (Hindsight α=0.1).
  // Items with no proof_count (legacy / unset) treated as 1 → log(2)≈0.69 → boost ~7%.
  const combined = [...baseRanked, ...admitted].map((r) => {
    const item = itemById.get(r.uniqueId);
    const recency = recencyMultiplier(item?.updatedAt, options?.recency);
    const recencyBoost = 1 + recencyAlpha * (recency - 0.5);
    const proofCount = Math.max(1, item?.proofCount ?? 1);
    const proofBoost = 1 + 0.1 * Math.log(1 + proofCount) - 0.1 * Math.log(2);
    return { ...r, similarity: r.similarity * recencyBoost * proofBoost };
  });

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
  }
): Promise<VaultSearchResult[]> {
  const limit = options?.limit ?? 5;
  const v2Ranked = rankFusedVaultMemories(query, queryEmbedding, items, {
    limit: items.length,
    minSimilarity: options?.minSimilarity,
    recencyAlpha: options?.recencyAlpha,
    recency: options?.recency,
  });

  if (v2Ranked.length === 0) return [];

  let combined: VaultSearchResult[];
  let tailSlice: VaultSearchResult[] = [];

  if (options?.rerank) {
    const rerankTopN = options.rerankTopN ?? 30;
    const ceWeight = options.ceWeight ?? 0.1;
    const headSlice = v2Ranked.slice(0, rerankTopN);
    tailSlice = v2Ranked.slice(rerankTopN);

    const reranked = await rerankPairs(
      query,
      headSlice.map((r) => ({ id: r.uniqueId, content: r.content }))
    );

    const v2ScoreById = new Map(headSlice.map((r) => [r.uniqueId, r.similarity]));
    const ceScoreById = new Map(reranked.map((r) => [r.id, r.score]));

    combined = headSlice.map((r) => {
      const v2 = v2ScoreById.get(r.uniqueId) ?? 0;
      const ce = ceScoreById.get(r.uniqueId) ?? 0;
      return {
        uniqueId: r.uniqueId,
        content: r.content,
        similarity: v2 * (1 + ceWeight * ce),
      };
    });
    combined.sort((a, b) => b.similarity - a.similarity);
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
  if (options?.entityRanking && options.entityRanking.length > 0) {
    const headIds = combined.map((r) => r.uniqueId);
    const fused = rrfFuse([headIds, headIds, options.entityRanking]);
    const fusedHead = combined
      .map((r) => ({ ...r, similarity: fused.get(r.uniqueId) ?? r.similarity }))
      .sort((a, b) => b.similarity - a.similarity);
    // Items in entityRanking but absent from the CE head re-enter the
    // pipeline at the bottom of `combined` so they're available to RRF
    // even if CE didn't see them. Their score is the graph-only RRF
    // contribution.
    const seen = new Set(combined.map((r) => r.uniqueId));
    const itemById = new Map(items.map((i) => [i.id, i]));
    for (const id of options.entityRanking) {
      if (seen.has(id)) continue;
      const it = itemById.get(id);
      if (!it) continue;
      fusedHead.push({
        uniqueId: id,
        content: it.content,
        similarity: fused.get(id) ?? 0,
      });
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
    const pickedResults: VaultSearchResult[] = picked.map((p) => ({
      uniqueId: p.id,
      content: p.content,
      similarity: p.score,
    }));
    // For benchmark + temporal-margin analysis, callers that want the
    // long tail must pass `limit: items.length`. The function respects
    // limit strictly so production callers (tool executor) get exactly
    // what they asked for.
    const remainingTail = combined.filter((r) => !pickedIds.has(r.uniqueId));
    return [...pickedResults, ...remainingTail, ...tailSlice].slice(0, limit);
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
  }
): Promise<VaultSearchResult[]> {
  const limit = options?.limit ?? 5;
  const perFacetTopN = options?.perFacetTopN ?? 10;
  if (items.length === 0 || subQueries.length === 0) return [];

  // Stage 1 — per-facet V2 ranking. Each sub-query contributes only its
  // top-N (default 10) to RRF. The original query also contributes a
  // ranking with extra weight (replicated facets) so that when a
  // technically-specific query is mislabeled as composite, the original
  // ranking dominates and rescues recall.
  const originalRanked = rankFusedVaultMemories(originalQuery, originalQueryEmbedding, items, {
    limit: perFacetTopN,
    minSimilarity: options?.minSimilarity ?? 0,
    ...(options?.recencyAlpha !== undefined && { recencyAlpha: options.recencyAlpha }),
    ...(options?.recency && { recency: options.recency }),
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
      ...(options?.recencyAlpha !== undefined && { recencyAlpha: options.recencyAlpha }),
      ...(options?.recency && { recency: options.recency }),
    });
    perFacetRankings.push(ranked.map((r) => r.uniqueId));
  }

  // W5 — graph lane as one more facet (truncated to the same top-N so it
  // doesn't dominate when the query has many shared entities).
  if (options?.entityRanking && options.entityRanking.length > 0) {
    perFacetRankings.push(options.entityRanking.slice(0, perFacetTopN));
  }

  // Stage 2 — RRF fusion across facet rankings.
  const fused = rrfFuse(perFacetRankings, options?.rrfK);
  const itemById = new Map(items.map((i) => [i.id, i]));
  let combined: VaultSearchResult[] = Array.from(fused.entries())
    .map(([id, score]) => {
      const item = itemById.get(id);
      if (!item) return null;
      return { uniqueId: id, content: item.content, similarity: score };
    })
    .filter((r): r is VaultSearchResult => r !== null);
  combined.sort((a, b) => b.similarity - a.similarity);

  // Bench parity: append items absent from any facet's top-N so the
  // returned list covers all items (margin analysis needs any ID locatable).
  const fusedIds = new Set(combined.map((r) => r.uniqueId));
  for (const item of items) {
    if (!fusedIds.has(item.id)) {
      combined.push({ uniqueId: item.id, content: item.content, similarity: 0 });
    }
  }

  // Stage 3 — optional CE rerank against the *original* query.
  if (options?.rerank && combined.length > 0) {
    const rerankTopN = options.rerankTopN ?? 30;
    const ceWeight = options.ceWeight ?? 0.1;
    const headSlice = combined.slice(0, rerankTopN);
    const tailSlice = combined.slice(rerankTopN);

    const reranked = await rerankPairs(
      originalQuery,
      headSlice.map((r) => ({ id: r.uniqueId, content: r.content }))
    );
    const ceById = new Map(reranked.map((r) => [r.id, r.score]));

    const head = headSlice.map((r) => ({
      ...r,
      similarity: r.similarity * (1 + ceWeight * (ceById.get(r.uniqueId) ?? 0)),
    }));
    head.sort((a, b) => b.similarity - a.similarity);
    combined = [...head, ...tailSlice];
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
  const uncachedTexts: string[] = [];
  const uncachedKeys: string[] = [];
  const uncachedIds: string[] = [];
  for (const m of memories) {
    const key = m.content;
    if (!cache.has(key)) {
      // Check for persisted embedding in DB first
      if (m.embedding) {
        try {
          const parsed = JSON.parse(m.embedding) as number[];
          cache.set(key, parsed);
          continue;
        } catch {
          // Invalid JSON, re-embed
        }
      }
      uncachedTexts.push(m.content);
      uncachedKeys.push(key);
      uncachedIds.push(m.uniqueId);
    }
  }
  if (uncachedTexts.length > 0) {
    const embeddings = await generateEmbeddings(uncachedTexts, embeddingOptions);
    for (let i = 0; i < uncachedKeys.length; i++) {
      cache.set(uncachedKeys[i], embeddings[i]);
      // Persist embedding to DB (fire-and-forget)
      updateVaultMemoryEmbeddingOp(vaultCtx, uncachedIds[i], JSON.stringify(embeddings[i])).catch(
        () => {}
      );
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
  const embedding = await generateEmbedding(content, embeddingOptions);
  cache.set(content, embedding);
  if (vaultCtx && memoryId) {
    updateVaultMemoryEmbeddingOp(vaultCtx, memoryId, JSON.stringify(embedding)).catch(
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
): Promise<{ results: VaultSearchResult[]; vaultSize: number }> {
  const limit = searchOptions?.limit ?? 5;
  const minSimilarity = searchOptions?.minSimilarity ?? 0.1;
  const scopes = searchOptions?.scopes;

  if (!query || typeof query !== "string") {
    return { results: [], vaultSize: 0 };
  }

  const folderId = searchOptions?.folderId;

  const queryOpts: { scopes?: string[]; folderId?: string | null } = {};
  if (scopes?.length) queryOpts.scopes = scopes;
  if (folderId !== undefined) queryOpts.folderId = folderId;

  const memories = await getAllVaultMemoriesOp(
    vaultCtx,
    Object.keys(queryOpts).length > 0 ? queryOpts : undefined
  );
  if (memories.length === 0) {
    return { results: [], vaultSize: 0 };
  }

  // Embed the query
  const queryEmbedding = await generateEmbedding(query, embeddingOptions);

  // Batch-embed any vault entries missing from cache (fallback)
  const uncachedTexts: string[] = [];
  const uncachedIndices: number[] = [];
  for (let i = 0; i < memories.length; i++) {
    if (!cache.has(memories[i].content)) {
      // Check for persisted embedding in DB first
      if (memories[i].embedding) {
        try {
          const parsed = JSON.parse(memories[i].embedding!) as number[];
          cache.set(memories[i].content, parsed);
          continue;
        } catch {
          // Invalid JSON, re-embed
        }
      }
      uncachedTexts.push(memories[i].content);
      uncachedIndices.push(i);
    }
  }
  if (uncachedTexts.length > 0) {
    const newEmbeddings = await generateEmbeddings(uncachedTexts, embeddingOptions);
    for (let j = 0; j < uncachedTexts.length; j++) {
      cache.set(memories[uncachedIndices[j]].content, newEmbeddings[j]);
      // Persist embedding to DB (fire-and-forget)
      updateVaultMemoryEmbeddingOp(
        vaultCtx,
        memories[uncachedIndices[j]].uniqueId,
        JSON.stringify(newEmbeddings[j])
      ).catch(
        // Silently swallow – SDK must not use console.*; embedding will be retried on next search
        () => {}
      );
    }
  }

  // Build embedded items for the pure ranking function
  const embeddedItems: EmbeddedItem[] = [];
  for (const m of memories) {
    const embedding = cache.get(m.content);
    if (embedding) {
      embeddedItems.push({ id: m.uniqueId, content: m.content, embedding, updatedAt: m.updatedAt });
    }
  }

  const useFusion = searchOptions?.useFusion ?? true;

  // Composite path — LLM decomposes the query into sub-queries, embeds them,
  // and runs the multi-facet RRF ranker. Falls through to V2/V2+CE on
  // "specific" mode so single-fact queries don't pay the decomposition cost.
  if (
    useFusion &&
    searchOptions?.decompose === "llm" &&
    searchOptions.decomposeOptions
  ) {
    const decomp = await decomposeQuery(query, searchOptions.decomposeOptions);
    if (decomp.mode === "composite") {
      const subEmbeddings = await generateEmbeddings(decomp.subQueries, embeddingOptions);
      const subQueries = decomp.subQueries.map((sq, i) => ({
        query: sq,
        embedding: subEmbeddings[i],
      }));
      const composite = await rankComposite(query, queryEmbedding, subQueries, embeddedItems, {
        limit,
        minSimilarity,
        rerank: !!searchOptions.rerank,
        ...(searchOptions.rerankTopN !== undefined && {
          rerankTopN: searchOptions.rerankTopN,
        }),
      });
      return { results: composite, vaultSize: memories.length };
    }
    // mode === "specific" — fall through to V2/V2+CE below.
  }

  if (useFusion && searchOptions?.rerank) {
    const results = await rankFusedVaultMemoriesAsync(
      query,
      queryEmbedding,
      embeddedItems,
      {
        limit,
        minSimilarity,
        rerank: true,
        ...(searchOptions.rerankTopN !== undefined && {
          rerankTopN: searchOptions.rerankTopN,
        }),
      }
    );
    return { results, vaultSize: memories.length };
  }

  const ranker = useFusion ? rankFusedVaultMemories : rankVaultMemories;
  const results = ranker(query, queryEmbedding, embeddedItems, {
    limit,
    minSimilarity,
  });

  return { results, vaultSize: memories.length };
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
        const folderId =
          searchOptions?.folderId !== undefined
            ? searchOptions.folderId
            : argFolderId !== undefined
              ? argFolderId
              : undefined;

        const { recall } = await import("../memory/recall.js");
        const result = await recall(
          query,
          {
            vaultCtx,
            embeddingOptions,
            vaultCache: cache,
          },
          {
            types: ["fact"],
            limit: requestLimit,
            minScore: minSimilarity,
            budget,
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

        const formatted = result.memories
          .map(
            (m, i) =>
              `[${i + 1}] (id: ${m.id}, similarity: ${(m.scoreBreakdown?.cosine ?? m.score).toFixed(2)})\n${m.content}`
          )
          .join("\n\n");

        return `Found ${result.memories.length} vault memories:\n\n${formatted}`;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return `Error searching vault: ${message}`;
      }
    },
  };
}
