import { v7 as uuidv7 } from "uuid";

import type { EntityInput } from "../../db/entities/operations.js";
import {
  normalizeEntityName,
  parseTopics,
  serializeTopics,
  type StoredEntity,
  type StoredTopic,
} from "../../db/entities/types.js";
import { assertValidKindLevel, resolveCreateLevel } from "../../db/memoryVault/operations.js";
import {
  levelForScopeChange,
  type MemoryLevel,
  resolveMemoryLevel,
  scopeForLevel,
  type StoredVaultMemory,
  type VaultMemoryProjection,
  type VaultMemoryVisibility,
} from "../../db/memoryVault/types.js";
import { getLogger } from "../../logger.js";
import { DEFAULT_API_EMBEDDING_MODEL } from "../../memoryEngine/constants.js";
import { generateEmbedding } from "../../memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../../memoryEngine/types.js";
import type { RecallFactSource } from "../types.js";
import type {
  RemoteMemoryDecodeFailure,
  RemoteMemoryMetadataRecord,
  RemoteMemoryPersistence,
  RemoteMemoryQueryOptions,
  RemoteMemoryRecord,
  RemoteMemoryRow,
} from "./remotePersistence.js";
import { createRemoteMemoryPipeline, stored, storedVector } from "./remotePipeline.js";
import type {
  MemoryCreate,
  MemoryListOptions,
  MemoryStore,
  MemorySubscribeOptions,
  MemoryTopic,
  MemoryUpdate,
} from "./types.js";

/** @public */
export interface RemoteMemoryStoreOptions {
  persistence: RemoteMemoryPersistence;
  embeddingOptions: EmbeddingOptions;
  graphRanking: RecallFactSource["graphRanking"];
  temporalRanking: RecallFactSource["temporalRanking"];
  pollIntervalMs?: number;
}

type Change = "membership" | "edit" | "embedding";

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

export class RemoteMemoryPartialCreateError extends Error {
  constructor(
    public readonly created: StoredVaultMemory[],
    public readonly cause: unknown
  ) {
    super(`createMany stored ${created.length} memories before a batch failed`);
    this.name = "RemoteMemoryPartialCreateError";
  }
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
    return name ? [{ name, ...(kind && { kind }), source }] : [];
  });
}

function mergeTopics(existing: readonly StoredTopic[], added: readonly StoredTopic[]) {
  const byName = new Map<string, StoredTopic>();
  for (const topic of [...existing, ...added]) {
    const key = normalizeEntityName(topic.name);
    if (!byName.has(key)) byName.set(key, topic);
  }
  return [...byName.values()];
}

function canonicalTopics(row: RemoteMemoryRow): Set<string> {
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
  const pipeline = createRemoteMemoryPipeline(options);
  const subscribers = new Set<Subscriber>();
  const seen = new Map<string, RemoteMemoryRecord>();
  let timer: ReturnType<typeof setInterval> | undefined;
  const notify = (change: Change, records: readonly RemoteMemoryRecord[] = []) => {
    if (timer) for (const record of records) seen.set(record.memory.memory_id, record);
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
  const decrypted = (options: RemoteMemoryQueryOptions) => persistence.query(options);
  const metadata = (options: RemoteMemoryQueryOptions) =>
    persistence.queryMetadata(options as Parameters<typeof persistence.queryMetadata>[0]);
  const enumerate = (filters: Omit<RemoteMemoryQueryOptions, "cursor" | "limit">, max = Infinity) =>
    pages(decrypted, filters, max);
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
    include_embeddings: true,
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
  const mutate = async (
    id: string,
    change: Change,
    edit: (memory: RemoteMemoryRow) => RemoteMemoryRow | null
  ): Promise<RemoteMemoryRecord | null> =>
    serialized(id, async () => {
      const record = await live(id);
      if (!record) return null;
      const next = edit(structuredClone(record.memory));
      if (!next) return null;
      const saved = await persistence.put(next, record);
      notify(change, [saved]);
      return saved;
    });

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
  const withKnownKinds = async (topics: StoredTopic[]): Promise<StoredTopic[]> => {
    const unkinded = [
      ...new Set(topics.filter((t) => !t.kind).map((t) => normalizeEntityName(t.name))),
    ];
    if (unkinded.length === 0) return topics;
    const kinds = new Map<string, string>();
    for (const names of chunks(unkinded, MAX_QUERY_TOPICS)) {
      for (const { memory } of await pages(metadata, {
        topics: names,
        include_archived: true,
        include_quarantined: true,
        include_superseded: true,
      })) {
        for (const topic of parseTopics(memory.topics) ?? []) {
          const name = normalizeEntityName(topic.name);
          if (topic.kind && !kinds.has(name)) kinds.set(name, topic.kind);
        }
      }
    }
    return topics.map((topic) => {
      const kind = topic.kind ?? kinds.get(normalizeEntityName(topic.name));
      return kind ? { ...topic, kind } : topic;
    });
  };

  const everyState = {
    include_deleted: true,
    include_archived: true,
    include_quarantined: true,
    include_superseded: true,
  } as const;
  const changesSince = async (cursor: string | undefined, pending: ReadonlySet<string>) => {
    const records: RemoteMemoryRecord[] = [];
    const failed = new Set<string>();
    const collect = (page: {
      items: RemoteMemoryRecord[];
      failed: RemoteMemoryDecodeFailure[];
    }) => {
      warnFailed(page.failed);
      records.push(...page.items);
      for (const failure of page.failed) failed.add(failure.memory_id);
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
  let polling = false;
  const poll = () => {
    if (polling) return;
    polling = true;
    const current = generation;
    changesSince(cursor, pending)
      .then(({ records, resume, failed }) => {
        if (current !== generation) return;
        const changed = new Set<Subscriber>();
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
        pending = failed;
        for (const subscriber of changed)
          if (subscribers.has(subscriber)) safely(subscriber.onChange);
      })
      .catch((error: unknown) => {
        getLogger().warn("[memory/remote-store] Subscription poll failed:", error);
      })
      .finally(() => {
        polling = false;
      });
  };

  return {
    list: async (listOptions = {}) =>
      (await listRows(decrypted, listOptions, listFilters(listOptions), maxOf(listOptions))).map(
        (r) => stored(r.memory)
      ),
    listProjections: async (listOptions = {}) =>
      (await listRows(metadata, listOptions, listFilters(listOptions), maxOf(listOptions))).map(
        projection
      ),
    listTopics: async () => {
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
      return [...topics.values()]
        .map(({ members, ...topic }) => ({ ...topic, memoryCount: members.size }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    get: async (id) => asStored(await live(id)),
    listArchived: async () =>
      (await enumerate({ archived_only: true, order: "archived", include_embeddings: true })).map(
        (record) => stored(record.memory)
      ),
    memoriesByTopics: async (names) => {
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
    },
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
        memory.updated_at = Date.now();
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
    addTopics: async (memoryId, topics) => {
      const added = await withKnownKinds(topicInputs(topics, "auto"));
      const saved = await mutate(memoryId, "edit", (memory) => ({
        ...memory,
        topics: serializeTopics(mergeTopics(parseTopics(memory.topics) ?? [], added)),
        topics_updated_at: Date.now(),
      }));
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
    retain: async (content, retainOptions) => {
      const result = await pipeline.retain(content, retainOptions);
      if (result.action === "create" || result.action === "supersede") notify("membership");
      else if (result.action === "update" || result.action === "merge") notify("edit");
      return result;
    },

    subscribe: (onChange, subscribeOptions = {}) => {
      const subscriber: Subscriber = { onChange, options: subscribeOptions };
      subscribers.add(subscriber);
      if (pollIntervalMs > 0 && !timer) {
        timer = setInterval(poll, pollIntervalMs);
        poll();
      }
      return () => {
        subscribers.delete(subscriber);
        if (subscribers.size || !timer) return;
        clearInterval(timer);
        timer = undefined;
        generation++;
        seen.clear();
        ready = false;
        cursor = undefined;
        pending = new Set();
      };
    },
  };
}
