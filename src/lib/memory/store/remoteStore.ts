import { v7 as uuidv7 } from "uuid";

import type { EntityInput } from "../../db/entities/operations.js";
import {
  normalizeEntityName,
  parseTopics,
  serializeTopics,
  type StoredEntity,
  type StoredTopic,
} from "../../db/entities/types.js";
import {
  levelForScopeChange,
  levelFromScope,
  type StoredVaultMemory,
  type VaultMemoryVisibility,
} from "../../db/memoryVault/types.js";
import { getLogger } from "../../logger.js";
import { DEFAULT_API_EMBEDDING_MODEL } from "../../memoryEngine/constants.js";
import { generateEmbedding } from "../../memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../../memoryEngine/types.js";
import type { RecallFactSource } from "../types.js";
import type {
  RemoteMemoryDecodeFailure,
  RemoteMemoryListOptions,
  RemoteMemoryPersistence,
  RemoteMemoryRecord,
  RemoteMemoryRow,
} from "./remotePersistence.js";
import { createRemoteMemoryPipeline, stored, storedVector } from "./remotePipeline.js";
import type {
  MemoryCreate,
  MemoryListOptions,
  MemoryStore,
  MemorySubscribeOptions,
  MemoryUpdate,
} from "./types.js";

/** @public */
export interface RemoteMemoryStoreOptions {
  /** From `createRemoteMemoryPersistence`, connected to an active account under the canonical key. */
  persistence: RemoteMemoryPersistence;
  embeddingOptions: EmbeddingOptions;
  graphRanking: RecallFactSource["graphRanking"];
  temporalRanking: RecallFactSource["temporalRanking"];
  /** How often each subscription polls nearby for other devices' changes; 0 disables polling. */
  pollIntervalMs?: number;
}

type Change = "membership" | "edit" | "embedding";

const MAX_CREATE_MANY = 50;

function warnFailed(failed: RemoteMemoryDecodeFailure[]) {
  if (failed.length)
    getLogger().warn(
      `[memory/remote-store] Skipping ${failed.length} undecryptable row(s)`,
      failed.map((failure) => failure.memory_id)
    );
}

function visible(memory: StoredVaultMemory, options: MemoryListOptions): boolean {
  return (
    (options.includeDeleted || !memory.isDeleted) &&
    (options.includeArchived || memory.archivedAt === null) &&
    (options.includeQuarantined || memory.trustTier !== "quarantined") &&
    (options.includeSuperseded || !memory.supersededBy)
  );
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
 * {@link MemoryStore} over nearby's private-memory API. Every read reaches nearby and every write
 * is version-guarded; content is decrypted and processed only on the device.
 *
 * Differences from the local store: list and topic reads enumerate the vault and filter on the
 * device, `createMany` accepts at most 50 memories, a concurrent edit surfaces as a
 * `RemoteMemoryError` with code `version_conflict`, and subscriptions see other devices' changes
 * by polling. There is no `maintenance`.
 * @public
 */
export function createRemoteMemoryStore(options: RemoteMemoryStoreOptions): MemoryStore {
  const { persistence, embeddingOptions } = options;
  const model = embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL;
  const pollIntervalMs = options.pollIntervalMs ?? 60_000;
  const pipeline = createRemoteMemoryPipeline(options);
  const listeners = new Set<(change: Change) => void>();
  const notify = (change: Change) => listeners.forEach((listener) => listener(change));

  const enumerate = async (filters: Omit<RemoteMemoryListOptions, "cursor" | "limit">) => {
    const records: RemoteMemoryRecord[] = [];
    let cursor: string | undefined;
    do {
      const page = await persistence.list({ ...filters, limit: 200, ...(cursor && { cursor }) });
      warnFailed(page.failed);
      records.push(...page.items);
      cursor = page.next_cursor;
    } while (cursor);
    return records;
  };
  const readAll = async (listOptions: MemoryListOptions, includeEmbeddings: boolean) =>
    (
      await enumerate({
        include_deleted: listOptions.includeDeleted,
        include_archived: listOptions.includeArchived,
        include_quarantined: listOptions.includeQuarantined,
        include_superseded: listOptions.includeSuperseded,
        include_embeddings: includeEmbeddings,
      })
    ).filter((record) => visible(stored(record.memory), listOptions));

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
      notify(change);
      return saved;
    });

  const embedInBackground = ({ memory: { memory_id: id, content } }: RemoteMemoryRecord) => {
    generateEmbedding(content, embeddingOptions)
      .then((vector) =>
        serialized(id, async () => {
          const current = await live(id);
          if (!current || current.memory.content !== content || current.memory.embedding?.length)
            return;
          await persistence.put(
            { ...current.memory, embedding: storedVector(vector), embedding_model: model },
            current
          );
          notify("embedding");
        })
      )
      .catch((error: unknown) => {
        getLogger().warn("[memory/remote-store] Failed to embed memory:", error);
      });
  };
  const newRow = (input: MemoryCreate): RemoteMemoryRow => {
    const now = Date.now();
    const scope = input.scope ?? "private";
    return {
      memory_id: uuidv7(),
      content: input.content,
      scope,
      level: levelFromScope(scope),
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
    notify("membership");
    return records.map((record) => stored(record.memory));
  };
  const asStored = (record: RemoteMemoryRecord | null) => (record ? stored(record.memory) : null);

  const fingerprint = async (subscribeOptions: MemorySubscribeOptions) =>
    (
      await enumerate(
        subscribeOptions.includeDeleted
          ? { include_deleted: true, include_archived: true, include_superseded: true }
          : {}
      )
    )
      .map(({ memory, version }) =>
        subscribeOptions.includeDeleted
          ? `${memory.memory_id}:${memory.is_deleted}`
          : JSON.stringify([
              memory.memory_id,
              subscribeOptions.embeddings ? version : null,
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
            ])
      )
      .sort()
      .join("\n");

  return {
    list: async (listOptions = {}) => {
      const ids = listOptions.memoryIds && new Set(listOptions.memoryIds);
      const rows = (await readAll(listOptions, true))
        .map((record) => stored(record.memory))
        .filter(
          (memory) =>
            (!ids || ids.has(memory.uniqueId)) &&
            (!listOptions.scopes?.length || listOptions.scopes.includes(memory.scope)) &&
            (!listOptions.factTypes?.length ||
              listOptions.factTypes.includes(memory.factType ?? "")) &&
            (!listOptions.visibility?.length ||
              listOptions.visibility.includes(memory.visibility ?? "private")) &&
            (!listOptions.since || memory.updatedAt.getTime() > listOptions.since.getTime())
        )
        .sort((a, b) =>
          listOptions.since
            ? b.updatedAt.getTime() - a.updatedAt.getTime()
            : b.createdAt.getTime() - a.createdAt.getTime()
        );
      return listOptions.limit && listOptions.limit > 0 ? rows.slice(0, listOptions.limit) : rows;
    },
    get: async (id) => asStored(await live(id)),
    listArchived: async () =>
      (await readAll({ includeArchived: true }, true))
        .map((record) => stored(record.memory))
        .filter((memory) => memory.archivedAt !== null)
        .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0)),
    memoriesByTopics: async (names) => {
      const wanted = new Set(names.map(normalizeEntityName));
      const out = new Map<string, Set<string>>();
      for (const { memory } of await readAll({}, false)) {
        const matched = [...canonicalTopics(memory)].filter((name) => wanted.has(name));
        if (matched.length) out.set(memory.memory_id, new Set(matched));
      }
      return out;
    },
    topicsByMemories: async (memoryIds) => {
      const ids = new Set(memoryIds);
      const out = new Map<string, Set<string>>();
      for (const { memory } of await readAll(
        { includeArchived: true, includeSuperseded: true, includeQuarantined: true },
        false
      )) {
        const topics = canonicalTopics(memory);
        if (ids.has(memory.memory_id) && topics.size) out.set(memory.memory_id, topics);
      }
      return out;
    },

    create: async (input) => {
      const record = await persistence.put(newRow(input), 0);
      return created([record], [input])[0];
    },
    createMany: async (inputs) => {
      if (inputs.length === 0) return [];
      if (inputs.length > MAX_CREATE_MANY)
        throw new Error(`Remote createMany accepts at most ${MAX_CREATE_MANY} memories`);
      const records = await persistence.putMany(
        inputs.map((input) => ({ memory: newRow(input), expectedVersion: 0 }))
      );
      return created(records, inputs);
    },
    update: async (id, patch: MemoryUpdate) => {
      const saved = await mutate(id, "edit", (memory) => {
        memory.content = patch.content;
        memory.updated_at = Date.now();
        if (patch.scope !== undefined) {
          memory.level = levelForScopeChange(
            { level: memory.level, scope: memory.scope },
            patch.scope
          );
          memory.scope = patch.scope;
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
          await persistence.putMany([
            {
              memory: { ...old.memory, superseded_by: supersededById, superseded_at: Date.now() },
              expectedVersion: old,
            },
            { memory: next.memory, expectedVersion: next },
          ]);
          notify("membership");
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
        await persistence.put(memory, record);
        notify("edit");
        return true;
      }),
    setTopics: async (memoryId, topics) =>
      asStored(
        await mutate(memoryId, "edit", (memory) => ({
          ...memory,
          topics: serializeTopics(mergeTopics([], topicInputs(topics, "user"))),
          topics_user_managed: true,
          topics_updated_at: Date.now(),
        }))
      ),
    addTopics: async (memoryId, topics) => {
      const added = topicInputs(topics, "auto");
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
      notify(result.action === "create" ? "membership" : "edit");
      return result;
    },

    subscribe: (onChange, subscribeOptions = {}) => {
      const listener = (change: Change) => {
        const relevant = subscribeOptions.includeDeleted
          ? change === "membership"
          : change !== "embedding" || !!subscribeOptions.embeddings;
        if (relevant) onChange();
      };
      listeners.add(listener);
      let stopped = false;
      let previous: string | undefined;
      let polling = false;
      const poll = () => {
        if (polling) return;
        polling = true;
        fingerprint(subscribeOptions)
          .then((current) => {
            if (!stopped && previous !== undefined && current !== previous) onChange();
            previous = current;
          })
          .catch((error: unknown) => {
            getLogger().warn("[memory/remote-store] Subscription poll failed:", error);
          })
          .finally(() => {
            polling = false;
          });
      };
      if (pollIntervalMs > 0) poll();
      const timer = pollIntervalMs > 0 ? setInterval(poll, pollIntervalMs) : undefined;
      return () => {
        stopped = true;
        listeners.delete(listener);
        if (timer) clearInterval(timer);
      };
    },
  };
}
