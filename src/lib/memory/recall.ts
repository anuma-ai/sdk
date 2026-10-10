import { searchChunksOp } from "../db/chat/operations.js";
import type { ChunkSearchResult } from "../db/chat/types.js";
import { getMemoriesByEntityNamesOp } from "../db/entities/operations.js";
import {
  countActiveVaultMemoriesOp,
  getActiveVaultMemoryIdsOp,
  getMemoriesByEventTimeOp,
} from "../db/memoryVault/operations.js";
import { getLogger } from "../logger.js";
import { DEFAULT_API_EMBEDDING_MODEL } from "../memoryEngine/constants.js";
import { generateEmbedding } from "../memoryEngine/embeddings.js";
import { normalizeSubQueries } from "../memoryVault/decomposeQuery.js";
import type { VaultSearchResult } from "../memoryVault/searchTool.js";
import { searchVaultMemoriesWithSize } from "../memoryVault/searchTool.js";
import {
  createLlmNeighborRefiner,
  type NeighborRefiner,
  NODE_BUDGET,
  traverseGraphLane,
} from "./graphTraversal.js";
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
  RecallEmptyReason,
  RecallOptions,
  RecallResult,
} from "./types.js";

const DEFAULT_LIMIT = 8;
const DEFAULT_BUDGET: Budget = "low";
const DEFAULT_FACT_MIN_SCORE = 0.1;

function nowMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}
const DEFAULT_CHUNK_MIN_SCORE = 0.5;
const DEFAULT_QUERY_EMBED_TOTAL_TIMEOUT_MS = 8_000;

interface BudgetFlags {
  rerank: boolean;
  /**
   * PR4 — enable multi-hop entity-graph traversal in the W5 lane. Gated to
   * `high` only: multi-hop widens the candidate pool (more RRF entries + a
   * larger rerank input), so low/mid keep the cheap single-hop lane. When
   * false, `buildGraphLaneRanking` runs the exact pre-PR4 single-hop path.
   */
  traverse: boolean;
}

function flagsForBudget(budget: Budget): BudgetFlags {
  switch (budget) {
    case "high":
      return { rerank: true, traverse: true };
    case "mid":
      return { rerank: true, traverse: false };
    case "low":
    default:
      return { rerank: false, traverse: false };
  }
}

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
  const requestedTypes: MemoryKind[] = options.types ?? ["fact"];
  const chunksScopeRestricted = options.memoryIds !== undefined && requestedTypes.includes("chunk");
  const types: MemoryKind[] =
    options.memoryIds !== undefined
      ? requestedTypes.filter((kind) => kind === "fact")
      : requestedTypes;
  const limit = options.limit ?? DEFAULT_LIMIT;
  const usedBudget = options.budget ?? DEFAULT_BUDGET;
  const flags = flagsForBudget(usedBudget);
  const normalizedFacets = normalizeSubQueries(options.subQueries);
  const subQueries = normalizedFacets.length >= 2 ? normalizedFacets : undefined;

  const t0 = nowMs();
  let prepMs = 0;
  let factLaneMs = 0;
  let chunkLaneMs = 0;
  let fuseMs = 0;
  const factResults: VaultSearchResult[] = [];
  const chunkResults: ChunkSearchResult[] = [];
  let vaultSize: number | undefined;
  let didRerank = false;
  let rerankMs = 0;
  let queryEmbedMs = 0;
  let vaultRowsEmbedded: number | undefined;
  let hadV2Head = false;
  let embeddingsUnavailable = false;
  let chunkEmbedFailed = false;
  let factLaneRankedOnCosine = false;
  let decryptLastRan: boolean | undefined;
  let vaultRowsDecrypted: number | undefined;
  let graphLaneCount = 0;
  let temporalLaneCount = 0;
  let graphLaneFailed = false;
  let temporalLaneFailed = false;
  let hitLimit = false;
  let factFloor = -1;
  let chunkFloor = -1;

  const emptyReasonFor = (admitted: number, laneRan: boolean): RecallEmptyReason => {
    if (admitted > 0) return "";
    if (!query || typeof query !== "string" || query.trim().length === 0) return "empty-query";
    if (!laneRan) return "no-lanes";
    const chunkLaneCouldAnswer = types.includes("chunk") && !!ctx.storageCtx;
    if (vaultSize === 0 && !chunkLaneCouldAnswer) return "vault-empty";
    return "no-candidates";
  };

  const emitDiagnostics = (candidateCount: number, admitted: readonly RankedMemory[]): void => {
    const cb = options.onDiagnostics;
    if (!cb) return;
    const degraded: RecallDegradation[] = [];
    if (flags.rerank && factResults.length > 0 && hadV2Head && !didRerank) {
      degraded.push("rerank-unavailable");
    }
    if (usedBudget === "high" && options.decomposeOptions && !subQueries && !options.graphRefine) {
      degraded.push("decompose-moved");
    }
    if (embeddingsUnavailable) degraded.push("embeddings-unavailable");
    if (graphLaneFailed) degraded.push("graph-lane-failed");
    if (temporalLaneFailed) degraded.push("temporal-lane-failed");
    if (chunksScopeRestricted) degraded.push("chunks-scope-restricted");
    const laneRan =
      (types.includes("fact") && (!!ctx.factSource || (!!ctx.vaultCtx && !!ctx.vaultCache))) ||
      (types.includes("chunk") && !!ctx.storageCtx) ||
      (chunksScopeRestricted && !!ctx.storageCtx);
    const scores = admitted.map((m) => m.score);
    const minScoreApplied =
      factResults.length > 0
        ? factFloor
        : chunkResults.length > 0
          ? chunkFloor
          : factFloor >= 0
            ? factFloor
            : chunkFloor;
    const diagnostics: RecallDiagnostics = {
      usedBudget,
      reranked: didRerank,
      candidateCount,
      ...(vaultSize !== undefined && { vaultSize }),
      ...(decryptLastRan !== undefined && { decryptLast: decryptLastRan }),
      ...(vaultRowsDecrypted !== undefined && { vaultRowsDecrypted }),
      ...(vaultRowsEmbedded !== undefined && { vaultRowsEmbedded }),
      factCount: factResults.length,
      chunkCount: chunkResults.length,
      admittedCount: admitted.length,
      topScore: scores.length > 0 ? Math.max(...scores) : -1,
      lowestAdmittedScore: scores.length > 0 ? Math.min(...scores) : -1,
      minScoreApplied,
      truncated: hitLimit,
      graphLaneCount,
      temporalLaneCount,
      emptyReason: emptyReasonFor(admitted.length, laneRan),
      timings: {
        total: nowMs() - t0,
        prep: prepMs,
        factLane: factLaneMs,
        rerank: rerankMs,
        queryEmbed: queryEmbedMs,
        chunkLane: chunkLaneMs,
        fuse: fuseMs,
      },
      degraded,
    };
    try {
      cb(diagnostics);
    } catch {
      /* swallow */
    }
  };

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    emitDiagnostics(0, []);
    return { memories: [], usedBudget, reranked: false, candidateCount: 0 };
  }

  const needsChunkEmbedding = types.includes("chunk") && ctx.storageCtx;
  const wantsTemporal = types.includes("fact") && (ctx.factSource || ctx.vaultCtx);
  const queryEmbedTotalTimeoutMs =
    options.queryEmbedTotalTimeoutMs ?? DEFAULT_QUERY_EMBED_TOTAL_TIMEOUT_MS;
  const prepStart = nowMs();
  let sharedEmbedMs = 0;
  const [queryEmbedding, entityRanking, temporalRanking] = await Promise.all([
    needsChunkEmbedding
      ? generateEmbedding(query, {
          ...ctx.embeddingOptions,
          totalTimeoutMs: queryEmbedTotalTimeoutMs,
        })
          .finally(() => {
            sharedEmbedMs = nowMs() - prepStart;
          })
          .then((vec) => {
            if (vec.length === 0) {
              getLogger().warn(
                "[memory/recall] chunk-lane query embedding came back empty; skipping the chunk lane"
              );
              chunkEmbedFailed = true;
              return undefined;
            }
            return vec;
          })
          .catch((err) => {
            getLogger().warn(
              `[memory/recall] chunk-lane query embedding failed; skipping the chunk lane: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
            chunkEmbedFailed = true;
            return undefined;
          })
      : Promise.resolve(undefined),
    safeLane(
      "graph",
      () => (graphLaneFailed = true),
      () =>
        ctx.factSource
          ? ctx.factSource.graphRanking(query, flags.traverse, options)
          : buildGraphLaneRanking(
              query,
              ctx,
              flags.traverse,
              graphTraversalOptions(options, flags.traverse)
            )
    ),
    wantsTemporal
      ? safeLane(
          "temporal",
          () => (temporalLaneFailed = true),
          () =>
            ctx.factSource
              ? ctx.factSource.temporalRanking(query, options.now)
              : buildTemporalLaneRanking(query, ctx.vaultCtx!, options.now)
        )
      : Promise.resolve([] as string[]),
  ]);
  prepMs = nowMs() - prepStart;
  graphLaneCount = entityRanking.length;
  temporalLaneCount = temporalRanking.length;

  if (types.includes("fact") && (ctx.factSource || (ctx.vaultCtx && ctx.vaultCache))) {
    const factStart = nowMs();
    const vaultMinScore = options.minScore ?? DEFAULT_FACT_MIN_SCORE;
    factFloor = vaultMinScore;
    const {
      results,
      vaultSize: size,
      reranked,
      rerankMs: factRerankMs,
      queryEmbedMs: factQueryEmbedMs,
      rowsEmbedded: factRowsEmbedded,
      hadV2Head: v2Head,
      embeddingsUnavailable: factEmbeddingsUnavailable,
      rankedOnCosine: factRankedOnCosine,
      decryptLast: factDecryptLast,
      rowsDecrypted: factRowsDecrypted,
    } = await (
      ctx.factSource?.search.bind(ctx.factSource) ??
      ((searchQuery, searchOptions) =>
        searchVaultMemoriesWithSize(
          searchQuery,
          ctx.vaultCtx!,
          ctx.embeddingOptions,
          ctx.vaultCache!,
          searchOptions
        ))
    )(query, {
      limit: types.includes("chunk") ? Math.max(limit * 2, 16) : limit,
      minSimilarity: vaultMinScore,
      useFusion: true,
      rerank: flags.rerank,
      ...(options.rerankTopN !== undefined && { rerankTopN: options.rerankTopN }),
      ...(options.ceWeight !== undefined && { ceWeight: options.ceWeight }),
      ...(options.rerankLoadTimeoutMs !== undefined && {
        rerankLoadTimeoutMs: options.rerankLoadTimeoutMs,
      }),
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
      ...(options.decryptLast !== undefined && { decryptLast: options.decryptLast }),
      ...(subQueries && { subQueries }),
      ...(options.scopes && { scopes: options.scopes }),
      ...(options.folderId !== undefined && { folderId: options.folderId }),
      ...(options.factTypes?.length && { factTypes: options.factTypes }),
      ...(options.memoryIds !== undefined && { memoryIds: options.memoryIds }),
      ...(options.factTypeWeights && { factTypeWeights: options.factTypeWeights }),
      ...(entityRanking.length > 0 && { entityRanking }),
      ...(temporalRanking.length > 0 && { temporalRanking }),
      ...(needsChunkEmbedding && { queryEmbedding: queryEmbedding ?? [] }),
      queryEmbedTotalTimeoutMs,
    });
    factResults.push(
      ...dedupeBy(
        results,
        (r) => r.uniqueId,
        (r) => r.content.trim()
      )
    );
    vaultSize = size;
    didRerank = reranked;
    rerankMs = factRerankMs;
    queryEmbedMs = needsChunkEmbedding ? sharedEmbedMs : factQueryEmbedMs;
    vaultRowsEmbedded = factRowsEmbedded;
    hadV2Head = v2Head;
    if (factEmbeddingsUnavailable) embeddingsUnavailable = true;
    factLaneRankedOnCosine = factRankedOnCosine;
    decryptLastRan = factDecryptLast;
    vaultRowsDecrypted = factRowsDecrypted;
    factLaneMs = nowMs() - factStart;
  }

  if (chunkEmbedFailed && !factLaneRankedOnCosine) embeddingsUnavailable = true;

  if (types.includes("chunk") && ctx.storageCtx && queryEmbedding) {
    const chunkStart = nowMs();
    const chunkMinScore = options.minScore ?? DEFAULT_CHUNK_MIN_SCORE;
    chunkFloor = chunkMinScore;
    const results = await searchChunksOp(ctx.storageCtx, queryEmbedding, {
      limit: types.includes("fact") ? Math.max(limit * 2, 16) : limit,
      minSimilarity: chunkMinScore,
      embeddingModel: ctx.embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL,
      ...(options.conversationId && { conversationId: options.conversationId }),
      ...(options.excludeConversationId && {
        excludeConversationId: options.excludeConversationId,
      }),
      ...(ctx.chunkCache && { chunkCache: ctx.chunkCache }),
    });
    chunkResults.push(...dedupeBy(results, (r) => r.chunkText.trim()));
    chunkLaneMs = nowMs() - chunkStart;
  }

  const fuseStart = nowMs();

  if (types.length === 1 || factResults.length === 0 || chunkResults.length === 0) {
    const memories: RankedMemory[] = [
      ...factResults.map((r) => toFactMemory(r, options.now)),
      ...chunkResults.map(toChunkMemory),
    ];
    memories.sort((a, b) => b.score - a.score);
    const candidateCount = factResults.length + chunkResults.length;
    fuseMs = nowMs() - fuseStart;
    const admitted = memories.slice(0, limit);
    hitLimit = memories.length > limit;
    emitDiagnostics(candidateCount, admitted);
    return {
      memories: admitted,
      usedBudget,
      reranked: didRerank,
      candidateCount,
      ...(vaultSize !== undefined && { vaultSize }),
    };
  }

  const chunkKey = (r: ChunkSearchResult) => `chunk:${r.message.uniqueId}:${r.chunkText.trim()}`;
  const factRanking = factResults.map((r) => `fact:${r.uniqueId}`);
  const chunkRanking = chunkResults.map(chunkKey);
  const fused = rrfFuse([factRanking, chunkRanking], options.rrfK);

  const byId = new Map<string, RankedMemory>();
  for (const r of factResults) {
    const m = toFactMemory(r, options.now);
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

  const ordered = [...byId.values()].sort((a, b) => b.score - a.score);
  const selectWith = (suppressed: Set<string>): { out: RankedMemory[]; cut: boolean } => {
    const out: RankedMemory[] = [];
    let cut = false;
    for (const m of ordered) {
      if (m.kind === "chunk" && m.messageId && suppressed.has(m.messageId)) continue;
      if (out.length >= limit) {
        cut = true;
        break;
      }
      out.push(m);
    }
    return { out, cut };
  };
  const provenanceOf = (selected: RankedMemory[]): Set<string> => {
    const s = new Set<string>();
    for (const m of selected) {
      if (m.kind === "fact" && m.sourceChunkIds) for (const id of m.sourceChunkIds) s.add(id);
    }
    return s;
  };
  let suppressed = new Set<string>();
  let selection = selectWith(suppressed);
  let memories = selection.out;
  for (let i = 0; i < ordered.length; i++) {
    const next = provenanceOf(memories);
    if (next.size === suppressed.size && [...next].every((id) => suppressed.has(id))) break;
    suppressed = next;
    selection = selectWith(suppressed);
    memories = selection.out;
  }
  hitLimit = selection.cut;
  fuseMs = nowMs() - fuseStart;
  emitDiagnostics(byId.size, memories);
  return {
    memories,
    usedBudget,
    reranked: didRerank,
    candidateCount: byId.size,
    ...(vaultSize !== undefined && { vaultSize }),
  };
}

function toFactMemory(r: VaultSearchResult, now?: number): RankedMemory {
  const createdAt = r.createdAt ?? new Date(0);
  const proofCount = r.proofCount ?? undefined;
  const lastObservedAt = r.lastObservedAt ?? null;
  return {
    id: r.uniqueId,
    kind: "fact",
    ...(r.eventTimeStart !== undefined && { eventTimeStart: r.eventTimeStart }),
    ...(r.eventTimeEnd !== undefined && { eventTimeEnd: r.eventTimeEnd }),
    ...(r.eventTimeKind !== undefined && { eventTimeKind: r.eventTimeKind }),
    ...(r.factType !== undefined && { factType: r.factType }),
    ...(r.sourceChunkIds !== undefined &&
      r.sourceChunkIds !== null && { sourceChunkIds: r.sourceChunkIds }),
    ...(proofCount !== undefined && proofCount !== null && { proofCount }),
    ...(lastObservedAt !== null && { lastObservedAt }),
    observationTrend: classifyObservationTrend(
      {
        createdAt,
        lastObservedAt,
        proofCount,
      },
      now ?? Date.now()
    ),
    content: r.content,
    score: r.similarity,
    scoreBreakdown: { fused: r.similarity },
    createdAt,
    updatedAt: r.updatedAt ?? new Date(0),
  };
}

export function graphTraversalOptions(options: RecallOptions, traverse: boolean) {
  const refineNeighbors: NeighborRefiner | undefined =
    traverse && options.graphRefine && options.decomposeOptions
      ? createLlmNeighborRefiner(options.decomposeOptions)
      : undefined;
  return {
    ...(options.maxHops !== undefined && { maxHops: options.maxHops }),
    ...(options.entityFanout !== undefined && { entityFanout: options.entityFanout }),
    ...(options.nodeBudget !== undefined && { nodeBudget: options.nodeBudget }),
    ...(options.rrfK !== undefined && { rrfK: options.rrfK }),
    ...(refineNeighbors && { refineNeighbors }),
  };
}

export async function buildGraphLaneRanking(
  query: string,
  ctx: RecallContext,
  traverse = false,
  traversalOptions: {
    maxHops?: number;
    entityFanout?: number;
    nodeBudget?: number;
    rrfK?: number;
    refineNeighbors?: NeighborRefiner;
  } = {}
): Promise<string[]> {
  const entityCtx = ctx.entityCtx ?? ctx.vaultCtx?.entityCtx;
  if (!entityCtx) return [];
  if (traverse) {
    const vaultSize = await safeCountVault(ctx);
    const vaultCtx = ctx.vaultCtx;
    return traverseGraphLane(query, entityCtx, {
      ...traversalOptions,
      ...(vaultSize !== undefined && { vaultSize }),
      ...(vaultCtx && {
        filterActiveMemoryIds: (ids: string[]) => getActiveVaultMemoryIdsOp(vaultCtx, ids),
      }),
    });
  }
  const queryEntities = extractQueryEntities(query);
  if (queryEntities.length === 0) return [];
  const memoryToEntities = await getMemoriesByEntityNamesOp(entityCtx, queryEntities);
  if (memoryToEntities.size === 0) return [];
  const ranked = [...memoryToEntities.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .map(([memoryId]) => memoryId);
  const budget =
    traversalOptions.nodeBudget !== undefined &&
    Number.isFinite(traversalOptions.nodeBudget) &&
    traversalOptions.nodeBudget >= 1
      ? Math.floor(traversalOptions.nodeBudget)
      : NODE_BUDGET;
  const vaultCtx = ctx.vaultCtx;
  if (!vaultCtx) return ranked.slice(0, budget);
  const activeIds = await getActiveVaultMemoryIdsOp(vaultCtx, ranked);
  return ranked.filter((id) => activeIds.has(id)).slice(0, budget);
}

async function safeCountVault(ctx: RecallContext): Promise<number | undefined> {
  if (!ctx.vaultCtx) return undefined;
  try {
    return await countActiveVaultMemoriesOp(ctx.vaultCtx);
  } catch {
    return undefined;
  }
}

async function safeLane(
  label: string,
  onFailure: () => void,
  run: () => Promise<string[]>
): Promise<string[]> {
  try {
    return await run();
  } catch (err) {
    onFailure();
    getLogger().warn(
      `[memory/recall] ${label} lane failed; continuing without it: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return [];
  }
}

export async function buildTemporalLaneRanking(
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
    scoreBreakdown: { cosine: r.similarity },
    conversationId: r.message.conversationId,
    messageId: r.message.uniqueId,
    role: r.message.role as "user" | "assistant",
    createdAt: r.message.createdAt,
    updatedAt: r.message.createdAt,
  };
}
