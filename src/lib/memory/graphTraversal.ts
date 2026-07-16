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
 * Determinism: neighbor-entity selection is pure co-occurrence counting by
 * default. An optional LLM path-refiner (PR5) can override which neighbors
 * expand; it falls back to the deterministic order on any error.
 *
 * Hop numbering: hop 1 is the seed lookup. `maxHops = 1` therefore means "seed
 * only" — byte-for-byte identical to the single-hop lane (the regression guard).
 * `MAX_HOPS = 2` (the PR5 default) performs one expansion beyond the seed.
 *
 * Neighbor selection at each expansion hop is deterministic co-occurrence
 * counting by default. PR5 adds an OPTIONAL LLM path-refiner
 * ({@link NeighborRefiner} / {@link createLlmNeighborRefiner}) that lets a model
 * pick which neighbor entities to expand instead; it is opt-in, capped to ≤1
 * call per hop, and falls back to the deterministic order on any error.
 */

import {
  type EntityOperationsContext,
  getEntitiesByMemoryIdsOp,
  getMemoriesByEntityNamesOp,
} from "../db/entities/operations.js";
import { normalizeEntityName } from "../db/entities/types.js";
import { getLogger } from "../logger.js";
import { callPortalJsonCompletion, type PortalLlmAuth } from "./portalLlm.js";
import { extractQueryEntities } from "./queryEntities.js";
import { rrfFuse } from "./rrf.js";

/**
 * Total hops the traversal performs, counting the seed lookup as hop 1.
 * `1` = seed only (identical to the single-hop lane). PR5 default is `2` (one
 * expansion beyond the seed). Overridable per-call for ablation. Still gated to
 * the `high` budget in recall, and capped back to 1 on large vaults by
 * {@link capHopsForDensity}.
 * @public
 */
export const MAX_HOPS = 2;

/**
 * Max neighbor entities expanded per hop. Caps fan-out so a densely-linked
 * frontier can't explode the candidate pool. Neighbors are ranked by
 * co-occurrence frequency across the frontier; only the top this-many expand.
 * @public
 */
export const ENTITY_FANOUT = 8;

/**
 * Floor for the per-hop cap on candidate entity NAMES handed to an LLM neighbor
 * refiner: give the model at least this many choices to reorder the fan-out even
 * when `entityFanout` is tiny. Effective cap =
 * `min(max(entityFanout * 2, MIN_REFINER_CANDIDATES), MAX_REFINER_CANDIDATES)`.
 * Module-private (an internal egress bound, not a tuning knob).
 */
const MIN_REFINER_CANDIDATES = 16;

/**
 * HARD ceiling on candidate entity NAMES egressed to the refiner per hop,
 * regardless of `entityFanout`. `MIN_REFINER_CANDIDATES` is only a floor — a
 * caller cranking `entityFanout` would otherwise widen PII egress without limit
 * — so this ceiling is the REAL bound: at most this many (PII-bearing) names
 * ever leave per hop. See the call site in {@link traverseGraphLane} and the
 * SECURITY note on {@link createLlmNeighborRefiner}. Module-private.
 */
const MAX_REFINER_CANDIDATES = 64;

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
  /**
   * PR5 — optional LLM neighbor-selection. When provided, at each expansion hop
   * the deterministically-ranked candidate neighbor entities are handed to this
   * refiner, which returns the subset to expand. Falls back to the
   * co-occurrence order on any error or empty result. Called at most ONCE per
   * hop. Build one with {@link createLlmNeighborRefiner}, or supply your own.
   */
  refineNeighbors?: NeighborRefiner;
}

/**
 * Picks which candidate neighbor entities to expand at a traversal hop. Given
 * the query and the deterministically-ranked candidate entity names, return the
 * subset (≤ `limit`) to expand. Must be resilient: {@link traverseGraphLane}
 * falls back to the deterministic top-`limit` on a throw or empty return.
 * @public
 */
export interface NeighborRefiner {
  refine(query: string, candidates: string[], limit: number): Promise<string[]>;
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
 * With `maxHops <= 1` this returns the seed ordering verbatim, making it a
 * drop-in equivalent of the single-hop lane (the regression guard). The PR5
 * default is 2 (one expansion beyond the seed).
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

  // Multi-hop: bound the EMITTED candidate pool at NODE_BUDGET across ALL hops
  // (not just the next frontier). A dense seed entity can itself return far more
  // than the budget, so truncate the seed ranking here too — otherwise a 500-row
  // seed would emit all 500 into entityRanking regardless of NODE_BUDGET,
  // blowing up the RRF pool and the downstream reranker workload.
  const hop1Emitted = hop1Ranking.slice(0, nodeBudget);
  const perHopRankings: string[][] = [hop1Emitted];
  // memoryId → the earliest hop it was discovered at. This is the PRIMARY rank
  // key at the end (hop-decayed weight → "closer hops rank higher").
  const firstHopOf = new Map<string, number>();
  for (const id of hop1Emitted) if (!firstHopOf.has(id)) firstHopOf.set(id, 1);

  const accumulated = new Set<string>(hop1Emitted);
  // Entities already used as expansion cues (seed + every expanded neighbor).
  // Excluding them prevents re-expanding the same cue → cycles / wasted joins.
  const seenEntities = new Set<string>(seedNames);
  let frontier = hop1Emitted;

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

    // Deterministic co-occurrence ranking (the always-correct fallback).
    const rankedNeighbors = [...neighborCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
    // PR5 — optionally let a model pick which neighbors to expand. Capped to
    // one call per hop; any error / empty result falls back to the top-fanout
    // by co-occurrence. Only invoked when there are more candidates than the
    // fan-out could take (otherwise there is nothing to prune).
    let topNeighbors = rankedNeighbors.slice(0, entityFanout);
    if (options.refineNeighbors && rankedNeighbors.length > entityFanout) {
      try {
        // SECURITY / egress bound: hand the refiner only the top-N co-occurring
        // candidates, never the full frontier. Neighbor entity NAMES are user
        // PII (people/places/orgs) egressed to the portal, so a dense frontier
        // must not fan hundreds of names out per hop. The cap is floored at
        // MIN_REFINER_CANDIDATES (enough choices to reorder) AND ceilinged at
        // MAX_REFINER_CANDIDATES — the ceiling is the real bound, so cranking
        // entityFanout can never widen egress past it. See
        // {@link createLlmNeighborRefiner}.
        const refinerCandidateCap = Math.min(
          Math.max(entityFanout * 2, MIN_REFINER_CANDIDATES),
          MAX_REFINER_CANDIDATES
        );
        const refinerCandidates = rankedNeighbors.slice(0, refinerCandidateCap);
        const refined = await options.refineNeighbors.refine(
          query,
          refinerCandidates,
          entityFanout
        );
        // Keep only real candidates for this hop, preserve the model's order,
        // dedupe, and cap at the fan-out. Empty → keep the deterministic set.
        const valid: string[] = [];
        const seen = new Set<string>();
        for (const name of refined) {
          if (!neighborCounts.has(name) || seen.has(name)) continue;
          seen.add(name);
          valid.push(name);
          if (valid.length >= entityFanout) break;
        }
        if (valid.length > 0) topNeighbors = valid;
      } catch (err) {
        getLogger().warn(
          `[memory/graph] neighbor refine failed; using co-occurrence order: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
    for (const name of topNeighbors) seenEntities.add(name);

    // Memories reachable via the top neighbor entities.
    const hopMap = await getMemoriesByEntityNamesOp(entityCtx, topNeighbors);
    if (hopMap.size === 0) break;
    const hopRanking = rankMemoriesByOverlap(hopMap);

    // Emit only the newly-discovered ids up to the remaining NODE_BUDGET. This
    // both feeds the next frontier AND bounds what this hop contributes to the
    // emitted candidate pool (perHopRankings), so a dense entity returning far
    // more than the budget adds at most the remaining slots — the total emitted
    // pool never exceeds NODE_BUDGET.
    const newlyDiscovered: string[] = [];
    for (const id of hopRanking) {
      if (accumulated.has(id)) continue;
      accumulated.add(id);
      newlyDiscovered.push(id);
      firstHopOf.set(id, hop); // genuinely new → this is its earliest hop
      if (accumulated.size >= nodeBudget) break;
    }
    if (newlyDiscovered.length === 0) break;
    perHopRankings.push(newlyDiscovered);
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

/** Open-weights, reliable-JSON model — same rationale as consolidate.ts. */
const DEFAULT_REFINER_MODEL = "inclusionai/ling-2.6-flash";
/** Recall hot path — one shot per hop, tight budget, no aggressive retry. */
const DEFAULT_REFINER_ATTEMPTS = 1;
const DEFAULT_REFINER_TOTAL_TIMEOUT_MS = 8_000;

/** Auth + tuning for {@link createLlmNeighborRefiner}. Reuses the recall
 * `decomposeOptions` shape (dual auth — one of `apiKey`/`getToken`). @public */
export interface LlmNeighborRefinerOptions extends PortalLlmAuth {
  baseUrl?: string;
  model?: string;
  fetchFn?: typeof fetch;
  maxAttempts?: number;
  totalTimeoutMs?: number;
  backoffMs?: (attempt: number) => number;
}

/**
 * Build a {@link NeighborRefiner} backed by a cheap portal LLM. At each hop it
 * asks the model to pick, from the candidate neighbor entities, the ≤`limit`
 * most relevant to the query, so traversal expands toward the question instead
 * of purely by co-occurrence frequency.
 *
 * Bounded + fail-safe: one attempt by default, a short total timeout, and
 * {@link traverseGraphLane} falls back to the deterministic co-occurrence order
 * on any throw or empty result — so enabling this can reorder which neighbors
 * expand but never breaks or stalls recall.
 *
 * SECURITY / ZERO-KNOWLEDGE (must stay default-OFF): this sends the query +
 * candidate ENTITY NAMES to the portal UNREDACTED. Those names ARE user PII —
 * people, places, orgs pulled from the stored graph (e.g. "Sara", "Kyoto",
 * "Acme") — not lower-risk than content just because they're short. It reuses
 * the query-decompose auth and is opt-in (`RecallOptions.graphRefine`, default
 * off in recall); leave it off unless you accept that exposure. To bound that
 * exposure, {@link traverseGraphLane} caps the candidate list it hands this
 * refiner per hop — at most `MAX_REFINER_CANDIDATES` entity names ever leave per
 * hop, REGARDLESS of `entityFanout` (the cap is a hard ceiling, not just a
 * fanout-scaled floor), so the full frontier is never egressed.
 *
 * MEDIUM residual: a malicious / MITM'd portal can only steer WHICH neighbor
 * entities expand — a recall-ranking nudge, not a data-integrity change (no
 * memory is written, archived, or deleted), and {@link traverseGraphLane}
 * falls back to deterministic order on any bad/empty response. Bounded tradeoff.
 * @public
 */
export function createLlmNeighborRefiner(options: LlmNeighborRefinerOptions): NeighborRefiner {
  return {
    async refine(query: string, candidates: string[], limit: number): Promise<string[]> {
      if (candidates.length === 0) return [];
      const numbered = candidates.map((name, i) => `[${i + 1}] ${name}`).join("\n");
      const systemPrompt = `You help a memory-retrieval system decide which related topics to explore.

Given a user's question and a numbered list of candidate topics/entities linked to memories found so far, pick the ones most likely to lead to memories that help ANSWER the question. Choose at most ${limit}. Prefer topics semantically related to the question; ignore incidental ones.

Output strict JSON, no prose: { "expand": [<entity names to expand, verbatim from the list>] }`;
      const parsed = await callPortalJsonCompletion({
        ...(options.apiKey !== undefined && { apiKey: options.apiKey }),
        ...(options.getToken !== undefined && { getToken: options.getToken }),
        ...(options.baseUrl !== undefined && { baseUrl: options.baseUrl }),
        model: options.model ?? DEFAULT_REFINER_MODEL,
        systemPrompt,
        userMessage: `Question: ${query}\n\nCandidate topics:\n${numbered}\n\nWhich should be expanded?`,
        tag: "memory/graph-refine",
        maxAttempts: options.maxAttempts ?? DEFAULT_REFINER_ATTEMPTS,
        totalTimeoutMs: options.totalTimeoutMs ?? DEFAULT_REFINER_TOTAL_TIMEOUT_MS,
        ...(options.backoffMs && { backoffMs: options.backoffMs }),
        ...(options.fetchFn && { fetchFn: options.fetchFn }),
      });
      // null (exhausted/failed) → empty → caller keeps the deterministic order.
      if (parsed === null || typeof parsed !== "object") return [];
      const list = (parsed as { expand?: unknown }).expand;
      if (!Array.isArray(list)) return [];
      // Match model output back to real candidates by normalized name (the
      // model may re-case or trim). Preserve the model's order.
      const byNormalized = new Map(candidates.map((c) => [normalizeEntityName(c), c]));
      const out: string[] = [];
      for (const raw of list) {
        if (typeof raw !== "string") continue;
        const match = byNormalized.get(normalizeEntityName(raw));
        if (match) out.push(match);
      }
      return out;
    },
  };
}
