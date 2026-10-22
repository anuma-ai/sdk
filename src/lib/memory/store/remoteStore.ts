import { v7 as uuidv7 } from "uuid";

import type { EntityInput } from "../../db/entities/operations.js";
import {
  normalizeEntityName,
  parseTopics,
  parseTopicWeight,
  serializeTopics,
  type StoredEntity,
  type StoredTopic,
} from "../../db/entities/types.js";
import type { DecayCandidateRaw } from "../../db/memoryVault/operations.js";
import {
  assertValidKindLevel,
  resolveCreateLevel,
  TOPICS_EXTRACTION_VERSION,
} from "../../db/memoryVault/operations.js";
import {
  levelForScopeChange,
  type MemoryLevel,
  MemorySourceIneligibleError,
  resolveMemoryLevel,
  scopeForLevel,
  type StoredVaultMemory,
  type VaultMemoryProjection,
  type VaultMemoryVisibility,
} from "../../db/memoryVault/types.js";
import { getLogger } from "../../logger.js";
import { DEFAULT_API_EMBEDDING_MODEL } from "../../memoryEngine/constants.js";
import {
  EmbeddingHttpError,
  generateEmbedding,
  generateEmbeddings,
  isFatalEmbeddingError,
} from "../../memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../../memoryEngine/types.js";
import {
  createDecaySweeperOver,
  type DecaySweepBackend,
  ruleBasedDecayOptions,
} from "../decayWorker.js";
import { NODE_BUDGET } from "../graphTraversal.js";
import type { PortalLlmFailure } from "../portalLlm.js";
import { extractQueryEntities } from "../queryEntities.js";
import { parseQueryTimeWindow } from "../queryTemporal.js";
import { notifyMemoryCallback } from "../recallTelemetry.js";
import {
  extractEntitiesForMemories,
  type TopicExtractionBatchDiagnostics,
  type TopicSkipReason,
} from "../topicExtract.js";
import type { RecallFactSource, RecallOptions } from "../types.js";
import {
  type RemoteMemoryDecodeFailure,
  RemoteMemoryError,
  type RemoteMemoryMetadataRecord,
  type RemoteMemoryPersistence,
  type RemoteMemoryQueryOptions,
  type RemoteMemoryRecord,
  type RemoteMemoryRow,
} from "./remotePersistence.js";
import { createRemoteMemoryPipeline, stored, storedVector } from "./remotePipeline.js";
import { createRemoteTopic } from "./remoteTopics.js";
import { isRemoteWorkLeaseExpired, withRemoteWorkLease } from "./remoteWork.js";
import type {
  EmbeddingRepairOptions,
  EmbeddingRepairResult,
  MemoryCreate,
  MemoryListOptions,
  MemoryStore,
  MemorySubscribeOptions,
  MemoryTopic,
  MemoryTopicMaintenance,
  MemoryUpdate,
} from "./types.js";

/** @public */
export interface RemoteMemoryStoreOptions {
  persistence: RemoteMemoryPersistence;
  embeddingOptions: EmbeddingOptions;
  /** Defaults to ranking memories by how many query entities their topics name. */
  graphRanking?: RecallFactSource["graphRanking"];
  temporalRanking?: RecallFactSource["temporalRanking"];
  pollIntervalMs?: number;
  activity?: {
    isActive: () => boolean;
    subscribe: (onChange: () => void) => () => void;
  };
  /** Report connection state on subscribe/reconnect and true on each account memory change. */
  subscribeChanges?: (onChange: (connected: boolean) => void) => () => void;
}

type Change = "membership" | "edit" | "embedding" | "metadata";
type RowEdit = (memory: RemoteMemoryRow) => RemoteMemoryRow | null;

type Row = RemoteMemoryRecord | RemoteMemoryMetadataRecord;

type Page<T> = { items: T[]; failed?: RemoteMemoryDecodeFailure[]; next_cursor?: string };

type ListFilters = Omit<RemoteMemoryQueryOptions, "cursor" | "limit" | "order"> & {
  order: "created" | "updated" | "archived";
};

function projection({ memory }: RemoteMemoryMetadataRecord): VaultMemoryProjection {
  return {
    uniqueId: memory.memory_id,
    scope: memory.scope,
    folderId: memory.folder_id ?? null,
    embedding: memory.embedding?.length ? JSON.stringify(memory.embedding) : null,
    embeddingModel: memory.embedding_model ?? null,
    createdAt: new Date(memory.created_at),
    updatedAt: new Date(memory.updated_at),
    lastObservedAt: memory.last_observed_at ?? null,
    topicsUserManaged: memory.topics_user_managed ?? false,
  };
}

interface Subscriber {
  onChange: () => void;
  options: MemorySubscribeOptions;
}

function relevant(change: Change, options: MemorySubscribeOptions): boolean {
  if (change === "metadata") return false;
  return options.includeDeleted
    ? change === "membership"
    : change !== "embedding" || !!options.embeddings;
}

function safely(onChange: () => void) {
  try {
    onChange();
  } catch (error) {
    getLogger().warn("[memory/remote-store] Subscriber threw:", error);
  }
}

const MAX_BATCH = 50;
const MAX_QUERY_IDS = 1000;
const MAX_QUERY_TOPICS = 100;
const MAX_QUERY_FILTER = 20;
const GRAPH_LANE_ROWS = 256;
const REPAIR_ROWS = 50;
const REPAIR_SCAN = 2000;
const DECAY_TRANSITIONS_PER_SWEEP = 200;

export class RemoteMemoryPartialCreateError extends Error {
  constructor(
    public readonly created: StoredVaultMemory[],
    public readonly cause: unknown
  ) {
    super(`createMany stored ${created.length} memories before a batch failed`);
    this.name = "RemoteMemoryPartialCreateError";
  }
}

function rejectsInput(error: unknown): boolean {
  return (
    error instanceof EmbeddingHttpError &&
    error.status !== undefined &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 429 &&
    !isFatalEmbeddingError(error)
  );
}

function warnFailed(failed: RemoteMemoryDecodeFailure[]) {
  if (failed.length)
    getLogger().warn(
      `[memory/remote-store] Skipping ${failed.length} undecryptable row(s)`,
      failed.map((failure) => failure.memory_id)
    );
}

function bounded<T extends { scopes?: string[]; fact_types?: string[] }>(
  filters: T,
  key: "scopes" | "fact_types"
): T[] {
  const values = filters[key];
  if (!values || values.length <= MAX_QUERY_FILTER) return [filters];
  return chunks(values, MAX_QUERY_FILTER).map((chunk) => ({ ...filters, [key]: chunk }));
}

function maxOf(options: MemoryListOptions): number {
  return options.limit && options.limit > 0 ? options.limit : Infinity;
}

function chunks<T>(values: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

function stateFilters(options: MemoryListOptions) {
  return {
    include_deleted: options.includeDeleted,
    include_archived: options.includeArchived,
    include_quarantined: options.includeQuarantined,
    include_superseded: options.includeSuperseded,
  };
}

function hidden(memory: RemoteMemoryRow, options: MemorySubscribeOptions): boolean {
  if (memory.trust_tier === "quarantined") return true;
  if (options.includeDeleted) return false;
  return (
    !!memory.is_deleted ||
    (memory.archived_at !== undefined && memory.archived_at !== null) ||
    !!memory.superseded_by
  );
}

function subscriptionKey(
  { memory, version }: RemoteMemoryRecord,
  options: MemorySubscribeOptions
): string | undefined {
  if (hidden(memory, options)) return undefined;
  if (options.includeDeleted) return String(!!memory.is_deleted);
  return JSON.stringify([
    options.embeddings ? version : null,
    memory.content,
    memory.scope,
    memory.updated_at,
    memory.fact_type,
    memory.event_time_start,
    memory.event_time_end,
    memory.event_time_kind,
    memory.trust_tier,
    memory.visibility,
    memory.published_at,
    memory.geohash,
    memory.topics,
    memory.topics_user_managed,
    memory.media,
    memory.source,
  ]);
}

function topicInputs(topics: readonly EntityInput[], source: StoredTopic["source"]): StoredTopic[] {
  return topics.flatMap((topic) => {
    const name = (typeof topic === "string" ? topic : topic.name).trim();
    const kind = typeof topic === "string" ? undefined : topic.kind;
    const weight =
      typeof topic === "string" || source === "user" ? undefined : parseTopicWeight(topic.weight);
    return name ? [{ name, ...(kind && { kind }), source, ...(weight && { weight }) }] : [];
  });
}

function mergeTopics(existing: readonly StoredTopic[], added: readonly StoredTopic[]) {
  const byName = new Map<string, StoredTopic>();
  for (const topic of [...existing, ...added]) {
    const key = normalizeEntityName(topic.name);
    const kept = byName.get(key);
    if (!kept) byName.set(key, topic);
    else if (kept.weight !== undefined && topic.weight !== undefined && topic.weight > kept.weight)
      byName.set(key, { ...kept, weight: topic.weight });
  }
  return [...byName.values()];
}

function sameTopics(stored: readonly StoredTopic[] | null, next: readonly StoredTopic[]): boolean {
  const key = (t: StoredTopic) =>
    JSON.stringify([t.name, t.kind ?? null, t.source, t.weight ?? null]);
  if (stored === null || stored.length !== next.length) return false;
  const keys = new Set(stored.map(key));
  return next.every((t) => keys.has(key(t)));
}

function canonicalTopics(row: Pick<RemoteMemoryRow, "topics">): Set<string> {
  return new Set((parseTopics(row.topics) ?? []).map((topic) => normalizeEntityName(topic.name)));
}

/**
 * {@link MemoryStore} over nearby's private-memory API with device-side decryption.
 * @public
 */
export function createRemoteMemoryStore(options: RemoteMemoryStoreOptions): MemoryStore {
  const { persistence, embeddingOptions } = options;
  const model = embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL;
  const pollIntervalMs = options.pollIntervalMs ?? 60_000;
  const activity = options.activity ?? {
    isActive: () =>
      (typeof document === "undefined" || document.visibilityState !== "hidden") &&
      (typeof navigator === "undefined" || navigator.onLine !== false),
    subscribe: (onChange: () => void) => {
      if (typeof window === "undefined" || typeof document === "undefined") return () => {};
      document.addEventListener("visibilitychange", onChange);
      window.addEventListener("online", onChange);
      window.addEventListener("offline", onChange);
      return () => {
        document.removeEventListener("visibilitychange", onChange);
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
      };
    },
  };
  const pipeline = createRemoteMemoryPipeline({
    ...options,
    graphRanking:
      options.graphRanking ??
      ((query, _traverse, recallOptions) => topicGraphRanking(query, recallOptions)),
    temporalRanking: options.temporalRanking ?? ((query, now) => eventTimeRanking(query, now)),
  });
  const subscribers = new Set<Subscriber>();
  const retainTopics = () =>
    pollIntervalMs > 0 && [...subscribers].some((subscriber) => subscriber.options.topics);
  const seen = new Map<string, RemoteMemoryRecord>();
  const reads = new Map<string, ReturnType<RemoteMemoryPersistence["query"]>>();
  const metadataReads = new Map<string, ReturnType<RemoteMemoryPersistence["queryMetadata"]>>();
  let topicSnapshot: Promise<MemoryTopic[]> | undefined;
  let topicCatalog: ReturnType<RemoteMemoryPersistence["topics"]> | undefined;
  const invalidateReads = () => {
    reads.clear();
    metadataReads.clear();
    topicSnapshot = undefined;
    topicCatalog = undefined;
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let scheduledAt: number | undefined;
  let stopActivity: (() => void) | undefined;
  let stopChanges: (() => void) | undefined;
  let changesConnected = false;
  const notify = (change: Change, records: readonly RemoteMemoryRecord[] = []) => {
    invalidateReads();
    if (subscribers.size)
      for (const record of records) {
        const previous = seen.get(record.memory.memory_id);
        if ((previous?.version ?? 0) + 1 === record.version)
          seen.set(record.memory.memory_id, record);
      }
    for (const subscriber of [...subscribers])
      if (relevant(change, subscriber.options)) safely(subscriber.onChange);
  };

  const pages = async <T extends Row>(
    read: (options: RemoteMemoryQueryOptions) => Promise<Page<T>>,
    filters: Omit<RemoteMemoryQueryOptions, "cursor" | "limit">,
    max = Infinity
  ) => {
    const records: T[] = [];
    let cursor: string | undefined;
    do {
      const page = await read({
        ...filters,
        limit: Math.min(200, Math.max(1, max - records.length)),
        ...(cursor && { cursor }),
      });
      if (page.failed) warnFailed(page.failed);
      records.push(...page.items);
      cursor = page.next_cursor;
    } while (cursor && records.length < max);
    return records.slice(0, max);
  };
  const shareRead = <T>(
    inflight: Map<string, Promise<T>>,
    options: RemoteMemoryQueryOptions,
    read: () => Promise<T>
  ): Promise<T> => {
    if (options.signal) return read();
    const key = JSON.stringify(Object.entries(options).sort(([a], [b]) => a.localeCompare(b)));
    const active = inflight.get(key);
    if (active) return active;
    const pending = read();
    inflight.set(key, pending);
    const clear = () => {
      if (inflight.get(key) === pending) inflight.delete(key);
    };
    void pending.then(clear, clear);
    return pending;
  };
  const decrypted = (options: RemoteMemoryQueryOptions) =>
    shareRead(reads, options, () => persistence.query(options));
  const metadata = (options: RemoteMemoryQueryOptions) =>
    shareRead(metadataReads, options, () =>
      persistence.queryMetadata(options as Parameters<typeof persistence.queryMetadata>[0])
    );
  const readTopics = () => {
    if (topicCatalog) return topicCatalog;
    const pending = persistence.topics();
    topicCatalog = pending;
    const clear = () => {
      if (topicCatalog === pending) topicCatalog = undefined;
    };
    void pending.then(() => {
      if (!retainTopics()) clear();
    }, clear);
    return pending;
  };
  const enumerate = (filters: Omit<RemoteMemoryQueryOptions, "cursor" | "limit">, max = Infinity) =>
    pages(decrypted, filters, max);
  const memoriesByTopics = async (names: readonly string[]) => {
    const wanted = new Set(names.map(normalizeEntityName).filter(Boolean));
    const out = new Map<string, Set<string>>();
    const pages = await Promise.all(
      chunks([...wanted], MAX_QUERY_TOPICS).map((topics) => enumerate({ topics }))
    );
    for (const { memory } of pages.flat()) {
      const matched = [...canonicalTopics(memory)].filter((name) => wanted.has(name));
      if (matched.length) out.set(memory.memory_id, new Set(matched));
    }
    return out;
  };
  const topicGraphRanking = async (
    query: string,
    recallOptions: RecallOptions = {}
  ): Promise<string[]> => {
    const wanted = new Set(extractQueryEntities(query).map(normalizeEntityName).filter(Boolean));
    if (wanted.size === 0 || recallOptions.memoryIds?.length === 0) return [];
    const rows = await pages(
      metadata,
      {
        topics: [...wanted].slice(0, MAX_QUERY_TOPICS),
        ...(recallOptions.scopes && { scopes: recallOptions.scopes }),
        ...(recallOptions.factTypes && { fact_types: recallOptions.factTypes }),
        ...(recallOptions.memoryIds && { memory_ids: recallOptions.memoryIds }),
      },
      GRAPH_LANE_ROWS
    );
    return rows
      .map(({ memory }) => ({
        memoryId: memory.memory_id,
        matched: [...canonicalTopics(memory)].filter((name) => wanted.has(name)).length,
      }))
      .filter((row) => row.matched > 0)
      .sort((a, b) => b.matched - a.matched)
      .slice(0, NODE_BUDGET)
      .map((row) => row.memoryId);
  };
  const eventTimeRanking = async (query: string, now?: number): Promise<string[]> => {
    const window = parseQueryTimeWindow(query, now);
    if (!window) return [];
    return persistence.temporal({ start: window.start, end: window.end });
  };
  const enumerateIds = async <T extends Row>(
    read: (options: RemoteMemoryQueryOptions) => Promise<Page<T>>,
    ids: readonly string[],
    filters: Omit<RemoteMemoryQueryOptions, "cursor" | "limit" | "memory_ids">
  ) =>
    (
      await Promise.all(
        chunks([...new Set(ids)], MAX_QUERY_IDS).map((memory_ids) =>
          pages(read, { ...filters, memory_ids })
        )
      )
    ).flat();
  const listFilters = (listOptions: MemoryListOptions): ListFilters => ({
    ...stateFilters(listOptions),
    include_embeddings: listOptions.withEmbeddings !== false,
    order: listOptions.since ? "updated" : "created",
    ...(listOptions.scopes?.length && { scopes: listOptions.scopes }),
    ...(listOptions.factTypes?.length && { fact_types: listOptions.factTypes }),
    ...(listOptions.visibility?.length && { visibility: listOptions.visibility }),
    ...(listOptions.since && { updated_after: listOptions.since.getTime() }),
  });
  const listRows = async <T extends Row>(
    read: (options: RemoteMemoryQueryOptions) => Promise<Page<T>>,
    listOptions: MemoryListOptions,
    filters: ListFilters,
    max: number
  ): Promise<T[]> => {
    const variants = bounded(filters, "scopes").flatMap((f) => bounded(f, "fact_types"));
    if (!listOptions.memoryIds && variants.length === 1) return pages(read, filters, max);
    const fetched = await Promise.all(
      variants.map((variant) =>
        listOptions.memoryIds
          ? enumerateIds(read, listOptions.memoryIds, variant)
          : pages(read, variant, max)
      )
    );
    const time = (row: T) =>
      filters.order === "updated" ? row.memory.updated_at : row.memory.created_at;
    return [...new Map(fetched.flat().map((r) => [r.memory.memory_id, r])).values()]
      .sort((a, b) => time(b) - time(a) || (a.memory.memory_id < b.memory.memory_id ? 1 : -1))
      .slice(0, max);
  };

  const queues = new Map<string, Promise<unknown>>();
  const serialized = <T>(id: string, task: () => Promise<T>): Promise<T> => {
    const run = (queues.get(id) ?? Promise.resolve()).then(task, task);
    const settled = run.catch(() => undefined);
    queues.set(id, settled);
    void settled.then(() => {
      if (queues.get(id) === settled) queues.delete(id);
    });
    return run;
  };
  const live = async (id: string) => {
    const record = await persistence.get(id);
    return record && !record.memory.is_deleted ? record : null;
  };
  const mutateLocked = async (
    id: string,
    change: Change | ((before: RemoteMemoryRow) => Change),
    edit: RowEdit,
    writeOptions?: Parameters<MemoryStore["addTopics"]>[2] & { leaseToken?: string }
  ): Promise<RemoteMemoryRecord | null> => {
    writeOptions?.signal?.throwIfAborted();
    const record = writeOptions?.signal
      ? await persistence.get(id, writeOptions.signal)
      : await live(id);
    if (!record) return null;
    if (record.memory.is_deleted) return null;
    if (writeOptions?.canWrite && !(await writeOptions.canWrite()))
      throw new MemorySourceIneligibleError();
    writeOptions?.signal?.throwIfAborted();
    const next = edit(structuredClone(record.memory));
    if (!next) return null;
    const saved = writeOptions?.leaseToken
      ? (
          await persistence.putMany(
            [{ memory: next, expectedVersion: record }],
            writeOptions.signal,
            writeOptions.leaseToken
          )
        )[0]
      : writeOptions?.signal
        ? await persistence.put(next, record, writeOptions.signal)
        : await persistence.put(next, record);
    notify(typeof change === "function" ? change(record.memory) : change, [saved]);
    return saved;
  };
  const mutate = (
    id: string,
    change: Change | ((before: RemoteMemoryRow) => Change),
    edit: RowEdit,
    writeOptions?: Parameters<MemoryStore["addTopics"]>[2]
  ): Promise<RemoteMemoryRecord | null> =>
    serialized(id, () => mutateLocked(id, change, edit, writeOptions));
  const serializedAll = <T>(ids: readonly string[], task: () => Promise<T>): Promise<T> =>
    [...new Set(ids)]
      .sort()
      .reduceRight<() => Promise<T>>((inner, id) => () => serialized(id, inner), task)();
  const mutateMany = async (
    ids: readonly string[],
    change: (before: RemoteMemoryRow) => Change,
    edit: RowEdit,
    leaseToken?: string,
    signal?: AbortSignal
  ) => {
    const saved = new Map<string, RemoteMemoryRecord>();
    const failed = new Map<string, unknown>();
    for (const slice of chunks([...new Set(ids)], MAX_BATCH)) {
      await serializedAll(slice, async () => {
        signal?.throwIfAborted();
        const writes: { before: RemoteMemoryRecord; memory: RemoteMemoryRow }[] = [];
        let read: Awaited<ReturnType<typeof readEveryState>>;
        try {
          read = await readEveryState(slice, signal);
        } catch (error) {
          signal?.throwIfAborted();
          for (const id of slice) failed.set(id, error);
          return;
        }
        const { records, unreadable } = read;
        for (const id of slice) {
          const record = records.get(id);
          if (unreadable.has(id)) failed.set(id, new Error(`Memory ${id} could not be decrypted`));
          else if (!record) failed.set(id, new Error(`Memory ${id} was not found`));
          else if (!record.memory.is_deleted) {
            const memory = edit(structuredClone(record.memory));
            if (memory) writes.push({ before: record, memory });
          }
        }
        if (writes.length === 0) return;
        try {
          const written = await persistence.putMany(
            writes.map(({ before, memory }) => ({ memory, expectedVersion: before })),
            signal,
            leaseToken
          );
          const byChange = new Map<Change, RemoteMemoryRecord[]>();
          written.forEach((record, i) => {
            saved.set(record.memory.memory_id, record);
            const kind = change(writes[i].before.memory);
            byChange.set(kind, [...(byChange.get(kind) ?? []), record]);
          });
          for (const [kind, changed] of byChange) notify(kind, changed);
        } catch (error) {
          signal?.throwIfAborted();
          if (isRemoteWorkLeaseExpired(error)) throw error;
          const perRow =
            error instanceof RemoteMemoryError &&
            (error.code === "version_conflict" || (error.status === 429 && !leaseToken));
          for (const { before } of writes) {
            const id = before.memory.memory_id;
            if (!perRow) {
              failed.set(id, error);
              continue;
            }
            try {
              const record = await mutateLocked(
                id,
                change,
                edit,
                leaseToken || signal ? { leaseToken, signal } : undefined
              );
              if (record) saved.set(id, record);
            } catch (rowError) {
              signal?.throwIfAborted();
              if (isRemoteWorkLeaseExpired(rowError)) throw rowError;
              failed.set(id, rowError);
            }
          }
        }
      });
    }
    return { saved, failed };
  };

  const embedInBackground = ({ memory: { memory_id: id, content } }: RemoteMemoryRecord) => {
    generateEmbedding(content, embeddingOptions)
      .then((vector) =>
        serialized(id, async () => {
          const current = await live(id);
          if (!current || current.memory.content !== content || current.memory.embedding?.length)
            return;
          const saved = await persistence.put(
            { ...current.memory, embedding: storedVector(vector), embedding_model: model },
            current
          );
          notify("embedding", [saved]);
        })
      )
      .catch((error: unknown) => {
        getLogger().warn("[memory/remote-store] Failed to embed memory:", error);
      });
  };
  const newRow = (input: MemoryCreate): RemoteMemoryRow => {
    const now = Date.now();
    const { level, scope } = resolveCreateLevel(input);
    assertValidKindLevel(input.kind, level);
    return {
      memory_id: uuidv7(),
      content: input.content,
      scope,
      level,
      ...(input.kind !== undefined && input.kind !== null && { kind: input.kind }),
      ...(typeof input.kindValue === "string" && { kind_value: input.kindValue }),
      created_at: now,
      updated_at: now,
      is_deleted: false,
      ...(input.embedding !== undefined && {
        embedding: storedVector(JSON.parse(input.embedding) as number[]),
        embedding_model: input.embeddingModel ?? model,
      }),
      proof_count: 1,
      source: "manual",
      ...(input.eventTime && {
        event_time_start: input.eventTime.start ?? undefined,
        event_time_end: input.eventTime.end ?? undefined,
        event_time_kind: input.eventTime.kind ?? undefined,
      }),
      fact_type: input.factType,
      geohash: input.geohash,
      visibility: "private",
      twin_opt_in: false,
    };
  };
  const created = (records: RemoteMemoryRecord[], inputs: MemoryCreate[]) => {
    records.forEach((record, i) => {
      if (inputs[i].embedding === undefined) embedInBackground(record);
    });
    notify("membership", records);
    return records.map((record) => stored(record.memory));
  };
  const asStored = (record: RemoteMemoryRecord | null) => (record ? stored(record.memory) : null);
  const knownKinds = async (topics: readonly StoredTopic[], signal?: AbortSignal) => {
    const unkinded = [
      ...new Set(topics.filter((t) => !t.kind).map((t) => normalizeEntityName(t.name))),
    ];
    const kinds = new Map<string, string>();
    for (const names of chunks(unkinded, MAX_QUERY_TOPICS)) {
      for (const { memory } of await pages(metadata, {
        topics: names,
        include_archived: true,
        include_quarantined: true,
        include_superseded: true,
        ...(signal && { signal }),
      })) {
        for (const topic of parseTopics(memory.topics) ?? []) {
          const name = normalizeEntityName(topic.name);
          if (topic.kind && !kinds.has(name)) kinds.set(name, topic.kind);
        }
      }
    }
    return (topic: StoredTopic): StoredTopic => {
      const kind = topic.kind ?? kinds.get(normalizeEntityName(topic.name));
      return kind ? { ...topic, kind } : topic;
    };
  };
  const withKnownKinds = async (topics: StoredTopic[]) => topics.map(await knownKinds(topics));

  const readEveryState = async (ids: readonly string[], signal?: AbortSignal) => {
    const records = new Map<string, RemoteMemoryRecord>();
    const unreadable = new Set<string>();
    for (const memory_ids of chunks(ids, MAX_QUERY_IDS)) {
      let cursor: string | undefined;
      do {
        const page = await persistence.query({
          memory_ids,
          include_deleted: true,
          include_archived: true,
          include_quarantined: true,
          include_superseded: true,
          limit: 200,
          ...(signal && { signal }),
          ...(cursor && { cursor }),
        });
        warnFailed(page.failed);
        for (const record of page.items) records.set(record.memory.memory_id, record);
        for (const failure of page.failed) unreadable.add(failure.memory_id);
        cursor = page.next_cursor;
      } while (cursor);
    }
    return { records, unreadable };
  };

  const extractTopicsUnlocked = async (
    memoryIds: readonly string[],
    extractOptions: Parameters<MemoryTopicMaintenance["extractTopics"]>[1],
    leaseToken?: string,
    signal?: AbortSignal
  ): ReturnType<MemoryTopicMaintenance["extractTopics"]> => {
    const start = Date.now();
    const extractedAt = extractOptions.now ?? start;
    const skippedIds: string[] = [];
    const skippedReasons = new Map<string, TopicSkipReason>();
    const skip = (id: string, reason: TopicSkipReason) => {
      if (skippedReasons.has(id)) return;
      skippedIds.push(id);
      skippedReasons.set(id, reason);
    };
    const ids = [...new Set(memoryIds)];
    const { records, unreadable } = await readEveryState(ids, signal);
    signal?.throwIfAborted();
    const inputs: { id: string; content: string }[] = [];
    for (const id of ids) {
      const memory = records.get(id)?.memory;
      if (unreadable.has(id)) skip(id, "unreadable");
      else if (!memory) skip(id, "not-found");
      else if (memory.is_deleted || memory.topics_user_managed) skip(id, "excluded");
      else inputs.push({ id, content: memory.content });
    }

    const batches: TopicExtractionBatchDiagnostics[] = [];
    const llmFailures = new Map<string, PortalLlmFailure>();
    const entitiesByMemory = await extractEntitiesForMemories(
      inputs,
      {
        ...extractOptions,
        onBatch: (batch) => {
          batches.push(batch);
          if (batch.failure) {
            for (const id of batch.memoryIds) llmFailures.set(id, batch.failure);
          }
          notifyMemoryCallback(extractOptions.onBatch, batch);
        },
      },
      signal
    );
    signal?.throwIfAborted();
    const answered = new Map<string, { content: string; topics: StoredTopic[] }>();
    for (const input of inputs) {
      const entities = entitiesByMemory.get(input.id);
      if (entities === undefined) skip(input.id, "llm-unanswered");
      else
        answered.set(input.id, { content: input.content, topics: topicInputs(entities, "auto") });
    }
    const stampedIds: string[] = [];
    const fail = (id: string, reason: TopicSkipReason) => {
      skip(id, reason);
      entitiesByMemory.delete(id);
    };
    try {
      const kinded = await knownKinds(
        [...answered.values()].flatMap((a) => a.topics),
        signal
      );
      signal?.throwIfAborted();
      const topics = new Map(
        [...answered].map(([id, a]) => [id, mergeTopics([], a.topics.map(kinded))])
      );
      const unchanged = (memory: RemoteMemoryRow) =>
        sameTopics(parseTopics(memory.topics), topics.get(memory.memory_id)!);
      const { saved, failed } = await mutateMany(
        [...answered.keys()],
        (before) =>
          sameTopics(parseTopics(before.topics) ?? [], topics.get(before.memory_id)!)
            ? "metadata"
            : "edit",
        (memory) => {
          if (
            memory.topics_user_managed ||
            memory.content !== answered.get(memory.memory_id)!.content
          )
            return null;
          return {
            ...memory,
            ...(!unchanged(memory) && {
              topics: serializeTopics(topics.get(memory.memory_id)!),
              topics_updated_at: Date.now(),
            }),
            topics_extracted_at: Math.max(extractedAt, memory.updated_at),
            topics_extracted_version: TOPICS_EXTRACTION_VERSION,
          };
        },
        leaseToken,
        signal
      );
      for (const id of answered.keys()) {
        if (saved.has(id)) stampedIds.push(id);
        else fail(id, failed.has(id) ? "link-failed" : "link-declined");
      }
      if (failed.size)
        getLogger().warn(
          "[memory/remote-store] Failed to write extracted topics:",
          failed.values().next().value
        );
    } catch (error) {
      signal?.throwIfAborted();
      if (isRemoteWorkLeaseExpired(error)) throw error;
      getLogger().warn("[memory/remote-store] Failed to write extracted topics:", error);
      for (const id of answered.keys()) fail(id, "link-failed");
    }
    return {
      entitiesByMemory,
      stampedIds,
      skippedIds,
      skippedReasons,
      batchCount: batches.length,
      durationMs: Date.now() - start,
      batches,
      llmFailures,
    };
  };

  const topicMaintenance: MemoryTopicMaintenance = {
    getTopicBacklog: async (backlogOptions = {}) => {
      const limit =
        backlogOptions.limit !== undefined && backlogOptions.limit > 0
          ? backlogOptions.limit
          : Infinity;
      const due = (extracted: boolean, max: number) =>
        pages(
          metadata,
          { order: "created", topics_due: TOPICS_EXTRACTION_VERSION, topics_extracted: extracted },
          max
        );
      const stale = await due(true, limit);
      const fresh = stale.length < limit ? await due(false, limit - stale.length) : [];
      return {
        pending: [...stale, ...fresh].map(({ memory }) => ({ uniqueId: memory.memory_id })),
        linkedUnstamped: [],
        topicsToRelink: [],
        topicsBackfill: [],
      };
    },
    extractTopics: async (ids, extractOptions) =>
      (await withRemoteWorkLease(
        persistence,
        "topics",
        String(TOPICS_EXTRACTION_VERSION),
        (token, signal) => extractTopicsUnlocked(ids, extractOptions, token, signal)
      )) ?? { ...(await extractTopicsUnlocked([], extractOptions)), deferred: true },
    stampTopicsExtracted: async (memoryIds, extractedAt, version = TOPICS_EXTRACTION_VERSION) => {
      const ids = [...new Set(memoryIds)];
      const { saved, failed } = await mutateMany(
        ids,
        () => "metadata",
        (memory) =>
          memory.topics_user_managed
            ? null
            : { ...memory, topics_extracted_at: extractedAt, topics_extracted_version: version }
      );
      if (failed.size)
        getLogger().warn("[memory/remote-store] Failed to stamp topics:", [...failed.values()]);
      return ids.filter((id) => saved.has(id));
    },
    relinkTopics: () => Promise.resolve([]),
    backfillTopics: () => Promise.resolve([]),
  };

  const decayRow = (memory: RemoteMemoryMetadataRecord["memory"]): DecayCandidateRaw => ({
    uniqueId: memory.memory_id,
    factType: memory.fact_type ?? null,
    eventTimeEnd: memory.event_time_end ?? null,
    eventTimeKind: memory.event_time_kind ?? null,
    updatedAt: memory.updated_at,
    lastObservedAt: memory.last_observed_at ?? null,
    archivedAt: memory.archived_at ?? null,
    source: memory.source ?? null,
    trustTier: memory.trust_tier ?? null,
  });
  const decayWrite = async (
    rows: readonly DecayCandidateRaw[],
    change: Change,
    edit: (memory: RemoteMemoryRow, seen: DecayCandidateRaw) => RemoteMemoryRow | null
  ) => {
    if (rows.length === 0) return new Set<string>();
    const seen = new Map(rows.map((row) => [row.uniqueId, row]));
    const { saved, failed } = await mutateMany(
      [...seen.keys()],
      () => change,
      (memory) => edit(memory, seen.get(memory.memory_id)!)
    );
    if (failed.size)
      getLogger().warn("[memory/remote-store] Decay skipped memories:", [...failed.values()]);
    return new Set(saved.keys());
  };
  const decayBackend: DecaySweepBackend = {
    candidates: async () =>
      (await pages(metadata, { include_archived: true, include_quarantined: true }))
        .filter(({ memory }) => memory.kind === undefined || memory.kind === null)
        .map(({ memory }) => decayRow(memory)),
    archive: (rows, now) =>
      decayWrite(rows, "edit", (memory, seen) =>
        (memory.archived_at ?? null) === null &&
        memory.updated_at === seen.updatedAt &&
        (memory.last_observed_at ?? null) === (seen.lastObservedAt ?? null)
          ? { ...memory, archived_at: now }
          : null
      ),
    hardDelete: (rows, { hardDeleteWindowMs, now }) =>
      decayWrite(rows, "membership", (memory) =>
        memory.archived_at !== undefined &&
        memory.archived_at !== null &&
        now - memory.archived_at > hardDeleteWindowMs
          ? { ...memory, is_deleted: true }
          : null
      ),
  };

  const everyState = {
    include_deleted: true,
    include_archived: true,
    include_quarantined: true,
    include_superseded: true,
  } as const;
  const changesSince = async (cursor: string | undefined, pending: ReadonlySet<string>) => {
    const records: RemoteMemoryRecord[] = [];
    const failed = new Map<string, number>();
    const collect = (page: {
      items: RemoteMemoryRecord[];
      failed: RemoteMemoryDecodeFailure[];
    }) => {
      warnFailed(page.failed);
      records.push(...page.items);
      for (const failure of page.failed) failed.set(failure.memory_id, failure.version);
    };
    let resume = cursor;
    let next: string | undefined;
    do {
      const page = await persistence.query({
        ...everyState,
        order: "changed",
        limit: 200,
        ...((next ?? resume) && { cursor: next ?? resume }),
      });
      collect(page);
      resume = page.changes_cursor ?? resume;
      next = page.next_cursor;
    } while (next);
    for (const memory_ids of chunks([...pending], MAX_QUERY_IDS)) {
      let retry: string | undefined;
      do {
        const page = await persistence.query({
          ...everyState,
          memory_ids,
          limit: 200,
          ...(retry && { cursor: retry }),
        });
        collect(page);
        retry = page.next_cursor;
      } while (retry);
    }
    return { records, resume, failed };
  };

  let generation = 0;
  let ready = false;
  let cursor: string | undefined;
  let pending = new Set<string>();
  let failedVersions = new Map<string, number>();
  let topicFingerprint: string | undefined;
  let polling = false;
  let pollRequested = false;
  let failures = 0;
  let retryAt = 0;
  const backoff = (error: unknown) => {
    failures++;
    retryAt =
      Date.now() +
      Math.max(
        error instanceof RemoteMemoryError ? (error.retryAfterMs ?? 0) : 0,
        Math.min(pollIntervalMs * 2 ** Math.min(failures - 1, 10), 15 * 60_000)
      );
  };
  const schedulePoll = (delay: number, keepEarlier = false) => {
    const at = Math.max(Date.now() + delay, retryAt);
    if (keepEarlier && timer && scheduledAt !== undefined && scheduledAt <= at) return;
    if (timer) clearTimeout(timer);
    timer = undefined;
    scheduledAt = undefined;
    if (!subscribers.size || pollIntervalMs <= 0 || !activity.isActive()) return;
    scheduledAt = at;
    timer = setTimeout(poll, Math.max(0, at - Date.now()));
  };
  const poll = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    scheduledAt = undefined;
    if (!subscribers.size || pollIntervalMs <= 0 || !activity.isActive()) return;
    if (Date.now() < retryAt) {
      schedulePoll(0);
      return;
    }
    if (polling) {
      pollRequested = true;
      return;
    }
    polling = true;
    pollRequested = false;
    const current = generation;
    changesSince(cursor, pending)
      .then(async ({ records, resume, failed }) => {
        let topicState: string | undefined;
        let topicFailed = false;
        if ([...subscribers].some((s) => s.options.topics))
          try {
            topicCatalog = undefined;
            topicState = JSON.stringify((await readTopics()).map((t) => [t.name, t.version]));
          } catch (error) {
            topicFailed = true;
            if (current === generation) backoff(error);
            getLogger().warn("[memory/remote-store] Topic subscription poll failed:", error);
          }
        if (current !== generation) return;
        if (!topicFailed) {
          failures = 0;
          retryAt = 0;
        }
        const failedChanged = [...failed].some(
          ([id, version]) => failedVersions.get(id) !== version
        );
        if (
          records.length ||
          failedChanged ||
          (topicState !== undefined && topicState !== topicFingerprint)
        ) {
          reads.clear();
          metadataReads.clear();
          topicSnapshot = undefined;
        }
        const changed = new Set<Subscriber>();
        if (
          (ready && failedChanged) ||
          (topicState !== undefined &&
            topicFingerprint !== undefined &&
            topicState !== topicFingerprint)
        )
          for (const subscriber of subscribers)
            if (subscriber.options.topics) changed.add(subscriber);
        if (topicState !== undefined) topicFingerprint = topicState;
        for (const record of records) {
          const id = record.memory.memory_id;
          const previous = seen.get(id);
          seen.set(id, record);
          if (!ready) continue;
          for (const subscriber of subscribers) {
            const before = previous && subscriptionKey(previous, subscriber.options);
            if (before !== subscriptionKey(record, subscriber.options)) changed.add(subscriber);
          }
        }
        ready = true;
        cursor = resume;
        pending = new Set(failed.keys());
        failedVersions = failed;
        for (const subscriber of changed)
          if (subscribers.has(subscriber)) safely(subscriber.onChange);
      })
      .catch((error: unknown) => {
        if (current === generation) backoff(error);
        getLogger().warn("[memory/remote-store] Subscription poll failed:", error);
      })
      .finally(() => {
        polling = false;
        schedulePoll(
          current !== generation
            ? 0
            : pollRequested
              ? 200
              : changesConnected
                ? Math.max(pollIntervalMs, 5 * 60_000)
                : pollIntervalMs
        );
      });
  };
  const refreshActivity = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (!activity.isActive()) {
      stopChanges?.();
      stopChanges = undefined;
      changesConnected = false;
      return;
    }
    if (!stopChanges && persistence.supportsRealtimeChanges && options.subscribeChanges)
      stopChanges = options.subscribeChanges((connected) => {
        changesConnected = connected;
        if (polling) {
          pollRequested = true;
          return;
        }
        schedulePoll(connected ? 200 : 0, true);
      });
    poll();
  };

  const unrepairable = new Set<string>();
  let repairCursor: string | undefined;
  const repairEmbeddingsUnlocked = async (
    {
      maxRows = REPAIR_ROWS,
      maxScan = REPAIR_SCAN,
      cursor: start = repairCursor,
    }: EmbeddingRepairOptions = {},
    leaseToken?: string,
    signal?: AbortSignal
  ): Promise<EmbeddingRepairResult> => {
    const scannedRows: RemoteMemoryMetadataRecord[] = [];
    let cursor = start;
    do {
      const page = await metadata({
        include_deleted: true,
        include_archived: true,
        include_quarantined: true,
        include_superseded: true,
        ...(signal && { signal }),
        limit: Math.min(200, Math.max(1, maxScan - scannedRows.length)),
        ...(cursor && { cursor }),
      });
      scannedRows.push(...page.items);
      cursor = page.next_cursor;
    } while (cursor && scannedRows.length < maxScan);
    const allStale = scannedRows.filter(
      ({ memory }) => memory.embedding_model !== model && !unrepairable.has(memory.memory_id)
    );
    const repaired = new Set<string>();
    const result: EmbeddingRepairResult = {
      scanned: scannedRows.length,
      reembedded: 0,
      failed: 0,
      skippedConflict: 0,
    };
    const finish = () => {
      signal?.throwIfAborted();
      const settled = allStale.every(
        ({ memory }) => repaired.has(memory.memory_id) || unrepairable.has(memory.memory_id)
      );
      repairCursor = settled ? cursor : start;
      return repairCursor ? { ...result, cursor: repairCursor } : result;
    };
    const stale = allStale.slice(0, maxRows).map(({ memory }) => memory.memory_id);
    if (stale.length === 0) return finish();
    const { records, unreadable } = await readEveryState(stale, signal);
    signal?.throwIfAborted();
    result.failed += unreadable.size;
    for (const id of stale)
      if (unreadable.has(id) || !records.get(id)?.memory.content.trim()) unrepairable.add(id);
    const targets = stale.filter((id) => !unrepairable.has(id)).map((id) => records.get(id)!);
    if (targets.length === 0) return finish();
    const vectors = await embedForRepair(targets, signal);
    signal?.throwIfAborted();
    if (!vectors) {
      result.failed += targets.length;
      return finish();
    }
    const writes = targets.flatMap((record, i) => {
      const vector = vectors[i];
      if (!vector) {
        result.failed++;
        return [];
      }
      try {
        return [
          {
            memory: {
              ...record.memory,
              embedding: storedVector(vector),
              embedding_model: model,
            },
            expectedVersion: record,
          },
        ];
      } catch {
        result.failed++;
        return [];
      }
    });
    for (const batch of chunks(writes, MAX_BATCH)) {
      await serializedAll(
        batch.map(({ memory }) => memory.memory_id),
        async () => {
          signal?.throwIfAborted();
          const commit = async (slice: typeof batch) => {
            const saved = await persistence.putMany(slice, signal, leaseToken);
            for (const record of saved) repaired.add(record.memory.memory_id);
            result.reembedded += saved.length;
            notify("embedding", saved);
          };
          try {
            await commit(batch);
          } catch (error) {
            signal?.throwIfAborted();
            if (isRemoteWorkLeaseExpired(error)) throw error;
            if (!(error instanceof RemoteMemoryError && error.code === "version_conflict")) {
              result.failed += batch.length;
              return;
            }
            if (batch.length === 1) {
              result.skippedConflict++;
              return;
            }
            for (const write of batch) {
              signal?.throwIfAborted();
              try {
                await commit([write]);
              } catch (error) {
                signal?.throwIfAborted();
                if (isRemoteWorkLeaseExpired(error)) throw error;
                if (error instanceof RemoteMemoryError && error.code === "version_conflict")
                  result.skippedConflict++;
                else result.failed++;
              }
            }
          }
        }
      );
    }
    return finish();
  };
  const repairEmbeddings = async (
    repairOptions: EmbeddingRepairOptions = {}
  ): Promise<EmbeddingRepairResult> =>
    (await withRemoteWorkLease(persistence, "embeddings", model, (token, signal) =>
      repairEmbeddingsUnlocked(repairOptions, token, signal)
    )) ?? { scanned: 0, reembedded: 0, failed: 0, skippedConflict: 0, deferred: true };

  const embedForRepair = async (
    targets: RemoteMemoryRecord[],
    signal?: AbortSignal
  ): Promise<(number[] | undefined)[] | null> => {
    const texts = targets.map(({ memory }) => memory.content);
    try {
      return await generateEmbeddings(texts, embeddingOptions, signal);
    } catch (error) {
      signal?.throwIfAborted();
      getLogger().warn("[memory/remote-store] Failed to embed memories for repair:", error);
      if (!rejectsInput(error)) return null;
    }
    const vectors: (number[] | undefined)[] = [];
    for (const [i, text] of texts.entries()) {
      signal?.throwIfAborted();
      try {
        [vectors[i]] = await generateEmbeddings([text], embeddingOptions, signal);
      } catch (error) {
        signal?.throwIfAborted();
        if (!rejectsInput(error)) return null;
        unrepairable.add(targets[i].memory.memory_id);
      }
    }
    return vectors;
  };

  return {
    createTopic: async (name) => {
      const canonical = await createRemoteTopic(persistence, name);
      if (canonical) notify("edit", []);
      return canonical;
    },
    importTopics: async (topics) => {
      if (!topics.length) return;
      const existing = new Set((await readTopics()).map((topic) => topic.name));
      const missing = topics.flatMap((topic) => {
        const name = normalizeEntityName(topic.name);
        if (existing.has(name)) return [];
        existing.add(name);
        return [{ ...topic, name }];
      });
      if (!missing.length) return;
      await persistence.importTopics(missing);
      invalidateReads();
      for (const subscriber of [...subscribers])
        if (subscriber.options.topics) safely(subscriber.onChange);
    },
    counts: () => persistence.counts(),
    masksEmbeddingInput: embeddingOptions.maskInput !== undefined,
    topicMaintenance,
    repairEmbeddings,
    list: async (listOptions = {}) =>
      (await listRows(decrypted, listOptions, listFilters(listOptions), maxOf(listOptions))).map(
        (r) => stored(r.memory)
      ),
    listProjections: async (listOptions = {}) =>
      (await listRows(metadata, listOptions, listFilters(listOptions), maxOf(listOptions))).map(
        projection
      ),
    listTopics: () => {
      if (topicSnapshot) return topicSnapshot.then((topics) => structuredClone(topics));
      const snapshot = (async () => {
        const topics = new Map<string, MemoryTopic & { members: Set<string> }>();
        for (const { memory } of await pages(metadata, {
          include_archived: true,
          include_quarantined: true,
          include_superseded: true,
        })) {
          for (const topic of parseTopics(memory.topics) ?? []) {
            const name = normalizeEntityName(topic.name);
            if (!name) continue;
            const entry = topics.get(name) ?? {
              name,
              kind: null,
              memoryCount: 0,
              members: new Set<string>(),
            };
            entry.kind ??= topic.kind ?? null;
            entry.members.add(memory.memory_id);
            topics.set(name, entry);
          }
        }
        for (const topic of await readTopics()) {
          if (topic.is_deleted) continue;
          const current = topics.get(topic.name);
          if (current) current.kind ??= topic.kind ?? null;
          else
            topics.set(topic.name, {
              name: topic.name,
              kind: topic.kind ?? null,
              memoryCount: 0,
              members: new Set(),
            });
        }
        return [...topics.values()]
          .map(({ members, ...topic }) => ({ ...topic, memoryCount: members.size }))
          .sort((a, b) => a.name.localeCompare(b.name));
      })();
      topicSnapshot = snapshot;
      const clear = () => {
        if (topicSnapshot === snapshot) topicSnapshot = undefined;
      };
      void snapshot.then(() => {
        if (!retainTopics()) clear();
      }, clear);
      return snapshot.then((topics) => structuredClone(topics));
    },
    get: async (id) => asStored(await live(id)),
    listArchived: async () =>
      (await enumerate({ archived_only: true, order: "archived", include_embeddings: true })).map(
        (record) => stored(record.memory)
      ),
    memoriesByTopics,
    topicsByMemories: async (memoryIds) => {
      const out = new Map<string, Set<string>>();
      for (const { memory } of await enumerateIds(decrypted, memoryIds, {
        include_archived: true,
        include_superseded: true,
        include_quarantined: true,
      })) {
        const topics = canonicalTopics(memory);
        if (topics.size) out.set(memory.memory_id, topics);
      }
      return out;
    },

    create: async (input) => {
      const record = await persistence.put(newRow(input), 0);
      return created([record], [input])[0];
    },
    createMany: async (inputs) => {
      const out: StoredVaultMemory[] = [];
      for (const batch of chunks(inputs, MAX_BATCH)) {
        let records: RemoteMemoryRecord[];
        try {
          records = await persistence.putMany(
            batch.map((input) => ({ memory: newRow(input), expectedVersion: 0 }))
          );
        } catch (error) {
          if (out.length === 0) throw error;
          throw new RemoteMemoryPartialCreateError(out, error);
        }
        out.push(...created(records, batch));
      }
      return out;
    },
    update: async (id, patch: MemoryUpdate) => {
      const saved = await mutate(id, "edit", (memory) => {
        if (memory.superseded_by) return null;
        const level: MemoryLevel =
          patch.level !== undefined
            ? patch.level
            : patch.scope !== undefined
              ? levelForScopeChange({ level: memory.level, scope: memory.scope }, patch.scope)
              : resolveMemoryLevel(memory.level, memory.scope);
        const kind = patch.kind !== undefined ? patch.kind : memory.kind;
        assertValidKindLevel(kind, level);
        memory.content = patch.content;
        memory.updated_at = Math.max(Date.now(), (memory.topics_extracted_at ?? 0) + 1);
        if (patch.level !== undefined) {
          memory.level = level;
          memory.scope = scopeForLevel(level);
        } else if (patch.scope !== undefined) {
          memory.level = level;
          memory.scope = patch.scope;
        }
        if (patch.kind !== undefined) {
          if (patch.kind === null) delete memory.kind;
          else memory.kind = patch.kind;
        }
        if (patch.kindValue !== undefined) {
          if (patch.kindValue === null) delete memory.kind_value;
          else memory.kind_value = patch.kindValue;
        }
        if (patch.factType !== undefined) memory.fact_type = patch.factType ?? undefined;
        if (patch.eventTime !== undefined) {
          memory.event_time_start = patch.eventTime?.start ?? undefined;
          memory.event_time_end = patch.eventTime?.end ?? undefined;
          memory.event_time_kind = patch.eventTime?.kind ?? undefined;
        }
        if (patch.embedding === undefined || patch.embedding === null) {
          memory.embedding = [];
          delete memory.embedding_model;
        } else {
          memory.embedding = storedVector(JSON.parse(patch.embedding) as number[]);
          memory.embedding_model = patch.embeddingModel ?? model;
        }
        return memory;
      });
      if (saved && patch.embedding === undefined) embedInBackground(saved);
      return asStored(saved);
    },
    delete: async (id) =>
      !!(await mutate(id, "membership", (memory) => ({ ...memory, is_deleted: true }))),
    supersede: async (id, supersededById) => {
      if (id === supersededById) return false;
      const [first, second] = [id, supersededById].sort();
      return serialized(first, () =>
        serialized(second, async () => {
          const [old, next] = await Promise.all([live(id), live(supersededById)]);
          if (!old || !next || old.memory.superseded_by || next.memory.superseded_by) return false;
          if (old.memory.kind !== undefined && old.memory.kind !== null) return false;
          const saved = await persistence.putMany([
            {
              memory: { ...old.memory, superseded_by: supersededById, superseded_at: Date.now() },
              expectedVersion: old,
            },
            { memory: next.memory, expectedVersion: next },
          ]);
          notify("membership", saved);
          return true;
        })
      );
    },
    archive: async (id) =>
      !!(await mutate(id, "edit", (memory) =>
        memory.archived_at === undefined || memory.archived_at === null
          ? { ...memory, archived_at: Date.now() }
          : null
      )),
    restore: (id) =>
      serialized(id, async () => {
        const record = await live(id);
        if (!record) return false;
        if (record.memory.archived_at === undefined || record.memory.archived_at === null)
          return true;
        const { archived_at: _archivedAt, ...memory } = record.memory;
        notify("edit", [await persistence.put(memory, record)]);
        return true;
      }),
    setTopics: async (memoryId, topics) => {
      const chosen = await withKnownKinds(topicInputs(topics, "user"));
      return asStored(
        await mutate(memoryId, "edit", (memory) => ({
          ...memory,
          topics: serializeTopics(mergeTopics([], chosen)),
          topics_user_managed: true,
          topics_updated_at: Date.now(),
        }))
      );
    },
    addTopics: async (memoryId, topics, writeOptions) => {
      const added = await withKnownKinds(topicInputs(topics, "auto"));
      const saved = await mutate(
        memoryId,
        "edit",
        (memory) => {
          if (writeOptions?.unlessUserManaged && memory.topics_user_managed) return null;
          return {
            ...memory,
            topics: serializeTopics(mergeTopics(parseTopics(memory.topics) ?? [], added)),
            topics_updated_at: Date.now(),
          };
        },
        writeOptions
      );
      if (!saved) return [];
      const now = new Date();
      return mergeTopics([], added).map(
        (topic): StoredEntity => ({
          uniqueId: normalizeEntityName(topic.name),
          canonicalName: normalizeEntityName(topic.name),
          kind: topic.kind ?? null,
          createdAt: now,
          updatedAt: now,
        })
      );
    },
    setVisibility: async (id, visibility: VaultMemoryVisibility, visibilityOptions) =>
      asStored(
        await mutate(id, "edit", (memory) => {
          memory.visibility = visibility;
          if (visibility === "private") delete memory.published_at;
          else memory.published_at ??= Date.now();
          if (visibilityOptions?.twinOptIn !== undefined)
            memory.twin_opt_in = visibilityOptions.twinOptIn;
          return memory;
        })
      ),

    recall: (query, recallOptions) => pipeline.recall(query, recallOptions),
    factSource: pipeline.factSource,
    retain: async (content, retainOptions) => {
      const result = await pipeline.retain(content, retainOptions);
      if (result.action === "create" || result.action === "supersede") notify("membership");
      else if (result.action === "update" || result.action === "merge") notify("edit");
      return result;
    },

    decay: {
      createDecaySweeper: (sweeperOptions) =>
        createDecaySweeperOver(decayBackend, {
          ...ruleBasedDecayOptions(sweeperOptions),
          maxTransitionsPerSweep: DECAY_TRANSITIONS_PER_SWEEP,
        }),
    },

    subscribe: (onChange, subscribeOptions = {}) => {
      const subscriber: Subscriber = { onChange, options: subscribeOptions };
      subscribers.add(subscriber);
      if (pollIntervalMs > 0 && subscribers.size === 1) {
        stopActivity = activity.subscribe(refreshActivity);
        refreshActivity();
      }
      return () => {
        subscribers.delete(subscriber);
        if (!retainTopics()) invalidateReads();
        if (subscribers.size) return;
        if (timer) clearTimeout(timer);
        timer = undefined;
        stopActivity?.();
        stopActivity = undefined;
        stopChanges?.();
        stopChanges = undefined;
        changesConnected = false;
        generation++;
        invalidateReads();
      };
    },
  };
}
