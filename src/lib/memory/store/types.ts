import type { EntityInput } from "../../db/entities/operations.js";
import type { StoredEntity } from "../../db/entities/types.js";
import type { MemoriesNeedingTopicExtraction } from "../../db/memoryVault/operations.js";
import type {
  CreateVaultMemoryOptions,
  StoredVaultMemory,
  UpdateVaultMemoryOptions,
  VaultMemoryProjection,
  VaultMemoryVisibility,
} from "../../db/memoryVault/types.js";
import type { CreateDecaySweeperOptions, DecaySweeper } from "../decayWorker.js";
import type { TopicExtractionRunResult, TopicExtractOptions } from "../topicExtract.js";
import type { RecallOptions, RecallResult, RetainOptions, RetainResult } from "../types.js";

/**
 * Read filter for {@link MemoryStore.list}. Same semantics as the vault read
 * ops: every non-visible state (deleted, archived, quarantined, superseded) is
 * hidden by default and has its own opt-in flag.
 * @public
 */
export interface MemoryListOptions {
  scopes?: string[];
  /** Only memories updated after this instant (results then sort by `updatedAt`). */
  since?: Date;
  limit?: number;
  /** Restrict to these ids. Absent or foreign ids are dropped, never an error. */
  memoryIds?: string[];
  factTypes?: string[];
  /** People Nearby visibility filter; a legacy NULL column reads as "private". */
  visibility?: VaultMemoryVisibility[];
  /** Memory Graph "forgotten" nodes — rows carry `isDeleted: true`. */
  includeDeleted?: boolean;
  includeArchived?: boolean;
  includeQuarantined?: boolean;
  /** Memory history — rows carry `supersededBy`. */
  includeSuperseded?: boolean;
}

/**
 * A manual memory save. Creation uses private visibility, manual provenance
 * and a proof count of one. Missing embeddings are filled in the background.
 * Publication uses `setVisibility`; extraction uses `retain`. Migration and
 * restore use the dedicated lower-level vault/import operations rather than
 * passing provenance, trust or publication metadata through manual creation.
 * @public
 */
export type MemoryCreate = Pick<
  CreateVaultMemoryOptions,
  | "content"
  | "scope"
  | "factType"
  | "eventTime"
  | "embedding"
  | "embeddingModel"
  | "geohash"
  | "kind"
  | "kindValue"
  | "level"
>;

/**
 * The edits an app makes to an existing memory. Deliberately narrower than
 * {@link UpdateVaultMemoryOptions}: the re-observation knobs (`proofCountIncrement`,
 * `observationSourceIds`, `preserveUpdatedAt`, `restore`, `lastObservedAt`, …)
 * belong to `retain()` and backup sync, and an HTTP backend should never have
 * to accept them from a client. No `folderId` either: vault folders are gone
 * from the server surface (they leaked across tenants), so a remote backend
 * could not honour it.
 *
 * Omitting `embedding` drops the stored vector (and its model tag) and the
 * store re-embeds the new content in the background — useChatStorage's edit
 * behaviour, so an edit never keeps a vector for text that is gone. Pass
 * `embedding` (with `embeddingModel`) only when you already have the new one.
 * @public
 */
export type MemoryUpdate = Pick<
  UpdateVaultMemoryOptions,
  | "content"
  | "scope"
  | "factType"
  | "eventTime"
  | "embedding"
  | "embeddingModel"
  | "kind"
  | "kindValue"
  | "level"
>;

/**
 * Fact-only recall. Conversation chunks are message storage, not memory, so
 * the chunk-lane knobs are not part of this surface; nor is `folderId` (see
 * {@link MemoryUpdate}).
 *
 * DEVICE-LOCAL: `decomposeOptions` (portal credentials) and `onDiagnostics` (a
 * callback) configure work on the device, including with a remote store.
 * Query embedding/decomposition and the decrypted recall pipeline stay on the
 * device. Nearby ranks encrypted rows using embeddings and metadata; credentials
 * and callbacks are never forwarded to it.
 * @public
 */
export type MemoryRecallOptions = Omit<
  RecallOptions,
  "types" | "includeChunks" | "conversationId" | "excludeConversationId" | "folderId"
>;

/**
 * `retain()` options minus `folderId` (see {@link MemoryUpdate}).
 *
 * DEVICE-LOCAL: `consolidateOptions` carries portal credentials, an `onFallback`
 * callback and possibly a `PiiRedactor` instance — it configures the
 * consolidation LLM call on the device. A remote store fetches encrypted
 * candidates, decrypts and consolidates them on the device, then persists
 * encrypted results through versioned writes. Nearby holds no decryption key
 * and never receives these credentials, callbacks or redactor instances.
 * @public
 */
export type MemoryRetainOptions = Omit<RetainOptions, "folderId">;

/**
 * A topic and how many memories link to it.
 * @public
 */
export interface MemoryTopic {
  name: string;
  kind: string | null;
  memoryCount: number;
}

/** @public */
export interface MemorySubscribeOptions {
  /**
   * Watch the whole table, soft-deleted rows included, and fire on row-SET
   * changes only (create / delete / undelete) — the Memory Graph's mode. A
   * column-aware watch would re-fire on every row a decay sweep archives.
   * Default `false`: watch live rows for user-visible edits and list membership
   * changes. Background embedding, proof and watermark bookkeeping does not
   * trigger default notifications.
   */
  includeDeleted?: boolean;
  /** Also fire when topic (entity / link) state changes. Default `false`. */
  topics?: boolean;
  /**
   * Also fire for embedding vector/model changes. Default `false`.
   * Ignored when `includeDeleted` is `true`, which remains membership-only.
   */
  embeddings?: boolean;
}

/**
 * Background jobs that keep a LOCAL store healthy.
 *
 * TRANSITIONAL local-vault plumbing. A remote store may omit these hooks, but
 * their absence does not mean plaintext-dependent work moves to nearby.
 * Topic extraction and other jobs that need decrypted memory content remain
 * on the device and persist encrypted rows/metadata through the remote store.
 * Metadata-only maintenance can run server-side. Nothing here should gain a
 * new caller that isn't a background worker.
 *
 * Not here on purpose: the client's quality sweep (`list` + `delete`) and
 * folder→topic migration (`list` + `topicsByMemories` + `addTopics`) compose
 * from the main interface.
 * @public
 */
export interface MemoryMaintenance {
  /** Decay sweeper bound to this store's vault (see `createDecaySweeper`). */
  createDecaySweeper(options?: Omit<CreateDecaySweeperOptions, "vaultCtx">): DecaySweeper;
  /** One page of the topic-extraction backlog (see `getMemoriesNeedingTopicExtractionOp`). */
  getTopicBacklog(options?: { limit?: number }): Promise<MemoriesNeedingTopicExtraction>;
  /** LLM topic extraction + link + stamp for these memories. */
  extractTopics(
    memoryIds: readonly string[],
    options: TopicExtractOptions & { now?: number }
  ): Promise<TopicExtractionRunResult>;
  /** Grandfather already-linked rows without an LLM call. Returns the ids stamped. */
  stampTopicsExtracted(
    memoryIds: readonly string[],
    extractedAt: number,
    version?: number
  ): Promise<string[]>;
  /** Rebuild the local link index from each row's synced `topics`. Returns the ids relinked. */
  relinkTopics(memoryIds: readonly string[]): Promise<string[]>;
  /** Fill `topics` on pre-v42 rows from their existing links. Returns the ids filled. */
  backfillTopics(memoryIds: readonly string[]): Promise<string[]>;
}

/**
 * One user's memories, pitched at what the apps do with them rather than at
 * the storage ops underneath. Two backends are intended: the on-device
 * WatermelonDB vault ({@link createLocalMemoryStore}) and, later, an HTTP
 * client for the server-side store.
 *
 * Every value crossing this interface is plain data — no WatermelonDB Model,
 * Query or Collection — so a remote backend can serialize it. The one
 * exception is the DEVICE-LOCAL LLM-call knobs on {@link MemoryRecallOptions}
 * and {@link MemoryRetainOptions}, which a remote store uses on the device
 * rather than forwarding to nearby. Server persistence is authoritative;
 * content decryption and plaintext-dependent processing remain on the device. Reads are
 * whole-result rather than per-row so a chat turn costs a handful of calls
 * (`recall`, then `retain` per fact), not one per memory.
 *
 * Writes resolve `null` / `false` for a memory that is missing, deleted or
 * not owned by this store's user; they don't throw for it.
 * @public
 */
export interface MemoryStore {
  /** Memories newest-first, decrypted, WITH `embedding` (Memory Graph edges read it). */
  list(options?: MemoryListOptions): Promise<StoredVaultMemory[]>;
  get(id: string): Promise<StoredVaultMemory | null>;
  /** Decay-archived memories (not deleted, quarantined or superseded), most recently archived first. */
  listArchived(): Promise<StoredVaultMemory[]>;
  /** Memory id → which of `names` it is linked to. Names are matched case-insensitively. */
  memoriesByTopics(names: readonly string[]): Promise<Map<string, Set<string>>>;
  /** Memory id → its canonical (lowercased) topic names. Unlinked ids are absent. */
  topicsByMemories(memoryIds: readonly string[]): Promise<Map<string, Set<string>>>;
  /** Every topic by canonical name, with its kind and linked-memory count. */
  listTopics(): Promise<MemoryTopic[]>;
  /** The memories {@link MemoryStore.list} would return, without decrypting content. */
  listProjections(options?: MemoryListOptions): Promise<VaultMemoryProjection[]>;

  /** Manual save; missing embeddings are filled in the background. */
  create(input: MemoryCreate): Promise<StoredVaultMemory>;
  /** One write for a batch of manual saves; migration/restore uses lower-level operations. */
  createMany(inputs: MemoryCreate[]): Promise<StoredVaultMemory[]>;
  update(id: string, patch: MemoryUpdate): Promise<StoredVaultMemory | null>;
  /** Soft delete; also drops the memory's topic links. */
  delete(id: string): Promise<boolean>;
  /** Retire `id` behind the newer `supersededById` (both must be live and owned). */
  supersede(id: string, supersededById: string): Promise<boolean>;
  archive(id: string): Promise<boolean>;
  restore(id: string): Promise<boolean>;
  /** Replace the memory's topics with a user-chosen set and stop auto-tagging it. */
  setTopics(memoryId: string, topics: readonly EntityInput[]): Promise<StoredVaultMemory | null>;
  /** Add topics alongside the existing ones (auto-tagging stays on). */
  addTopics(memoryId: string, topics: readonly EntityInput[]): Promise<StoredEntity[]>;
  setVisibility(
    id: string,
    visibility: VaultMemoryVisibility,
    options?: { twinOptIn?: boolean }
  ): Promise<StoredVaultMemory | null>;

  recall(query: string, options?: MemoryRecallOptions): Promise<RecallResult>;
  retain(content: string, options?: MemoryRetainOptions): Promise<RetainResult>;

  /**
   * Call `onChange` after the store's memories change; re-read to see what
   * changed. Does not fire for the state at subscription time — read once
   * after subscribing. Returns the unsubscribe function.
   */
  subscribe(onChange: () => void, options?: MemorySubscribeOptions): () => void;

  /** TRANSITIONAL — see {@link MemoryMaintenance}. Absent on a remote backend. */
  maintenance?: MemoryMaintenance;
}
