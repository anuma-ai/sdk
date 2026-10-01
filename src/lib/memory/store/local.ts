import type { Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import type { EmbeddedWalletSignerFn, SignMessageFn } from "../../db/encryption-utils.js";
import type { Entity, MemoryEntity } from "../../db/entities/models.js";
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
  relinkMemoryTopicsOp,
  restoreVaultMemoryOp,
  setMemoryEntitiesOp,
  setMemoryVisibilityOp,
  stampTopicsExtractedAtOp,
  supersedeVaultMemoryOp,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../../db/memoryVault/operations.js";
import type { EmbeddingOptions } from "../../memoryEngine/types.js";
import { createVaultEmbeddingCache } from "../../memoryVault/lruCache.js";
import type { VaultEmbeddingCache } from "../../memoryVault/searchTool.js";
import { createDecaySweeper } from "../decayWorker.js";
import { recall } from "../recall.js";
import { retain } from "../retain.js";
import { extractAndLinkEntitiesForMemoriesOp } from "../topicExtract.js";
import type { MemoryStore } from "./types.js";

/** @public */
export interface LocalMemoryStoreOptions {
  /** A database built from `sdkSchema` (memory_vault + entity + memory_entity). */
  database: Database;
  /** With `signMessage`, encrypts content on write and decrypts on read. */
  walletAddress?: string;
  signMessage?: SignMessageFn;
  embeddedWalletSigner?: EmbeddedWalletSignerFn;
  /** Scope every read/write to this user — a shared, multi-tenant database. */
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
 * Columns whose in-place edits fire a live-row subscription: the union of what
 * the web and mobile vault lists watch today. See `MemorySubscribeOptions`.
 */
const WATCHED_COLUMNS = ["archived_at", "trust_tier", "scope", "visibility"];

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
    // Deletes cascade to memory_entity, so the graph lane never serves a
    // deleted memory's id.
    entityCtx,
  };
  const vaultCache = options.vaultCache ?? createVaultEmbeddingCache();
  const ownedBy = userId !== undefined ? [Q.where("user_id", userId)] : [];

  return {
    list: (listOptions) => getAllVaultMemoriesOp(vaultCtx, listOptions),
    get: (id) => getVaultMemoryOp(vaultCtx, id),
    listArchived: async () => {
      // Pick the archived ids off the plaintext columns first so only those
      // rows get decrypted, never the whole vault.
      const ids = await vaultCtx.vaultMemoryCollection
        .query(Q.where("is_deleted", false), Q.where("archived_at", Q.notEq(null)), ...ownedBy)
        .fetchIds();
      if (ids.length === 0) return [];
      const rows = await getAllVaultMemoriesOp(vaultCtx, { memoryIds: ids, includeArchived: true });
      return rows.sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
    },
    memoriesByTopics: (names) => getMemoriesByEntityNamesOp(entityCtx, names),
    topicsByMemories: (memoryIds) => getEntitiesByMemoryIdsOp(entityCtx, memoryIds),

    create: (input) => createVaultMemoryOp(vaultCtx, input),
    createMany: (inputs) => createVaultMemoriesBatchOp(vaultCtx, inputs),
    update: async (id, patch) => {
      const updated = await updateVaultMemoryOp(vaultCtx, id, patch);
      // The cache is keyed by id, so a content edit would keep serving the old vector.
      if (updated) vaultCache.delete(id);
      return updated;
    },
    delete: async (id) => {
      const deleted = await deleteVaultMemoryOp(vaultCtx, id);
      if (deleted) vaultCache.delete(id);
      return deleted;
    },
    supersede: (id, supersededById) => supersedeVaultMemoryOp(vaultCtx, id, supersededById),
    archive: (id) => archiveVaultMemoryOp(vaultCtx, id),
    restore: (id) => restoreVaultMemoryOp(vaultCtx, id),
    setTopics: (memoryId, topics) => setMemoryEntitiesOp(vaultCtx, memoryId, topics),
    addTopics: (memoryId, topics) => linkMemoryEntitiesOp(entityCtx, memoryId, topics),
    setVisibility: (id, visibility, visibilityOptions) =>
      setMemoryVisibilityOp(vaultCtx, id, { visibility, ...visibilityOptions }),

    recall: (query, recallOptions) =>
      recall(
        query,
        { vaultCtx, entityCtx, embeddingOptions: options.embeddingOptions, vaultCache },
        { ...recallOptions, types: ["fact"] }
      ),
    retain: (content, retainOptions) =>
      retain(
        content,
        { vaultCtx, embeddingOptions: options.embeddingOptions, vaultCache },
        retainOptions
      ),

    subscribe: (onChange, subscribeOptions) => {
      // WatermelonDB observables emit the current result on subscribe; drop
      // that one so `onChange` only ever means "changed".
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
            .observeWithColumns(WATCHED_COLUMNS);
      const subscriptions = [memories.subscribe(afterFirst())];
      if (subscribeOptions?.topics) {
        subscriptions.push(
          entityCtx.entityCollection.query().observe().subscribe(afterFirst()),
          entityCtx.memoryEntityCollection.query().observe().subscribe(afterFirst())
        );
      }
      return () => subscriptions.forEach((s) => s.unsubscribe());
    },

    maintenance: {
      createDecaySweeper: (sweeperOptions) => createDecaySweeper({ ...sweeperOptions, vaultCtx }),
      getTopicBacklog: (backlogOptions) =>
        getMemoriesNeedingTopicExtractionOp(vaultCtx, backlogOptions),
      extractTopics: (memoryIds, extractOptions) =>
        extractAndLinkEntitiesForMemoriesOp(vaultCtx, memoryIds, extractOptions),
      stampTopicsExtracted: (memoryIds, extractedAt, version) =>
        stampTopicsExtractedAtOp(vaultCtx, memoryIds, extractedAt, version),
      relinkTopics: (memoryIds) => relinkMemoryTopicsOp(vaultCtx, memoryIds),
      backfillTopics: (memoryIds) => backfillMemoryTopicsOp(vaultCtx, memoryIds),
    },
  };
}
