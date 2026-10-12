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

const MIN_REFINER_CANDIDATES = 16;

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
  /**
   * Resolve a batch of candidate memory ids to just the ACTIVE ones (not
   * archived, not quarantined, not soft-deleted — the same set the final recall
   * gate admits). When provided, traversal drops "forgotten" memories from the
   * frontier AT EACH HOP so they neither steer neighbor-entity ranking nor
   * egress their entity names to {@link refineNeighbors}. Omit (tests /
   * entity-only callers) to traverse over every linked memory. Wire it from a
   * vault context with {@link ../db/memoryVault/operations.getActiveVaultMemoryIdsOp}.
   */
  filterActiveMemoryIds?: (ids: string[]) => Promise<Set<string>>;
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

  const keepActive = async (map: Map<string, Set<string>>): Promise<Map<string, Set<string>>> => {
    if (!options.filterActiveMemoryIds || map.size === 0) return map;
    const active = await options.filterActiveMemoryIds([...map.keys()]);
    const filtered = new Map<string, Set<string>>();
    for (const [id, names] of map) if (active.has(id)) filtered.set(id, names);
    return filtered;
  };

  const hop1 = await keepActive(await getMemoriesByEntityNamesOp(entityCtx, seedNames));
  if (hop1.size === 0) return [];
  const hop1Ranking = rankMemoriesByOverlap(hop1);

  if (maxHops <= 1) return hop1Ranking;

  const hop1Emitted = hop1Ranking.slice(0, nodeBudget);
  const perHopRankings: string[][] = [hop1Emitted];
  const firstHopOf = new Map<string, number>();
  for (const id of hop1Emitted) if (!firstHopOf.has(id)) firstHopOf.set(id, 1);

  const accumulated = new Set<string>(hop1Emitted);
  const seenEntities = new Set<string>(seedNames);
  let frontier = hop1Emitted;

  for (let hop = 2; hop <= maxHops; hop++) {
    if (frontier.length === 0) break;
    if (accumulated.size >= nodeBudget) break;

    const memoryToEntities = await getEntitiesByMemoryIdsOp(entityCtx, frontier);

    const neighborCounts = new Map<string, number>();
    for (const names of memoryToEntities.values()) {
      for (const name of names) {
        if (seenEntities.has(name)) continue;
        neighborCounts.set(name, (neighborCounts.get(name) ?? 0) + 1);
      }
    }
    if (neighborCounts.size === 0) break;

    const rankedNeighbors = [...neighborCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
    let topNeighbors = rankedNeighbors.slice(0, entityFanout);
    if (options.refineNeighbors && rankedNeighbors.length > entityFanout) {
      try {
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

    const hopMap = await keepActive(await getMemoriesByEntityNamesOp(entityCtx, topNeighbors));
    if (hopMap.size === 0) break;
    const hopRanking = rankMemoriesByOverlap(hopMap);

    const newlyDiscovered: string[] = [];
    for (const id of hopRanking) {
      if (accumulated.has(id)) continue;
      accumulated.add(id);
      newlyDiscovered.push(id);
      firstHopOf.set(id, hop);
      if (accumulated.size >= nodeBudget) break;
    }
    if (newlyDiscovered.length === 0) break;
    perHopRankings.push(newlyDiscovered);
    frontier = newlyDiscovered;
  }

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

const DEFAULT_REFINER_MODEL = "inclusionai/ling-2.6-flash";
const DEFAULT_REFINER_ATTEMPTS = 1;
const DEFAULT_REFINER_TOTAL_TIMEOUT_MS = 8_000;

const REFINER_SYSTEM_PROMPT = `You help a memory-retrieval system decide which related topics to explore.

Given a user's question and a numbered list of candidate topics/entities linked to memories found so far, pick the ones most likely to lead to memories that help ANSWER the question. Never return more than the maximum the user turn asks for. Prefer topics semantically related to the question; ignore incidental ones.

Output strict JSON, no prose: { "expand": [<entity names to expand, verbatim from the list>] }`;

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
      const parsed = await callPortalJsonCompletion({
        ...(options.apiKey !== undefined && { apiKey: options.apiKey }),
        ...(options.getToken !== undefined && { getToken: options.getToken }),
        ...(options.baseUrl !== undefined && { baseUrl: options.baseUrl }),
        taskType: "memory_graph",
        model: options.model ?? DEFAULT_REFINER_MODEL,
        systemPrompt: REFINER_SYSTEM_PROMPT,
        userMessage: `Question: ${query}\n\nCandidate topics:\n${numbered}\n\nWhich should be expanded? Choose at most ${limit}.`,
        tag: "memory/graph-refine",
        maxAttempts: options.maxAttempts ?? DEFAULT_REFINER_ATTEMPTS,
        totalTimeoutMs: options.totalTimeoutMs ?? DEFAULT_REFINER_TOTAL_TIMEOUT_MS,
        ...(options.backoffMs && { backoffMs: options.backoffMs }),
        ...(options.fetchFn && { fetchFn: options.fetchFn }),
      });
      if (parsed === null || typeof parsed !== "object") return [];
      const list = (parsed as { expand?: unknown }).expand;
      if (!Array.isArray(list)) return [];
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
