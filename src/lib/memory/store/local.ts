import type { Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import type { EmbeddedWalletSignerFn, SignMessageFn } from "../../db/encryption-utils.js";
import type { Entity, MemoryEntity } from "../../db/entities/models.js";
import type { EntityInput } from "../../db/entities/operations.js";
import {
  type EntityOperationsContext,
  getEntitiesByMemoryIdsOp,
  getMemoriesByEntityNamesOp,
  linkMemoryEntitiesOp,
} from "../../db/entities/operations.js";
import type { VaultMemory } from "../../db/memoryVault/models.js";
import {
  archiveVaultMemoryOp,
  backfillMemoryTopicsOp,
  createVaultMemoriesBatchOp,
  createVaultMemoryOp,
  deleteVaultMemoryOp,
  getAllVaultMemoriesOp,
  getMemoriesNeedingTopicExtractionOp,
  getVaultMemoryOp,
  getVaultMemoryProjectionsOp,
  relinkMemoryTopicsOp,
  restoreVaultMemoryOp,
  setMemoryEntitiesOp,
  setMemoryVisibilityOp,
  stampTopicsExtractedAtOp,
  supersedeVaultMemoryOp,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../../db/memoryVault/operations.js";
import type { StoredVaultMemory, VaultMemoryVisibility } from "../../db/memoryVault/types.js";
import { getLogger } from "../../logger.js";
import type { EmbeddingOptions } from "../../memoryEngine/types.js";
import { createVaultEmbeddingCache } from "../../memoryVault/lruCache.js";
import { eagerEmbedContent, type VaultEmbeddingCache } from "../../memoryVault/searchTool.js";
import { createDecaySweeper } from "../decayWorker.js";
import { recall } from "../recall.js";
import { retain } from "../retain.js";
import { extractAndLinkEntitiesForMemoriesOp, type TopicExtractOptions } from "../topicExtract.js";
import type {
  MemoryCreate,
  MemoryListOptions,
  MemoryRecallOptions,
  MemoryRetainOptions,
  MemoryStore,
  MemoryTopic,
  MemoryUpdate,
} from "./types.js";

/** @public */
export interface LocalMemoryStoreOptions {
  /** A database built from `sdkSchema` (memory_vault + entity + memory_entity). */
  database: Database;
  /** With `signMessage`, encrypts content on write and decrypts on read. */
  walletAddress?: string;
  signMessage?: SignMessageFn;
  embeddedWalletSigner?: EmbeddedWalletSignerFn;
  /**
   * Scope every read/write to this user — for a shared, multi-tenant database
   * whose rows all carry their `user_id`. Rows with no `user_id` are invisible
   * to a scoped store, so the per-wallet client DBs (every useChatStorage row is
   * `user_id = null`) use `singleTenant` instead, exactly like useChatStorage's
   * vault ctx.
   */
  userId?: string;
  /**
   * The database holds exactly one owner's rows (the per-wallet client DBs).
   * Required for the decay sweep to run without `userId` — see
   * `VaultMemoryOperationsContext.singleTenant`.
   */
  singleTenant?: boolean;
  /** Admit pre-v31 `user_id = null` link rows alongside `userId`'s (LokiJS web). */
  allowUnscopedRows?: boolean;
  /** Embedding API options for `recall` / `retain`. */
  embeddingOptions: EmbeddingOptions;
  /** Share a warm cache with other recall surfaces; one is created when omitted. */
  vaultCache?: VaultEmbeddingCache;
}

/**
 * {@link MemoryStore} over the on-device WatermelonDB vault. Builds the vault +
 * entity contexts once and delegates every method to the existing ops, so
 * behavior is exactly theirs.
 * @public
 */
export function createLocalMemoryStore(options: LocalMemoryStoreOptions): MemoryStore {
  const { database, userId } = options;
  const entityCtx: EntityOperationsContext = {
    database,
    entityCollection: database.get<Entity>("entity"),
    memoryEntityCollection: database.get<MemoryEntity>("memory_entity"),
    ...(userId !== undefined && { userId }),
    ...(options.allowUnscopedRows !== undefined && {
      allowUnscopedRows: options.allowUnscopedRows,
    }),
  };
  const vaultCtx: VaultMemoryOperationsContext = {
    database,
    vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
    walletAddress: options.walletAddress,
    signMessage: options.signMessage,
    embeddedWalletSigner: options.embeddedWalletSigner,
    ...(userId !== undefined && { userId }),
    ...(options.singleTenant !== undefined && { singleTenant: options.singleTenant }),
    entityCtx,
  };
  const vaultCache = options.vaultCache ?? createVaultEmbeddingCache();
  const ownedBy = userId !== undefined ? [Q.where("user_id", userId)] : [];
  const linksOwnedBy =
    userId === undefined
      ? []
      : options.allowUnscopedRows
        ? [Q.or(Q.where("user_id", userId), Q.where("user_id", null))]
        : [Q.where("user_id", userId)];
  const watchedColumns = [
    "content",
    "scope",
    "updated_at",
    "fact_type",
    "event_time_start",
    "event_time_end",
    "event_time_kind",
    "archived_at",
    "trust_tier",
    "superseded_by",
    "visibility",
    "published_at",
    "geohash",
    "topics",
    "topics_user_managed",
    "media",
    "source",
  ];
  const embedInBackground = (memory: StoredVaultMemory) => {
    eagerEmbedContent(
      memory.content,
      options.embeddingOptions,
      vaultCache,
      vaultCtx,
      memory.uniqueId,
      memory.updatedAt
    ).catch((err: unknown) => {
      getLogger().warn("[memory/store] Failed to embed memory:", err);
    });
  };

  return {
    list: (listOptions?: MemoryListOptions) => getAllVaultMemoriesOp(vaultCtx, listOptions),
    get: (id: string) => getVaultMemoryOp(vaultCtx, id),
    listArchived: async () => {
      const ids = await vaultCtx.vaultMemoryCollection
        .query(Q.where("is_deleted", false), Q.where("archived_at", Q.notEq(null)), ...ownedBy)
        .fetchIds();
      if (ids.length === 0) return [];
      const rows = await getAllVaultMemoriesOp(vaultCtx, { memoryIds: ids, includeArchived: true });
      return rows.sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
    },
    memoriesByTopics: (names: readonly string[]) => getMemoriesByEntityNamesOp(entityCtx, names),
    topicsByMemories: (memoryIds: readonly string[]) =>
      getEntitiesByMemoryIdsOp(entityCtx, memoryIds),
    listTopics: async () => {
      const links = await entityCtx.memoryEntityCollection.query(...linksOwnedBy).fetch();
      const members = new Map<string, Set<string>>();
      for (const link of links) {
        const entityId = String(link.entityId);
        const set = members.get(entityId) ?? new Set<string>();
        set.add(String(link.memoryId));
        members.set(entityId, set);
      }
      const entities =
        userId === undefined
          ? await entityCtx.entityCollection.query().fetch()
          : members.size
            ? await entityCtx.entityCollection
                .query(Q.where("id", Q.oneOf([...members.keys()])))
                .fetch()
            : [];
      const byName = new Map<string, MemoryTopic>();
      for (const entity of entities) {
        const count = members.get(entity.id)?.size ?? 0;
        const existing = byName.get(entity.canonicalName);
        byName.set(entity.canonicalName, {
          name: entity.canonicalName,
          kind: existing?.kind ?? entity.kind ?? null,
          memoryCount: (existing?.memoryCount ?? 0) + count,
        });
      }
      return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
    listProjections: (listOptions?: MemoryListOptions) =>
      getVaultMemoryProjectionsOp(vaultCtx, listOptions),

    create: async (input: MemoryCreate) => {
      const created = await createVaultMemoryOp(vaultCtx, input);
      if (input.embedding === undefined) embedInBackground(created);
      return created;
    },
    createMany: async (inputs: MemoryCreate[]) => {
      const created = await createVaultMemoriesBatchOp(vaultCtx, inputs);
      created.forEach((memory, i) => {
        if (inputs[i].embedding === undefined) embedInBackground(memory);
      });
      return created;
    },
    update: async (id: string, patch: MemoryUpdate) => {
      const reembed = patch.embedding === undefined;
      const updated = await updateVaultMemoryOp(
        vaultCtx,
        id,
        reembed ? { ...patch, embedding: null } : patch
      );
      if (!updated) return null;
      vaultCache.delete(id);
      if (reembed) embedInBackground(updated);
      return updated;
    },
    delete: async (id: string) => {
      const deleted = await deleteVaultMemoryOp(vaultCtx, id);
      if (deleted) vaultCache.delete(id);
      return deleted;
    },
    supersede: (id: string, supersededById: string) =>
      supersedeVaultMemoryOp(vaultCtx, id, supersededById),
    archive: (id: string) => archiveVaultMemoryOp(vaultCtx, id),
    restore: (id: string) => restoreVaultMemoryOp(vaultCtx, id),
    setTopics: (memoryId: string, topics: readonly EntityInput[]) =>
      setMemoryEntitiesOp(vaultCtx, memoryId, topics),
    addTopics: (memoryId: string, topics: readonly EntityInput[]) =>
      database.write(async (writer) => {
        const owned = await vaultCtx.vaultMemoryCollection
          .query(Q.where("id", memoryId), Q.where("is_deleted", false), ...ownedBy)
          .fetchCount();
        return owned > 0
          ? writer.callWriter(() => linkMemoryEntitiesOp(entityCtx, memoryId, topics))
          : [];
      }),
    setVisibility: (
      id: string,
      visibility: VaultMemoryVisibility,
      visibilityOptions?: { twinOptIn?: boolean }
    ) => setMemoryVisibilityOp(vaultCtx, id, { visibility, ...visibilityOptions }),

    recall: (query: string, recallOptions?: MemoryRecallOptions) =>
      recall(
        query,
        { vaultCtx, entityCtx, embeddingOptions: options.embeddingOptions, vaultCache },
        { ...recallOptions, types: ["fact"] }
      ),
    retain: (content: string, retainOptions?: MemoryRetainOptions) =>
      retain(
        content,
        { vaultCtx, embeddingOptions: options.embeddingOptions, vaultCache },
        retainOptions
      ),

    subscribe: (onChange, subscribeOptions) => {
      const afterFirst = () => {
        let first = true;
        return () => {
          if (first) first = false;
          else onChange();
        };
      };
      const memories = subscribeOptions?.includeDeleted
        ? vaultCtx.vaultMemoryCollection.query(...ownedBy).observe()
        : vaultCtx.vaultMemoryCollection
            .query(Q.where("is_deleted", false), ...ownedBy)
            .observeWithColumns(
              subscribeOptions?.embeddings
                ? [...watchedColumns, "embedding", "embedding_model"]
                : watchedColumns
            );
      const subscriptions = [memories.subscribe(afterFirst())];
      if (subscribeOptions?.topics) {
        subscriptions.push(
          entityCtx.memoryEntityCollection
            .query(...linksOwnedBy)
            .observe()
            .subscribe(afterFirst())
        );
      }
      return () => subscriptions.forEach((s) => s.unsubscribe());
    },

    maintenance: {
      createDecaySweeper: (sweeperOptions) => createDecaySweeper({ ...sweeperOptions, vaultCtx }),
      getTopicBacklog: (backlogOptions?: { limit?: number }) =>
        getMemoriesNeedingTopicExtractionOp(vaultCtx, backlogOptions),
      extractTopics: (
        memoryIds: readonly string[],
        extractOptions: TopicExtractOptions & { now?: number }
      ) => extractAndLinkEntitiesForMemoriesOp(vaultCtx, memoryIds, extractOptions),
      stampTopicsExtracted: (memoryIds: readonly string[], extractedAt: number, version?: number) =>
        stampTopicsExtractedAtOp(vaultCtx, memoryIds, extractedAt, version),
      relinkTopics: (memoryIds: readonly string[]) => relinkMemoryTopicsOp(vaultCtx, memoryIds),
      backfillTopics: (memoryIds: readonly string[]) => backfillMemoryTopicsOp(vaultCtx, memoryIds),
    },
  };
}
