import type { Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import type { EmbeddedWalletSignerFn, SignMessageFn } from "../../db/encryption-utils.js";
import type { Entity, MemoryEntity } from "../../db/entities/models.js";
import type { EntityInput } from "../../db/entities/operations.js";
import {
  backfillMemoryEntityUserIdsOp,
  type EntityOperationsContext,
  getEntitiesByMemoryIdsOp,
  getMemoriesByEntityNamesOp,
  linkMemoryEntitiesOp,
} from "../../db/entities/operations.js";
import type { VaultMemory } from "../../db/memoryVault/models.js";
import {
  archiveVaultMemoryOp,
  backfillMemoryTopicsOp,
  backfillVaultMemoryUserIdsOp,
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
import type {
  CreateVaultMemoryOptions,
  VaultMemoryVisibility,
} from "../../db/memoryVault/types.js";
import { getLogger } from "../../logger.js";
import type { EmbeddingOptions } from "../../memoryEngine/types.js";
import { createVaultEmbeddingCache } from "../../memoryVault/lruCache.js";
import { eagerEmbedContent, type VaultEmbeddingCache } from "../../memoryVault/searchTool.js";
import { createDecaySweeper } from "../decayWorker.js";
import { recall } from "../recall.js";
import { retain } from "../retain.js";
import { extractAndLinkEntitiesForMemoriesOp, type TopicExtractOptions } from "../topicExtract.js";
import type { RetainOptions } from "../types.js";
import type { MemoryListOptions, MemoryRecallOptions, MemoryStore, MemoryUpdate } from "./types.js";

/** @public */
export interface LocalMemoryStoreOptions {
  /** A database built from `sdkSchema` (memory_vault + entity + memory_entity). */
  database: Database;
  /** With `signMessage`, encrypts content on write and decrypts on read. */
  walletAddress?: string;
  signMessage?: SignMessageFn;
  embeddedWalletSigner?: EmbeddedWalletSignerFn;
  /**
   * Scope every read/write to this user. On creation the store first claims
   * every row with no `user_id` for this user (vault rows, then their topic
   * links), so rows an unscoped context wrote — every useChatStorage row —
   * stay visible; each method waits for that claim. Safe on the per-wallet
   * client DBs, which hold one owner's rows; on a shared, multi-tenant
   * database every row must already carry its `user_id`.
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

  // Claim the unscoped rows before anything reads, so `userId` scoping never
  // hides them. A failure is logged, not rethrown: the store still works, and
  // the next store built on this database retries.
  const claimed: Promise<void> = userId
    ? (async () => {
        await backfillVaultMemoryUserIdsOp(vaultCtx, userId);
        // Links take their parent's user_id — now this user's for the rows above.
        await backfillMemoryEntityUserIdsOp(entityCtx, vaultCtx.vaultMemoryCollection);
      })().catch((err: unknown) => {
        getLogger().warn("[memory/store] user_id backfill failed", err);
      })
    : Promise.resolve();
  const afterClaim =
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      await claimed;
      return fn(...args);
    };

  return {
    list: afterClaim((listOptions?: MemoryListOptions) =>
      getAllVaultMemoriesOp(vaultCtx, listOptions)
    ),
    get: afterClaim((id: string) => getVaultMemoryOp(vaultCtx, id)),
    listArchived: afterClaim(async () => {
      // Pick the archived ids off the plaintext columns first so only those
      // rows get decrypted, never the whole vault.
      const ids = await vaultCtx.vaultMemoryCollection
        .query(Q.where("is_deleted", false), Q.where("archived_at", Q.notEq(null)), ...ownedBy)
        .fetchIds();
      if (ids.length === 0) return [];
      const rows = await getAllVaultMemoriesOp(vaultCtx, { memoryIds: ids, includeArchived: true });
      return rows.sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
    }),
    memoriesByTopics: afterClaim((names: readonly string[]) =>
      getMemoriesByEntityNamesOp(entityCtx, names)
    ),
    topicsByMemories: afterClaim((memoryIds: readonly string[]) =>
      getEntitiesByMemoryIdsOp(entityCtx, memoryIds)
    ),

    create: afterClaim((input: CreateVaultMemoryOptions) => createVaultMemoryOp(vaultCtx, input)),
    createMany: afterClaim((inputs: CreateVaultMemoryOptions[]) =>
      createVaultMemoriesBatchOp(vaultCtx, inputs)
    ),
    update: afterClaim(async (id: string, patch: MemoryUpdate) => {
      // Same as useChatStorage's vault edit: an edit without a fresh vector
      // clears the stored one (and its model tag) rather than keep a vector
      // for text that is gone, then re-embeds in the background.
      const reembed = patch.embedding === undefined;
      const updated = await updateVaultMemoryOp(
        vaultCtx,
        id,
        reembed ? { ...patch, embedding: null } : patch
      );
      if (!updated) return null;
      // The cache is keyed by id, so a content edit would keep serving the old vector.
      vaultCache.delete(id);
      if (reembed) {
        eagerEmbedContent(
          patch.content,
          options.embeddingOptions,
          vaultCache,
          vaultCtx,
          id,
          updated.updatedAt
        ).catch((err: unknown) => {
          getLogger().warn("[memory/store] Failed to re-embed edited memory:", err);
        });
      }
      return updated;
    }),
    delete: afterClaim(async (id: string) => {
      const deleted = await deleteVaultMemoryOp(vaultCtx, id);
      if (deleted) vaultCache.delete(id);
      return deleted;
    }),
    supersede: afterClaim((id: string, supersededById: string) =>
      supersedeVaultMemoryOp(vaultCtx, id, supersededById)
    ),
    archive: afterClaim((id: string) => archiveVaultMemoryOp(vaultCtx, id)),
    restore: afterClaim((id: string) => restoreVaultMemoryOp(vaultCtx, id)),
    setTopics: afterClaim((memoryId: string, topics: readonly EntityInput[]) =>
      setMemoryEntitiesOp(vaultCtx, memoryId, topics)
    ),
    addTopics: afterClaim((memoryId: string, topics: readonly EntityInput[]) =>
      linkMemoryEntitiesOp(entityCtx, memoryId, topics)
    ),
    setVisibility: afterClaim(
      (
        id: string,
        visibility: VaultMemoryVisibility,
        visibilityOptions?: { twinOptIn?: boolean }
      ) => setMemoryVisibilityOp(vaultCtx, id, { visibility, ...visibilityOptions })
    ),

    recall: afterClaim((query: string, recallOptions?: MemoryRecallOptions) =>
      recall(
        query,
        { vaultCtx, entityCtx, embeddingOptions: options.embeddingOptions, vaultCache },
        { ...recallOptions, types: ["fact"] }
      )
    ),
    retain: afterClaim((content: string, retainOptions?: RetainOptions) =>
      retain(
        content,
        { vaultCtx, embeddingOptions: options.embeddingOptions, vaultCache },
        retainOptions
      )
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
      getTopicBacklog: afterClaim((backlogOptions?: { limit?: number }) =>
        getMemoriesNeedingTopicExtractionOp(vaultCtx, backlogOptions)
      ),
      extractTopics: afterClaim(
        (memoryIds: readonly string[], extractOptions: TopicExtractOptions & { now?: number }) =>
          extractAndLinkEntitiesForMemoriesOp(vaultCtx, memoryIds, extractOptions)
      ),
      stampTopicsExtracted: afterClaim(
        (memoryIds: readonly string[], extractedAt: number, version?: number) =>
          stampTopicsExtractedAtOp(vaultCtx, memoryIds, extractedAt, version)
      ),
      relinkTopics: afterClaim((memoryIds: readonly string[]) =>
        relinkMemoryTopicsOp(vaultCtx, memoryIds)
      ),
      backfillTopics: afterClaim((memoryIds: readonly string[]) =>
        backfillMemoryTopicsOp(vaultCtx, memoryIds)
      ),
    },
  };
}
