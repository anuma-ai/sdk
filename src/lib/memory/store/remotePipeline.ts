import { v7 as uuidv7 } from "uuid";

import { parseTopics } from "../../db/entities/types.js";
import { normalizeTrustTier } from "../../db/memoryVault/operations.js";
import {
  MEMORY_LEVELS,
  type MemoryLevel,
  parseMedia,
  type StoredVaultMemory,
} from "../../db/memoryVault/types.js";
import { getLogger } from "../../logger.js";
import { DEFAULT_API_EMBEDDING_MODEL } from "../../memoryEngine/constants.js";
import { generateEmbeddings } from "../../memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../../memoryEngine/types.js";
import { normalizeSubQueries } from "../../memoryVault/decomposeQuery.js";
import {
  type MemoryVaultSearchOptions,
  type PreparedVaultCandidates,
  rankPreparedVaultCandidates,
} from "../../memoryVault/searchTool.js";
import { recall } from "../recall.js";
import { type RetainPersistence, retainWithPersistence } from "../retain.js";
import type { RecallFactSource, RecallResult, RetainResult } from "../types.js";
import {
  type RemoteMemoryCandidateOptions,
  type RemoteMemoryDecodeFailure,
  RemoteMemoryError,
  type RemoteMemoryPersistence,
  type RemoteMemoryRecord,
  type RemoteMemoryRow,
} from "./remotePersistence.js";
import type { MemoryRecallOptions, MemoryRetainOptions } from "./types.js";

export interface RemoteMemoryPipelineOptions {
  persistence: RemoteMemoryPersistence;
  embeddingOptions: EmbeddingOptions;
  /** Server-backed metadata lanes. These callbacks execute on the device. */
  graphRanking: RecallFactSource["graphRanking"];
  temporalRanking: RecallFactSource["temporalRanking"];
}
export interface RemoteMemoryPipeline {
  recall(query: string, options?: MemoryRecallOptions): Promise<RecallResult>;
  retain(content: string, options?: MemoryRetainOptions): Promise<RetainResult>;
}

/** Match nearby's qwen MRL storage: truncate FIRST, then normalize. */
function storedVector(vector: number[]): number[] {
  if (
    !Array.isArray(vector) ||
    (vector.length !== 1536 && vector.length !== 4096) ||
    vector.some((v) => !Number.isFinite(v))
  )
    throw new Error("Remote memories require a finite 1536/4096-dimensional vector");
  const out = vector.slice(0, 1536);
  const norm = Math.sqrt(out.reduce((sum, v) => sum + v * v, 0));
  if (!norm) throw new Error("Remote query/content vector has no direction after MRL truncation");
  return out.map((v) => v / norm);
}

function sourceIds(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
function isMemoryLevel(value: string | undefined): value is MemoryLevel {
  return (MEMORY_LEVELS as readonly (string | undefined)[]).includes(value);
}
function stored(row: RemoteMemoryRow): StoredVaultMemory {
  return {
    uniqueId: row.memory_id,
    content: row.content,
    scope: row.scope,
    folderId: row.folder_id ?? null,
    userId: null,
    kind: row.kind ?? null,
    kindValue: row.kind_value ?? null,
    ...(isMemoryLevel(row.level) && { level: row.level }),
    embedding: row.embedding ? JSON.stringify(row.embedding) : null,
    embeddingModel: row.embedding_model ?? null,
    sourceChunkIds: row.source_chunk_ids === undefined ? null : sourceIds(row.source_chunk_ids),
    proofCount: row.proof_count ?? null,
    source: row.source ?? null,
    media: parseMedia(row.media),
    eventTimeStart: row.event_time_start ?? null,
    eventTimeEnd: row.event_time_end ?? null,
    eventTimeKind: row.event_time_kind ?? null,
    topicsUserManaged: row.topics_user_managed ?? false,
    topics: parseTopics(row.topics),
    topicsUpdatedAt: row.topics_updated_at ?? null,
    topicsExtractedAt: row.topics_extracted_at ?? null,
    topicsExtractedVersion: row.topics_extracted_version ?? null,
    supersededBy: row.superseded_by ?? null,
    supersededAt: row.superseded_at ?? null,
    lastObservedAt: row.last_observed_at ?? null,
    factType: row.fact_type ?? null,
    archivedAt: row.archived_at ?? null,
    trustTier: row.trust_tier ?? null,
    visibility: row.visibility === "public" ? "public" : "private",
    twinOptIn: row.twin_opt_in ?? false,
    publishedAt: row.published_at ?? null,
    geohash: row.geohash ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    isDeleted: row.is_deleted,
  };
}

/**
 * Shared recall/retain on bounded server candidates; this is not a complete
 * MemoryStore or client cutover. Supply server-backed graph/temporal lanes:
 * there is deliberately no local-vault fallback. BM25 sees only admitted rows,
 * so a query-embedding outage fails rather than pretending to search the vault.
 * @public
 */
export function createRemoteMemoryPipeline(
  options: RemoteMemoryPipelineOptions
): RemoteMemoryPipeline {
  const { persistence, embeddingOptions } = options;
  const model = embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL;
  const operation = (mode: "recall" | "retain") => {
    const rejectUndecryptable = (failed: RemoteMemoryDecodeFailure[]) => {
      if (!failed.length) return;
      if (mode === "retain")
        throw new Error(
          `Remote memories could not decrypt ${failed.length} candidate row(s); refusing to retain until they are repaired`
        );
      getLogger().warn(
        `[memory/remote] Skipping ${failed.length} undecryptable candidate row(s)`,
        failed.map((failure) => failure.memory_id)
      );
    };
    const snapshots = new Map<string, RemoteMemoryRecord>();
    const remember = (items: RemoteMemoryRecord[]) => {
      items.forEach((item) => snapshots.set(item.memory.memory_id, item));
      return items.map((item) => stored(item.memory));
    };
    const get = async (id: string) => {
      const snapshot = snapshots.get(id) ?? (await persistence.get(id));
      if (!snapshot || snapshot.memory.is_deleted || snapshot.memory.superseded_by) return null;
      snapshots.set(id, snapshot);
      return stored(snapshot.memory);
    };
    const prepare = async (
      query: string,
      search: MemoryVaultSearchOptions = {}
    ): Promise<PreparedVaultCandidates> => {
      if (search.folderId !== undefined)
        throw new Error("Remote memories do not support folder filters");
      const facets = normalizeSubQueries(search.subQueries);
      const facetQueries = facets.length >= 2 ? facets : [];
      const start = Date.now();
      const budgetMs = search.queryEmbedTotalTimeoutMs ?? 8000;
      const embed = (texts: string[]) =>
        generateEmbeddings(texts, {
          ...embeddingOptions,
          totalTimeoutMs: budgetMs,
        });
      const embedFacets = async (): Promise<number[][]> => {
        if (!facetQueries.length) return [];
        try {
          const vectors = await embed(facetQueries);
          if (vectors.length !== facetQueries.length)
            throw new Error("Incomplete facet embeddings");
          return vectors.map(storedVector);
        } catch (error) {
          getLogger().warn(
            "[memory/remote] Facet embeddings unavailable; using primary query",
            error
          );
          return [];
        }
      };
      const [primary, facetEmbeddings] = await Promise.all([
        search.queryEmbedding ?? embed([query]).then((vectors) => vectors[0]),
        embedFacets(),
      ]);
      const queryEmbedding = storedVector(primary);
      const queryEmbedMs = Date.now() - start;
      const graph = search.entityRanking ?? [];
      const temporal = search.temporalRanking ?? [];
      const forced = new Set<string>();
      for (let i = 0; i < Math.max(graph.length, temporal.length) && forced.size < 100; i++) {
        if (graph[i] !== undefined) forced.add(graph[i]);
        if (forced.size < 100 && temporal[i] !== undefined) forced.add(temporal[i]);
      }
      const forceIds = [...forced];
      const windowOptions = (i: number, signal?: AbortSignal): RemoteMemoryCandidateOptions => ({
        limit: Math.min(100, Math.max((search.limit ?? 8) * 3, 30)),
        force_ids: i === 0 ? forceIds : [],
        ...(search.scopes && { scopes: search.scopes }),
        ...(search.factTypes && { fact_types: search.factTypes }),
        ...(search.memoryIds !== undefined && { memory_ids: search.memoryIds }),
        include_archived: search.includeArchived,
        embedding_model: model,
        ...(signal && { signal }),
      });
      const vectors = [queryEmbedding, ...facetEmbeddings];
      let windows: {
        items: RemoteMemoryRecord[];
        failed: RemoteMemoryDecodeFailure[];
        total_count?: number;
        unavailable_count?: number;
      }[];
      if (mode === "retain") {
        windows = await Promise.all(
          vectors.map((embedding, i) => persistence.candidateSet(embedding, windowOptions(i)))
        );
      } else {
        const deadline = new AbortController();
        const timer = setTimeout(
          () =>
            deadline.abort(
              new RemoteMemoryError("Remote recall exceeded its query budget", 408, "timeout")
            ),
          Math.max(0, start + budgetMs - Date.now())
        );
        try {
          windows = await Promise.all(
            vectors.map((embedding, i) =>
              persistence.candidates(embedding, windowOptions(i, deadline.signal))
            )
          );
        } finally {
          clearTimeout(timer);
        }
      }
      rejectUndecryptable([
        ...new Map(
          windows.flatMap((window) => window.failed).map((failure) => [failure.memory_id, failure])
        ).values(),
      ]);
      const items = [
        ...new Map(
          windows.flatMap((window) => window.items).map((item) => [item.memory.memory_id, item])
        ).values(),
      ];
      const memories = remember(items);
      return {
        memories,
        embeddedItems: memories.map((memory) => ({
          id: memory.uniqueId,
          content: memory.content,
          embedding: JSON.parse(memory.embedding ?? "[]") as number[],
          createdAt: memory.createdAt,
          updatedAt: memory.updatedAt,
          proofCount: memory.proofCount,
          lastObservedAt: memory.lastObservedAt,
          eventTimeStart: memory.eventTimeStart,
          eventTimeEnd: memory.eventTimeEnd,
          eventTimeKind:
            memory.eventTimeKind === "point" ||
            memory.eventTimeKind === "range" ||
            memory.eventTimeKind === "ongoing"
              ? memory.eventTimeKind
              : null,
          factType: memory.factType,
          sourceChunkIds: memory.sourceChunkIds,
        })),
        queryEmbedding,
        facetEmbeddings,
        vaultSize: Math.max(windows[0].total_count ?? 0, items.length),
        embeddingFailure: windows.some((window) => (window.unavailable_count ?? 0) > 0),
        embeddingsUnavailable:
          (windows[0].total_count ?? items.length) > 0 &&
          !memories.some((memory) => memory.embedding),
        decryptLast: true,
        rowsDecrypted: items.length,
        queryEmbedMs,
        rowsEmbedded: 0,
      };
    };
    const createRow = (input: Parameters<RetainPersistence["create"]>[0]): RemoteMemoryRow => {
      if (input.folderId !== undefined && input.folderId !== null)
        throw new Error("Remote memories do not support folders");
      const now = Date.now();
      return {
        memory_id: uuidv7(),
        content: input.content,
        scope: input.scope ?? "private",
        created_at: now,
        updated_at: now,
        is_deleted: false,
        ...(input.embedding !== undefined && {
          embedding: storedVector(JSON.parse(input.embedding) as number[]),
          embedding_model: input.embeddingModel,
        }),
        source_chunk_ids: JSON.stringify(input.sourceChunkIds ?? []),
        proof_count: input.proofCount ?? 1,
        source: input.source ?? "manual",
        ...(input.eventTime && {
          event_time_start: input.eventTime.start ?? undefined,
          event_time_end: input.eventTime.end ?? undefined,
          event_time_kind: input.eventTime.kind ?? undefined,
        }),
        fact_type: input.factType,
        trust_tier: normalizeTrustTier(input.trustTier) ?? undefined,
        geohash: input.geohash,
        visibility: "private",
        twin_opt_in: false,
      };
    };
    const write = async (memory: RemoteMemoryRow, snapshot: RemoteMemoryRecord | 0) =>
      remember([await persistence.put(memory, snapshot)])[0];
    const port: RetainPersistence = {
      prepare,
      get,
      getFresh: async (id) => {
        const current = await persistence.get(id);
        return current && !current.memory.is_deleted && !current.memory.superseded_by
          ? stored(current.memory)
          : null;
      },
      tombstones: async (embedding, embeddingModel, scope, folderId) => {
        if (folderId !== undefined) throw new Error("Remote memories do not support folders");
        const window = await persistence.candidateSet(storedVector(embedding), {
          limit: 1,
          scopes: [scope],
          embedding_model: embeddingModel,
          strict_model: true,
          include_deleted: true,
          deleted_only: true,
        });
        rejectUndecryptable(window.failed);
        return remember(window.items);
      },
      create: (input) => write(createRow(input), 0),
      update: async (id, patch) => {
        const existing = await get(id);
        if (
          !existing ||
          (patch.freeFormOnly && existing.kind !== null && existing.kind !== undefined)
        )
          return null;
        const snapshot = snapshots.get(id)!;
        const memory = {
          ...snapshot.memory,
          content: patch.content,
          updated_at: patch.preserveUpdatedAt ? snapshot.memory.updated_at : Date.now(),
        };
        if (patch.scope !== undefined) memory.scope = patch.scope;
        if (patch.embedding === undefined && patch.content !== snapshot.memory.content) {
          delete memory.embedding;
          delete memory.embedding_model;
        }
        if (patch.embedding !== undefined) {
          memory.embedding =
            patch.embedding === null ? [] : storedVector(JSON.parse(patch.embedding) as number[]);
          memory.embedding_model = patch.embeddingModel ?? undefined;
        }
        const observed = sourceIds(memory.source_chunk_ids);
        const replay =
          !!patch.observationSourceIds?.length &&
          patch.observationSourceIds.every((id) => observed.includes(id));
        if (patch.sourceChunkIds !== undefined)
          memory.source_chunk_ids = JSON.stringify(
            patch.observationSourceIds?.length
              ? [...new Set([...observed, ...patch.sourceChunkIds])]
              : patch.sourceChunkIds
          );
        if (!replay) {
          if (patch.proofCountIncrement !== undefined)
            memory.proof_count = (memory.proof_count ?? 1) + patch.proofCountIncrement;
          else if (patch.proofCount !== undefined) memory.proof_count = patch.proofCount;
          if (patch.lastObservedAt !== undefined) memory.last_observed_at = patch.lastObservedAt;
        }
        if (patch.source !== undefined) memory.source = patch.source;
        if (patch.factType !== undefined) memory.fact_type = patch.factType;
        if (patch.trustTier !== undefined)
          memory.trust_tier = normalizeTrustTier(patch.trustTier) ?? undefined;
        if (patch.topicsUserManaged !== undefined)
          memory.topics_user_managed = patch.topicsUserManaged;
        if (patch.eventTime !== undefined) {
          memory.event_time_start = patch.eventTime.start ?? undefined;
          memory.event_time_end = patch.eventTime.end ?? undefined;
          memory.event_time_kind = patch.eventTime.kind ?? undefined;
        }
        if (patch.restore) memory.archived_at = undefined;
        return write(memory, snapshot);
      },
      supersede: async (id, successor) => {
        const [target, newer] = await Promise.all([get(id), get(successor)]);
        if (!target || !newer || id === successor) return false;
        const old = snapshots.get(id)!;
        const next = snapshots.get(successor)!;
        remember(
          await persistence.putMany([
            {
              memory: { ...old.memory, superseded_by: successor, superseded_at: Date.now() },
              expectedVersion: old,
            },
            { memory: next.memory, expectedVersion: next },
          ])
        );
        return true;
      },
      createSuperseding: async (input, targetId) => {
        const target = await get(targetId);
        if (!target) return { created: null, retired: false };
        const snapshot = snapshots.get(targetId)!;
        const successor = createRow(input);
        const rows = remember(
          await persistence.putMany([
            { memory: successor, expectedVersion: 0 },
            {
              memory: {
                ...snapshot.memory,
                superseded_by: successor.memory_id,
                superseded_at: Date.now(),
              },
              expectedVersion: snapshot,
            },
          ])
        );
        return { created: rows[0], retired: true };
      },
    };
    return { prepare, port };
  };
  return {
    recall: async (query, recallOptions = {}) => {
      const { prepare } = operation("recall");
      return recall(
        query,
        {
          embeddingOptions,
          factSource: {
            graphRanking: options.graphRanking,
            temporalRanking: options.temporalRanking,
            search: async (text, searchOptions) => {
              const prepared = await prepare(text, searchOptions);
              const ranked = await rankPreparedVaultCandidates(
                text,
                prepared,
                embeddingOptions,
                searchOptions
              );
              return {
                ...ranked,
                rankedOnCosine: prepared.memories.length > 0 && !prepared.embeddingsUnavailable,
                decryptLast: true,
                rowsDecrypted: prepared.rowsDecrypted,
                queryEmbedMs: prepared.queryEmbedMs,
                rowsEmbedded: 0,
              };
            },
          },
        },
        { ...recallOptions, types: ["fact"] }
      );
    },
    retain: async (content, retainOptions) => {
      const { port } = operation("retain");
      return retainWithPersistence(
        content,
        {
          persistence: port,
          embeddingOptions,
          vaultCache: new Map(),
          normalizeEmbedding: storedVector,
        },
        retainOptions
      );
    },
  };
}
