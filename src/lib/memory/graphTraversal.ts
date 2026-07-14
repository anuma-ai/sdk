/**
 * Multi-hop graph traversal for the W5 entity-graph recall lane (PR4,
 * MRAgent-style "active reconstruction").
 *
 * The single-hop lane (see `recall.ts:buildGraphLaneRanking`) does one thing:
 * extract entities from the query, look up memories sharing any of them, and
 * order those memories by shared-entity count. That is hop 1 — the "seed"
 * lookup. This module wraps a bounded breadth-first search around it: from the
 * seed memories it walks OUT to their neighbor entities (via the new reverse
 * edge {@link getEntitiesByMemoryIdsOp}), ranks those neighbors by
 * co-occurrence across the frontier, expands the top few, and pulls the
 * memories they reach — repeating up to {@link MAX_HOPS} times.
 *
 * Cost note (why this is cheap): NONE of this runs cosine. Cosine runs exactly
 * once per recall inside `searchVaultMemoriesWithSize`. This lane only emits an
 * ordered list of memory IDs that is RRF-fused against the cosine head. So
 * multi-hop adds indexed WatermelonDB joins + more RRF entries, not embedding
 * math. The dominant cost of enabling it is the reranker over a slightly larger
 * candidate pool — which stays bounded because `rerankTopN` remains
 * authoritative downstream.
 *
 * Determinism: neighbor-entity selection is pure co-occurrence counting (no
 * LLM). LLM-based path-refinement is deferred to PR5.
 *
 * Hop numbering: hop 1 is the seed lookup. `MAX_HOPS = 1` therefore means "seed
 * only" — byte-for-byte identical to the single-hop lane (the regression guard).
 * `MAX_HOPS = 2` performs one expansion beyond the seed. Default is 1 for this
 * PR; 2 is deferred to PR5.
 */

import {
  type EntityOperationsContext,
  getEntitiesByMemoryIdsOp,
  getMemoriesByEntityNamesOp,
} from "../db/entities/operations.js";
import { extractQueryEntities } from "./queryEntities.js";
import { rrfFuse } from "./rrf.js";

/**
 * Total hops the traversal performs, counting the seed lookup as hop 1.
 * `1` = seed only (identical to the single-hop lane). PR4 default; PR5
 * raises the default to `2` (one expansion). Overridable per-call for
 * ablation.
 * @public
 */
export const MAX_HOPS = 1;

/**
 * Max neighbor entities expanded per hop. Caps fan-out so a densely-linked
 * frontier can't explode the candidate pool. Neighbors are ranked by
 * co-occurrence frequency across the frontier; only the top this-many expand.
 * @public
 */
export const ENTITY_FANOUT = 8;

/**
 * Hard ceiling on total accumulated memory IDs across all hops. The BFS stops
 * expanding once the accumulated set reaches this size (and the frontier is
 * bounded to it too), keeping the RRF pool — and the downstream reranker
 * workload — bounded regardless of graph density.
 * @public
 */
export const NODE_BUDGET = 64;

/**
 * Above this vault size, {@link capHopsForDensity} forces `MAX_HOPS = 1`
 * (seed-only). Fan-out grows with graph density, so on large vaults we don't
 * pay the expansion cost. Bounded-traversal safety valve.
 * @public
 */
export const VAULT_SIZE_HOP_CAP = 1000;

/** Options for {@link traverseGraphLane}. All optional; defaults are the
 * exported constants above. Exposed for ablation / evaluation sweeps.
 * @public */
export interface GraphTraversalOptions {
  /** Total hops incl. the seed lookup (hop 1). Default {@link MAX_HOPS}. */
  maxHops?: number;
  /** Max neighbor entities expanded per hop. Default {@link ENTITY_FANOUT}. */
  entityFanout?: number;
  /** Hard cap on accumulated memory IDs. Default {@link NODE_BUDGET}. */
  nodeBudget?: number;
  /** RRF smoothing constant for per-hop fusion. Default 60 (rrf.ts). */
  rrfK?: number;
  /**
   * Vault size hint. When provided and above {@link VAULT_SIZE_HOP_CAP}, the
   * effective hop count is capped to 1 (see {@link capHopsForDensity}).
   */
  vaultSize?: number;
}

/** Clamp a caller-supplied positive integer knob, falling back to the default
 * for undefined / non-finite / < 1 values. */
function clampPositiveInt(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

/**
 * Cap the hop count on large vaults. Fan-out grows with graph density, so above
 * {@link VAULT_SIZE_HOP_CAP} memories we force seed-only traversal (1 hop)
 * rather than pay an unbounded expansion. A no-op when `vaultSize` is unknown or
 * within the threshold.
 * @public
 */
export function capHopsForDensity(maxHops: number, vaultSize?: number): number {
  if (vaultSize !== undefined && vaultSize > VAULT_SIZE_HOP_CAP) return Math.min(maxHops, 1);
  return maxHops;
}

/** Order a memoryId → matched-entity-name map by shared-entity count
 * (descending). Ties keep map-insertion order — RRF rank-quantization makes
 * fine ties moot. This is the EXACT ordering the single-hop lane produces. */
function rankMemoriesByOverlap(map: Map<string, Set<string>>): string[] {
  return [...map.entries()].sort((a, b) => b[1].size - a[1].size).map(([memoryId]) => memoryId);
}

/**
 * Bounded multi-hop entity-graph traversal. Returns an ordered list of memory
 * IDs (best first) — the SAME output shape as the single-hop lane, so nothing
 * downstream changes. The caller passes it through as `entityRanking` for RRF
 * fusion with the cosine/BM25 head.
 *
 * With `maxHops <= 1` (the PR4 default) this returns the seed ordering verbatim,
 * making it a drop-in equivalent of the single-hop lane (the regression guard).
 *
 * Returns an empty array when the query has no extractable entities or no stored
 * memory shares a seed entity.
 *
 * @public
 */
export async function traverseGraphLane(
  query: string,
  entityCtx: EntityOperationsContext,
  options: GraphTraversalOptions = {}
): Promise<string[]> {
  const seedNames = extractQueryEntities(query);
  if (seedNames.length === 0) return [];

  const entityFanout = clampPositiveInt(options.entityFanout, ENTITY_FANOUT);
  const nodeBudget = clampPositiveInt(options.nodeBudget, NODE_BUDGET);
  const maxHops = capHopsForDensity(clampPositiveInt(options.maxHops, MAX_HOPS), options.vaultSize);

  // Hop 1 — seed lookup. Identical to the single-hop lane.
  const hop1 = await getMemoriesByEntityNamesOp(entityCtx, seedNames);
  if (hop1.size === 0) return [];
  const hop1Ranking = rankMemoriesByOverlap(hop1);

  // Seed-only: return verbatim so this is byte-for-byte identical to the
  // single-hop lane (no RRF round-trip that could perturb order).
  if (maxHops <= 1) return hop1Ranking;

  const perHopRankings: string[][] = [hop1Ranking];
  // memoryId → the earliest hop it was discovered at. This is the PRIMARY rank
  // key at the end (hop-decayed weight → "closer hops rank higher").
  const firstHopOf = new Map<string, number>();
  for (const id of hop1Ranking) if (!firstHopOf.has(id)) firstHopOf.set(id, 1);

  const accumulated = new Set<string>(hop1Ranking);
  // Entities already used as expansion cues (seed + every expanded neighbor).
  // Excluding them prevents re-expanding the same cue → cycles / wasted joins.
  const seenEntities = new Set<string>(seedNames);
  let frontier = hop1Ranking.slice(0, nodeBudget);

  for (let hop = 2; hop <= maxHops; hop++) {
    if (frontier.length === 0) break;
    if (accumulated.size >= nodeBudget) break;

    // One step outward: frontier memories → their linked entities.
    const memoryToEntities = await getEntitiesByMemoryIdsOp(entityCtx, frontier);

    // Rank neighbor entities by co-occurrence across the frontier, dropping
    // any already used as a cue. Deterministic, cheap (in-memory counting).
    const neighborCounts = new Map<string, number>();
    for (const names of memoryToEntities.values()) {
      for (const name of names) {
        if (seenEntities.has(name)) continue;
        neighborCounts.set(name, (neighborCounts.get(name) ?? 0) + 1);
      }
    }
    if (neighborCounts.size === 0) break;

    const topNeighbors = [...neighborCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, entityFanout)
      .map(([name]) => name);
    for (const name of topNeighbors) seenEntities.add(name);

    // Memories reachable via the top neighbor entities.
    const hopMap = await getMemoriesByEntityNamesOp(entityCtx, topNeighbors);
    if (hopMap.size === 0) break;
    const hopRanking = rankMemoriesByOverlap(hopMap);
    perHopRankings.push(hopRanking);
    for (const id of hopRanking) if (!firstHopOf.has(id)) firstHopOf.set(id, hop);

    // Next frontier = newly-discovered ids only, bounded by NODE_BUDGET.
    const newlyDiscovered: string[] = [];
    for (const id of hopRanking) {
      if (accumulated.has(id)) continue;
      accumulated.add(id);
      newlyDiscovered.push(id);
      if (accumulated.size >= nodeBudget) break;
    }
    frontier = newlyDiscovered;
  }

  // Rank the accumulated memories. Hop distance is the PRIMARY key — this is
  // the "hop-decayed weight": a memory discovered closer to the seed always
  // outranks a farther one, so a strongly-linked hop-2 node can't leapfrog a
  // weakly-linked seed node ("closer hops rank higher"). Within a hop tier the
  // fused RRF score (which rewards recurring / high-in-list memories) breaks
  // ties, then map-insertion order as the final deterministic tiebreak.
  const fused = rrfFuse(perHopRankings, options.rrfK);
  return [...fused.entries()]
    .sort((a, b) => {
      const hopA = firstHopOf.get(a[0]) ?? Infinity;
      const hopB = firstHopOf.get(b[0]) ?? Infinity;
      if (hopA !== hopB) return hopA - hopB;
      return b[1] - a[1];
    })
    .map(([id]) => id);
}
