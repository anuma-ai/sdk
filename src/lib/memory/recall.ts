/**
 * Unified Recall API — single retrieval surface above vault + engine.
 *
 * Budget maps to pipeline depth (mirrors Hindsight's tiered defaults):
 * - `low`  → V2 cosine + BM25 + recency (no rerank, no decompose)
 * - `mid`  → V2 + cross-encoder rerank
 * - `high` → V2 + rerank + LLM query decomposition for composite queries
 *
 * Fact + chunk lanes are fused with RRF (k=60). The previous naive
 * "sort the union by raw score" path is gone — score scales differ
 * across kinds (cosine cosine [0,1] vs reranked sigmoid) so a flat sort
 * was lying about relative relevance.
 */

import { searchChunksOp } from "../db/chat/operations.js";
import type { ChunkSearchResult } from "../db/chat/types.js";
import { getMemoriesByEntityNamesOp } from "../db/entities/operations.js";
import { getMemoriesByEventTimeOp } from "../db/memoryVault/operations.js";
import { DEFAULT_API_EMBEDDING_MODEL } from "../memoryEngine/constants.js";
import { generateEmbedding } from "../memoryEngine/embeddings.js";
import type { VaultSearchResult } from "../memoryVault/searchTool.js";
import { searchVaultMemoriesWithSize } from "../memoryVault/searchTool.js";
import { classifyObservationTrend } from "./observationTrend.js";
import { extractQueryEntities } from "./queryEntities.js";
import { parseQueryTimeWindow, scoreEventTimeOverlap } from "./queryTemporal.js";
import { rrfFuse } from "./rrf.js";
import type {
  Budget,
  MemoryKind,
  RankedMemory,
  RecallContext,
  RecallDegradation,
  RecallDiagnostics,
  RecallOptions,
  RecallResult,
} from "./types.js";

const DEFAULT_LIMIT = 8;
const DEFAULT_BUDGET: Budget = "low";
const DEFAULT_FACT_MIN_SCORE = 0.1;

/** Monotonic wall clock in ms; `performance.now()` where available (browser /
 * RN / Node), else `Date.now()`. Used only for best-effort recall timings. */
const nowMs = (): number =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
const DEFAULT_CHUNK_MIN_SCORE = 0.5;

interface BudgetFlags {
  rerank: boolean;
  decompose: boolean;
}

function flagsForBudget(budget: Budget): BudgetFlags {
  switch (budget) {
    case "high":
      return { rerank: true, decompose: true };
    case "mid":
      return { rerank: true, decompose: false };
    case "low":
    default:
      return { rerank: false, decompose: false };
  }
}

/**
 * Keep the first occurrence, preserving order, dropping any item that repeats
 * a value under ANY of the supplied key functions. Recall results can repeat a
 * memory two ways: the same record surfaced from more than one internal lane
 * (cosine, BM25, entity, temporal) repeats an *id*, and separate vault rows
 * the extraction/consolidation pipeline saved for the same fact repeat the
 * *content* under different ids. Left unchecked a single fact occupies several
 * result slots — the single-lane path returns it N times (the reported bug:
 * the "drew on your memory" pill showing five identical rows) and the fused
 * path lets it contribute from multiple ranks, inflating its own RRF score.
 * Dedupe on both id and content at the source so every downstream path sees
 * each fact once.
 *
 * Empty-string keys never match and are never recorded, so a blank key — e.g.
 * a row whose content failed to decrypt and resolved to "" — can't collapse
 * two otherwise-distinct items into one (silent recall data loss).
 */
function dedupeBy<T>(items: T[], ...keys: Array<(item: T) => string>): T[] {
  const seen = keys.map(() => new Set<string>());
  const out: T[] = [];
  for (const item of items) {
    const itemKeys = keys.map((key) => key(item));
    if (itemKeys.some((k, i) => k !== "" && seen[i].has(k))) continue;
    itemKeys.forEach((k, i) => {
      if (k !== "") seen[i].add(k);
    });
    out.push(item);
  }
  return out;
}

/**
 * Single entry point for memory retrieval across facts (vault) and chunks
 * (engine). Returns a unified, ranked list.
 */
export async function recall(
  query: string,
  ctx: RecallContext,
  options: RecallOptions = {}
): Promise<RecallResult> {
  const types: MemoryKind[] = options.types ?? ["fact"];
  const limit = options.limit ?? DEFAULT_LIMIT;
  const requestedBudget = options.budget ?? DEFAULT_BUDGET;
  const flags = flagsForBudget(requestedBudget);
  const decomposeAvailable = flags.decompose && !!options.decomposeOptions;
  // Report the budget actually executed: high silently downgrades to mid
  // when decomposeOptions is missing (no LLM to run the query rewriter).
  const usedBudget: "low" | "mid" | "high" =
    requestedBudget === "high" && !decomposeAvailable ? "mid" : requestedBudget;

  // Best-effort observability state (D2). Populated as phases run; flushed to
  // options.onDiagnostics just before every return.
  const t0 = nowMs();
  let prepMs = 0;
  let factLaneMs = 0;
  let chunkLaneMs = 0;
  let fuseMs = 0;
  const factResults: VaultSearchResult[] = [];
  const chunkResults: ChunkSearchResult[] = [];
  let vaultSize: number | undefined;
  // Whether the cross-encoder actually reranked this call's fact lane —
  // threaded from the search layer (not the requested budget flag, which lied
  // on RN, and not a module-global, which couldn't see per-call degradation).
  let didRerank = false;
  // Whether the V2 head (cosine/BM25 fusion before side lanes) was non-empty.
  // Used to distinguish "CE skipped on empty head (lane-only hits)" from
  // "CE failed on a non-empty head (actual outage)".
  let hadV2Head = false;

  const emitDiagnostics = (candidateCount: number): void => {
    const cb = options.onDiagnostics;
    if (!cb) return;
    const degraded: RecallDegradation[] = [];
    // Only a genuine degradation: rerank was requested AND there were fact
    // candidates to rerank AND there was a V2 head (not just lane-only hits),
    // yet the CE didn't run. The hadV2Head guard distinguishes "CE skipped
    // because V2 head was empty (lane-only hits, by design)" from "CE failed
    // on a non-empty head (actual outage)". Without it, lane-only entity/
    // temporal recalls falsely report rerank-unavailable.
    if (flags.rerank && factResults.length > 0 && hadV2Head && !didRerank) {
      degraded.push("rerank-unavailable");
    }
    if (flags.decompose && !decomposeAvailable) degraded.push("decompose-unavailable");
    const diagnostics: RecallDiagnostics = {
      usedBudget,
      reranked: didRerank,
      candidateCount,
      ...(vaultSize !== undefined && { vaultSize }),
      factCount: factResults.length,
      chunkCount: chunkResults.length,
      timings: {
        total: nowMs() - t0,
        prep: prepMs,
        factLane: factLaneMs,
        chunkLane: chunkLaneMs,
        fuse: fuseMs,
      },
      degraded,
    };
    // Diagnostics are pure observability — a throwing sink must never break
    // retrieval.
    try {
      cb(diagnostics);
    } catch {
      /* swallow */
    }
  };

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    emitDiagnostics(0);
    return { memories: [], usedBudget, reranked: false, candidateCount: 0 };
  }

  // Embed once, share across stores. Vault path embeds internally too —
  // it's keyed off the cache so we don't pay twice. Run in parallel with
  // the side-lane builds since none of the three depends on the others.
  //
  // W5 graph lane: when the recall context carries an entityCtx, extract
  // candidate entities from the query and look up memories that share any
  // of them. RRF-fused alongside cosine + BM25 inside the vault search.
  //
  // W6 temporal lane: when the query has a temporal phrase ("next week",
  // "what's coming up this month"), resolve to an absolute window and
  // look up memories whose event_time overlaps.
  const needsChunkEmbedding = types.includes("chunk") && ctx.storageCtx;
  const wantsTemporal = types.includes("fact") && ctx.vaultCtx;
  const prepStart = nowMs();
  const [queryEmbedding, entityRanking, temporalRanking] = await Promise.all([
    needsChunkEmbedding
      ? generateEmbedding(query, ctx.embeddingOptions)
      : Promise.resolve(undefined),
    buildGraphLaneRanking(query, ctx),
    wantsTemporal
      ? buildTemporalLaneRanking(query, ctx.vaultCtx!, options.now)
      : Promise.resolve([] as string[]),
  ]);
  prepMs = nowMs() - prepStart;

  if (types.includes("fact") && ctx.vaultCtx && ctx.vaultCache) {
    const factStart = nowMs();
    const vaultMinScore = options.minScore ?? DEFAULT_FACT_MIN_SCORE;
    const {
      results,
      vaultSize: size,
      reranked,
      hadV2Head: v2Head,
    } = await searchVaultMemoriesWithSize(
      query,
      ctx.vaultCtx,
      ctx.embeddingOptions,
      ctx.vaultCache,
      {
        // Pull a wider candidate pool when fusing across lanes so RRF has
        // enough overlap to reorder; otherwise we'd cap at `limit` per lane
        // and lose tail signal.
        limit: types.includes("chunk") ? Math.max(limit * 2, 16) : limit,
        minSimilarity: vaultMinScore,
        useFusion: true,
        rerank: flags.rerank,
        // Ranking tuning knobs — forwarded only when set so the vault
        // pipeline's own defaults stay authoritative.
        ...(options.rerankTopN !== undefined && { rerankTopN: options.rerankTopN }),
        ...(options.ceWeight !== undefined && { ceWeight: options.ceWeight }),
        ...(options.recencyAlpha !== undefined && { recencyAlpha: options.recencyAlpha }),
        ...(options.recency && { recency: options.recency }),
        ...(options.mmr !== undefined && { mmr: options.mmr }),
        ...(options.supersessionBoost !== undefined && {
          supersessionBoost: options.supersessionBoost,
        }),
        ...(options.supersessionWindow !== undefined && {
          supersessionWindow: options.supersessionWindow,
        }),
        ...(options.proofCountAlpha !== undefined && {
          proofCountAlpha: options.proofCountAlpha,
        }),
        ...(options.bm25AdmissionDivisor !== undefined && {
          bm25AdmissionDivisor: options.bm25AdmissionDivisor,
        }),
        ...(options.rrfK !== undefined && { rrfK: options.rrfK }),
        ...(decomposeAvailable && {
          decompose: "llm" as const,
          decomposeOptions: options.decomposeOptions,
        }),
        ...(options.scopes && { scopes: options.scopes }),
        ...(options.folderId !== undefined && { folderId: options.folderId }),
        ...(entityRanking.length > 0 && { entityRanking }),
        ...(temporalRanking.length > 0 && { temporalRanking }),
      }
    );
    factResults.push(
      ...dedupeBy(
        results,
        (r) => r.uniqueId,
        (r) => r.content.trim()
      )
    );
    vaultSize = size;
    didRerank = reranked;
    hadV2Head = v2Head;
    factLaneMs = nowMs() - factStart;
  }

  if (types.includes("chunk") && ctx.storageCtx && queryEmbedding) {
    const chunkStart = nowMs();
    const chunkMinScore = options.minScore ?? DEFAULT_CHUNK_MIN_SCORE;
    const results = await searchChunksOp(ctx.storageCtx, queryEmbedding, {
      limit: types.includes("fact") ? Math.max(limit * 2, 16) : limit,
      minSimilarity: chunkMinScore,
      embeddingModel: ctx.embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL,
      ...(options.conversationId && { conversationId: options.conversationId }),
      ...(ctx.chunkCache && { chunkCache: ctx.chunkCache }),
    });
    chunkResults.push(
      ...dedupeBy(
        results.filter((r) =>
          options.excludeConversationId
            ? r.message.conversationId !== options.excludeConversationId
            : true
        ),
        (r) => r.chunkText.trim()
      )
    );
    chunkLaneMs = nowMs() - chunkStart;
  }

  const fuseStart = nowMs();

  // Fuse across lanes. Single-lane requests skip RRF — preserves the raw
  // score on the result so callers downstream of `recall()` can reason
  // about cosine-vs-cosine ordering directly.
  if (types.length === 1 || factResults.length === 0 || chunkResults.length === 0) {
    const memories: RankedMemory[] = [
      ...factResults.map(toFactMemory),
      ...chunkResults.map(toChunkMemory),
    ];
    memories.sort((a, b) => b.score - a.score);
    const candidateCount = factResults.length + chunkResults.length;
    fuseMs = nowMs() - fuseStart;
    emitDiagnostics(candidateCount);
    return {
      memories: memories.slice(0, limit),
      usedBudget,
      reranked: didRerank,
      candidateCount,
      ...(vaultSize !== undefined && { vaultSize }),
    };
  }

  // Fusion key must be PASSAGE-unique, not message-unique: one message can
  // split into several distinct chunks, and keying by message id alone makes
  // their ranking entries collide and the byId map overwrite all but the last
  // — silently dropping legitimate hits and undercounting candidateCount. Key
  // by message id + text so passages from one message stay separate through
  // fusion. (chunkResults is already content-deduped, so this is 1:1.)
  const chunkKey = (r: ChunkSearchResult) => `chunk:${r.message.uniqueId}:${r.chunkText.trim()}`;
  // Fuse both lanes at full width — no chunk is pre-dropped. Cross-lane
  // dedup runs post-fusion (below) so a fact's provenance only suppresses
  // its origin chunk when that fact actually surfaces.
  const factRanking = factResults.map((r) => `fact:${r.uniqueId}`);
  const chunkRanking = chunkResults.map(chunkKey);
  const fused = rrfFuse([factRanking, chunkRanking], options.rrfK);

  const byId = new Map<string, RankedMemory>();
  for (const r of factResults) {
    const m = toFactMemory(r);
    m.score = fused.get(`fact:${r.uniqueId}`) ?? 0;
    if (!m.scoreBreakdown) m.scoreBreakdown = {};
    m.scoreBreakdown.fused = r.similarity;
    byId.set(`fact:${r.uniqueId}`, m);
  }
  for (const r of chunkResults) {
    const m = toChunkMemory(r);
    const key = chunkKey(r);
    m.score = fused.get(key) ?? 0;
    if (!m.scoreBreakdown) m.scoreBreakdown = {};
    m.scoreBreakdown.fused = r.similarity;
    byId.set(key, m);
  }

  // Cross-lane dedup: a fact and the chunk it was extracted from must not both
  // appear. Suppress a chunk whenever a fact that SURFACES was extracted from
  // its message — regardless of which one scores higher (a chunk that outranks
  // its own fact must still yield to it). Two constraints pull against each
  // other: the chunk-outranks-fact case needs the fact to win anyway (so
  // suppression can't just run in score order), yet a fact that never makes
  // the cut must not remove its chunk.
  //
  // Both hold at the least fixpoint of the suppressed-chunk set. Removing a
  // chunk only frees a slot (it never evicts a fact), so as the suppressed set
  // grows the set of surviving facts — and thus their provenance — grows
  // monotonically and converges. Start from "nothing suppressed" and iterate
  // provenance(survivors) until stable; in practice this settles in 1–2 rounds.
  const ordered = [...byId.values()].sort((a, b) => b.score - a.score);
  const selectWith = (suppressed: Set<string>): RankedMemory[] => {
    const out: RankedMemory[] = [];
    for (const m of ordered) {
      if (out.length >= limit) break;
      if (m.kind === "chunk" && m.messageId && suppressed.has(m.messageId)) continue;
      out.push(m);
    }
    return out;
  };
  const provenanceOf = (selected: RankedMemory[]): Set<string> => {
    const s = new Set<string>();
    for (const m of selected) {
      if (m.kind === "fact" && m.sourceChunkIds) for (const id of m.sourceChunkIds) s.add(id);
    }
    return s;
  };
  let suppressed = new Set<string>();
  let memories = selectWith(suppressed);
  for (let i = 0; i < ordered.length; i++) {
    const next = provenanceOf(memories);
    if (next.size === suppressed.size && [...next].every((id) => suppressed.has(id))) break;
    suppressed = next;
    memories = selectWith(suppressed);
  }
  fuseMs = nowMs() - fuseStart;
  emitDiagnostics(byId.size);
  return {
    memories,
    usedBudget,
    reranked: didRerank,
    candidateCount: byId.size,
    ...(vaultSize !== undefined && { vaultSize }),
  };
}

function toFactMemory(r: VaultSearchResult): RankedMemory {
  const createdAt = r.createdAt ?? new Date(0);
  const proofCount = r.proofCount ?? undefined;
  const lastObservedAt = r.lastObservedAt ?? null;
  return {
    id: r.uniqueId,
    kind: "fact",
    // event_time anchors come directly from VaultSearchResult — the
    // ranker passes them through from the storage row, so the recall
    // executor can surface dates to the answer model without a second
    // DB read + decrypt per returned fact. Undefined when the fact has
    // no anchored time.
    ...(r.eventTimeStart !== undefined && { eventTimeStart: r.eventTimeStart }),
    ...(r.eventTimeEnd !== undefined && { eventTimeEnd: r.eventTimeEnd }),
    ...(r.eventTimeKind !== undefined && { eventTimeKind: r.eventTimeKind }),
    ...(r.sourceChunkIds !== undefined &&
      r.sourceChunkIds !== null && { sourceChunkIds: r.sourceChunkIds }),
    ...(proofCount !== undefined && proofCount !== null && { proofCount }),
    ...(lastObservedAt != null && { lastObservedAt }),
    // C2 — algorithmic trend from evidence timestamps (no LLM).
    observationTrend: classifyObservationTrend({
      createdAt,
      lastObservedAt,
      proofCount,
    }),
    // r.similarity from searchVaultMemoriesWithSize is the fused score
    // (cosine + BM25 + RRF + recency + proof) when useFusion=true (the
    // default) and pure cosine when useFusion=false. The breakdown
    // labels it `fused` since that's the common case; callers wanting
    // strictly-cosine should pass useFusion=false.
    content: r.content,
    score: r.similarity,
    scoreBreakdown: { fused: r.similarity },
    createdAt,
    updatedAt: r.updatedAt ?? new Date(0),
  };
}

/**
 * W5 graph lane builder. Returns a ranking of memory IDs ordered by
 * entity-overlap score (descending) — caller passes this through to
 * the vault search as `entityRanking` for RRF fusion with cosine/BM25.
 *
 * Returns an empty array (not just empty ranking) when:
 *  - `ctx.entityCtx` is not provided
 *  - The query has no extractable entities (all-lowercase or stopwords)
 *  - No stored memories share any of the query's entities
 *
 * The ranking is by raw shared-count, not the tanh score — we hand off
 * just the order to RRF fusion. The tanh shaping happens inside
 * `rankByEntityOverlap` for callers that want the score directly.
 */
async function buildGraphLaneRanking(query: string, ctx: RecallContext): Promise<string[]> {
  // Fall back to vaultCtx.entityCtx so callers don't have to thread the
  // graph-lane context twice (it's also where cascade-delete wiring lives).
  const entityCtx = ctx.entityCtx ?? ctx.vaultCtx?.entityCtx;
  if (!entityCtx) return [];
  const queryEntities = extractQueryEntities(query);
  if (queryEntities.length === 0) return [];
  const memoryToEntities = await getMemoriesByEntityNamesOp(entityCtx, queryEntities);
  if (memoryToEntities.size === 0) return [];
  // Sort by shared-entity count descending. Ties broken arbitrarily by
  // map insertion order — RRF rank-quantization makes fine ties moot.
  return [...memoryToEntities.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .map(([memoryId]) => memoryId);
}

/**
 * W6 temporal lane builder. Returns a ranking of memory IDs ordered by
 * event-time overlap score with the resolved query window. Empty array
 * (lane no-op) when:
 *  - The query has no temporal phrase ({@link parseQueryTimeWindow} returns null)
 *  - No memories have event-time overlapping the window
 *
 * The ranking goes through `searchVaultMemoriesWithSize` as
 * `temporalRanking` and gets RRF-fused with cosine + BM25 + entityRanking.
 */
async function buildTemporalLaneRanking(
  query: string,
  vaultCtx: NonNullable<RecallContext["vaultCtx"]>,
  now?: number
): Promise<string[]> {
  const window = parseQueryTimeWindow(query, now);
  if (!window) return [];
  const candidates = await getMemoriesByEventTimeOp(vaultCtx, window.start, window.end);
  if (candidates.length === 0) return [];
  return candidates
    .map((c) => ({
      id: c.uniqueId,
      score: scoreEventTimeOverlap(c.eventTimeStart, c.eventTimeEnd, c.eventTimeKind, window),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((c) => c.id);
}

function toChunkMemory(r: ChunkSearchResult): RankedMemory {
  return {
    id: r.message.uniqueId,
    kind: "chunk",
    content: r.chunkText,
    score: r.similarity,
    // Chunks come from searchChunksOp which is cosine-only — label honestly.
    scoreBreakdown: { cosine: r.similarity },
    conversationId: r.message.conversationId,
    messageId: r.message.uniqueId,
    role: r.message.role as "user" | "assistant",
    createdAt: r.message.createdAt,
    updatedAt: r.message.createdAt,
  };
}
