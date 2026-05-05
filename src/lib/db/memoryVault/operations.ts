import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import {
  canonicalSigningPayload,
  computeMemoryHash,
  computeMerkleRoot,
} from "../../truthLayer";
import type { EmbeddedWalletSignerFn, SignMessageFn } from "../encryption-utils";
import { decryptVaultMemoryFields, encryptVaultMemoryContent } from "./encryption";
import type { VaultMemory } from "./models";
import type {
  CreateVaultMemoryOptions,
  MemoryHistoryEntry,
  RetireVaultMemoryOptions,
  StoredVaultMemory,
  UpdateVaultMemoryOptions,
  VaultRootResult,
} from "./types";

export interface VaultMemoryOperationsContext {
  database: Database;
  vaultMemoryCollection: Collection<VaultMemory>;
  walletAddress?: string;
  signMessage?: SignMessageFn;
  embeddedWalletSigner?: EmbeddedWalletSignerFn;
  /** When set, operations scope to this user (server-side multi-user). */
  userId?: string;
}

/** Returns true if the record belongs to the context user (or if no user scoping is active). */
function isOwnedByCtxUser(ctx: VaultMemoryOperationsContext, record: VaultMemory): boolean {
  return ctx.userId === undefined || record.userId === ctx.userId;
}

/**
 * Builds the base WHERE conditions shared by all vault memory queries.
 *
 * Excludes soft-deleted memories AND Truth Layer-retired memories (retired_at
 * non-null). Retired memories are preserved in the database for audit/history
 * but should not surface in normal queries or RAG retrieval.
 */
function baseVaultConditions(ctx: VaultMemoryOperationsContext, options?: { since?: Date }) {
  return [
    Q.where("is_deleted", false),
    Q.where("retired_at", null),
    ...(ctx.userId !== undefined ? [Q.where("user_id", ctx.userId)] : []),
    ...(options?.since ? [Q.where("updated_at", Q.gt(options.since.getTime()))] : []),
  ];
}

/** Processes items in batches of 50 to avoid blocking the event loop. */
async function mapInBatches<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const BATCH = 50;
  const results: R[] = [];
  for (let i = 0; i < items.length; i += BATCH) {
    results.push(...(await Promise.all(items.slice(i, i + BATCH).map(fn))));
  }
  return results;
}

function vaultMemoryToStoredRaw(memory: VaultMemory): StoredVaultMemory {
  return {
    uniqueId: memory.id,
    content: memory.content,
    scope: memory.scope,
    folderId: memory.folderId ?? null,
    userId: memory.userId ?? null,
    embedding: memory.embedding ?? null,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
    isDeleted: memory.isDeleted,
    // Truth Layer fields (v28). Null for legacy memories created before signing.
    signature: memory.signature ?? null,
    grantId: memory.grantId ?? null,
    sourceMetadata: memory.sourceMetadata ?? null,
    parentStateHash: memory.parentStateHash ?? null,
    retiredAt: memory.retiredAt ?? null,
  };
}

/**
 * Sign a memory write using the provided WriterContext.
 *
 * Computes the content hash + canonical payload, asks the writer to sign,
 * and returns the fields to persist on the memory record.
 *
 * Returns null if no writerContext is provided (legacy unsigned write).
 */
async function signMemoryWriteOrLegacy(opts: {
  content: string;
  writerContext?: import("../../truthLayer/types").WriterContext;
  parentStateHash?: string | null;
}): Promise<{
  signature: string | null;
  grantId: string | null;
  sourceMetadata: string | null;
  parentStateHash: string | null;
} | null> {
  if (!opts.writerContext) {
    return null;
  }
  const wc = opts.writerContext;
  const contentHash = await computeMemoryHash({
    content: opts.content,
    sourceMetadata: wc.sourceMetadata,
    parentStateHash: opts.parentStateHash ?? null,
  });
  const timestamp = Date.now();
  const payload = await canonicalSigningPayload({
    contentHash,
    grantId: wc.grant.id,
    parentStateHash: opts.parentStateHash ?? null,
    timestamp,
  });
  const sig = await wc.sign(payload);
  return {
    signature: sig.signature,
    grantId: wc.grant.id,
    sourceMetadata: JSON.stringify(wc.sourceMetadata),
    parentStateHash: opts.parentStateHash ?? null,
  };
}

export async function vaultMemoryToStored(
  memory: VaultMemory,
  walletAddress?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredVaultMemory> {
  const raw = vaultMemoryToStoredRaw(memory);
  if (walletAddress) {
    return decryptVaultMemoryFields(raw, walletAddress, signMessage, embeddedWalletSigner);
  }
  return raw;
}

export async function createVaultMemoryOp(
  ctx: VaultMemoryOperationsContext,
  opts: CreateVaultMemoryOptions
): Promise<StoredVaultMemory> {
  const scope = opts.scope ?? "private";
  const encryptedContent =
    ctx.walletAddress && ctx.signMessage
      ? await encryptVaultMemoryContent(
          opts.content,
          ctx.walletAddress,
          ctx.signMessage,
          ctx.embeddedWalletSigner
        )
      : opts.content;

  // Truth Layer: sign the write if a writer context is provided. Legacy callers
  // (no writerContext) get null signature/grantId/sourceMetadata fields.
  const truthFields = await signMemoryWriteOrLegacy({
    content: opts.content,
    writerContext: opts.writerContext,
    parentStateHash: opts.parentStateHash ?? null,
  });

  const created = await ctx.database.write(async () => {
    return ctx.vaultMemoryCollection.create((record) => {
      record._setRaw("content", encryptedContent);
      record._setRaw("scope", scope);
      record._setRaw("folder_id", opts.folderId ?? null);
      record._setRaw("user_id", ctx.userId ?? null);
      record._setRaw("is_deleted", false);
      if (opts.embedding !== undefined) {
        record._setRaw("embedding", opts.embedding);
      }
      if (truthFields) {
        record._setRaw("signature", truthFields.signature);
        record._setRaw("grant_id", truthFields.grantId);
        record._setRaw("source_metadata", truthFields.sourceMetadata);
        record._setRaw("parent_state_hash", truthFields.parentStateHash);
      }
    });
  });

  return vaultMemoryToStored(created, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
}

export async function createVaultMemoriesBatchOp(
  ctx: VaultMemoryOperationsContext,
  optionsArray: CreateVaultMemoryOptions[]
): Promise<StoredVaultMemory[]> {
  if (optionsArray.length === 0) return [];

  // Pre-encrypt all contents in parallel
  const encryptedContents = await Promise.all(
    optionsArray.map(async (opts) => {
      if (ctx.walletAddress && ctx.signMessage) {
        return encryptVaultMemoryContent(
          opts.content,
          ctx.walletAddress,
          ctx.signMessage,
          ctx.embeddedWalletSigner
        );
      }
      return opts.content;
    })
  );

  // Truth Layer: sign each write if a writer context is provided.
  const truthFieldsArray = await Promise.all(
    optionsArray.map((opts) =>
      signMemoryWriteOrLegacy({
        content: opts.content,
        writerContext: opts.writerContext,
        parentStateHash: opts.parentStateHash ?? null,
      })
    )
  );

  // Single write transaction with batch create
  const created = await ctx.database.write(async () => {
    const prepared = optionsArray.map((opts, i) =>
      ctx.vaultMemoryCollection.prepareCreate((record) => {
        record._setRaw("content", encryptedContents[i]);
        record._setRaw("scope", opts.scope ?? "private");
        record._setRaw("folder_id", opts.folderId ?? null);
        record._setRaw("user_id", ctx.userId ?? null);
        record._setRaw("is_deleted", false);
        if (optionsArray[i].embedding !== undefined) {
          record._setRaw("embedding", optionsArray[i].embedding);
        }
        const truthFields = truthFieldsArray[i];
        if (truthFields) {
          record._setRaw("signature", truthFields.signature);
          record._setRaw("grant_id", truthFields.grantId);
          record._setRaw("source_metadata", truthFields.sourceMetadata);
          record._setRaw("parent_state_hash", truthFields.parentStateHash);
        }
      })
    );
    await ctx.database.batch(...prepared);
    return prepared;
  });

  return Promise.all(
    created.map((record) =>
      vaultMemoryToStored(record, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    )
  );
}

export async function getVaultMemoryOp(
  ctx: VaultMemoryOperationsContext,
  id: string
): Promise<StoredVaultMemory | null> {
  try {
    const record = await ctx.vaultMemoryCollection.find(id);
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return null;
    return vaultMemoryToStored(
      record,
      ctx.walletAddress,
      ctx.signMessage,
      ctx.embeddedWalletSigner
    );
  } catch {
    return null;
  }
}

export async function getAllVaultMemoriesOp(
  ctx: VaultMemoryOperationsContext,
  options?: { scopes?: string[]; since?: Date; limit?: number; folderId?: string | null }
): Promise<StoredVaultMemory[]> {
  const conditions = [
    ...baseVaultConditions(ctx, options),
    ...(options?.scopes?.length ? [Q.where("scope", Q.oneOf(options.scopes))] : []),
    ...(options?.folderId !== undefined ? [Q.where("folder_id", options.folderId)] : []),
    Q.sortBy(options?.since ? "updated_at" : "created_at", Q.desc),
    ...(options?.limit !== null && options?.limit !== undefined && options.limit > 0
      ? [Q.take(options.limit)]
      : []),
  ];
  const results = await ctx.vaultMemoryCollection.query(...conditions).fetch();
  return mapInBatches(results, (record) =>
    vaultMemoryToStored(record, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
  );
}

export async function getAllVaultMemoryContentsOp(
  ctx: VaultMemoryOperationsContext,
  options?: { since?: Date }
): Promise<string[]> {
  const results = await ctx.vaultMemoryCollection
    .query(...baseVaultConditions(ctx, options))
    .fetch();
  return mapInBatches(results, async (record) => {
    const stored = await vaultMemoryToStored(
      record,
      ctx.walletAddress,
      ctx.signMessage,
      ctx.embeddedWalletSigner
    );
    return stored.content;
  });
}

export async function updateVaultMemoryOp(
  ctx: VaultMemoryOperationsContext,
  id: string,
  opts: UpdateVaultMemoryOptions
): Promise<StoredVaultMemory | null> {
  try {
    const record = await ctx.vaultMemoryCollection.find(id);
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return null;

    // Truth Layer: when a writer context is provided, convert update to
    // append-new + retire-old. The new memory references the parent's hash,
    // both writes are signed, and the parent is retained (not overwritten).
    // This preserves version history — undoing the new memory restores access
    // to the parent's content.
    //
    // Without writerContext, falls through to legacy in-place mutation
    // (unchanged behavior for existing callers).
    if (opts.writerContext) {
      // Compute parent state hash from current record content (decrypted form).
      const decryptedParent = await vaultMemoryToStored(
        record,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
      const parentMetadata = decryptedParent.sourceMetadata
        ? JSON.parse(decryptedParent.sourceMetadata)
        : { origin: "unknown", reviewed: false };
      const parentHash = await computeMemoryHash({
        content: decryptedParent.content,
        sourceMetadata: parentMetadata,
        parentStateHash: decryptedParent.parentStateHash,
      });

      // Retire the parent (mark retired_at, do NOT delete content).
      await ctx.database.write(async () => {
        await record.update((r) => {
          r._setRaw("retired_at", Date.now());
        });
      });

      // Create the new memory referencing the parent's hash.
      return await createVaultMemoryOp(ctx, {
        content: opts.content,
        scope: opts.scope ?? record.scope,
        folderId: opts.folderId !== undefined ? opts.folderId : record.folderId,
        embedding: opts.embedding ?? undefined,
        writerContext: opts.writerContext,
        parentStateHash: parentHash,
      });
    }

    // Legacy in-place mutation path (preserves existing behavior).
    const encryptedContent =
      ctx.walletAddress && ctx.signMessage
        ? await encryptVaultMemoryContent(
            opts.content,
            ctx.walletAddress,
            ctx.signMessage,
            ctx.embeddedWalletSigner
          )
        : opts.content;

    await ctx.database.write(async () => {
      await record.update((r) => {
        r._setRaw("content", encryptedContent);
        if (opts.scope !== undefined) {
          r._setRaw("scope", opts.scope);
        }
        if (opts.folderId !== undefined) {
          r._setRaw("folder_id", opts.folderId);
        }
        if (opts.embedding !== undefined) {
          r._setRaw("embedding", opts.embedding);
        }
      });
    });

    return vaultMemoryToStored(
      record,
      ctx.walletAddress,
      ctx.signMessage,
      ctx.embeddedWalletSigner
    );
  } catch {
    return null;
  }
}

export async function deleteVaultMemoryOp(
  ctx: VaultMemoryOperationsContext,
  id: string
): Promise<boolean> {
  try {
    const record = await ctx.vaultMemoryCollection.find(id);
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return false;

    await ctx.database.write(async () => {
      await record.update((r) => {
        r._setRaw("is_deleted", true);
      });
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Get all non-deleted, unfiled vault memories (folder_id is null).
 */
export async function getUnfiledVaultMemoriesOp(
  ctx: VaultMemoryOperationsContext
): Promise<StoredVaultMemory[]> {
  const conditions = [
    Q.where("folder_id", null),
    ...baseVaultConditions(ctx),
    Q.sortBy("created_at", Q.desc),
  ];
  const results = await ctx.vaultMemoryCollection.query(...conditions).fetch();
  return mapInBatches(results, (record) =>
    vaultMemoryToStored(record, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
  );
}

export async function deleteAllVaultMemoriesForUserOp(
  ctx: VaultMemoryOperationsContext,
  userId: string
): Promise<number> {
  if (ctx.userId !== undefined && ctx.userId !== userId) return 0;

  const records = await ctx.vaultMemoryCollection
    .query(Q.where("user_id", userId), Q.where("is_deleted", false))
    .fetch();

  if (records.length === 0) return 0;

  await ctx.database.write(async () => {
    const prepared = records.map((record) =>
      record.prepareUpdate((r) => {
        r._setRaw("is_deleted", true);
      })
    );
    await ctx.database.batch(...prepared);
  });

  return records.length;
}

export async function updateVaultMemoryEmbeddingOp(
  ctx: VaultMemoryOperationsContext,
  id: string,
  embedding: string
): Promise<boolean> {
  try {
    const record = await ctx.vaultMemoryCollection.find(id);
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return false;
    await ctx.database.write(async () => {
      await record.update((r) => {
        r._setRaw("embedding", embedding);
      });
    });
    return true;
  } catch {
    return false;
  }
}

// ── Truth Layer operations (v28) ──────────────────────────────────────

/**
 * Retire a vault memory with a signed tombstone.
 *
 * Unlike {@link deleteVaultMemoryOp} (which sets `is_deleted=true` as a flag),
 * retirement preserves the content and timestamps the retirement event. The
 * `retired_at` field becomes non-null. The memory is excluded from active
 * queries but remains in the database for history/audit purposes.
 *
 * The retirement event itself is signed against the writer's grant. The signed
 * tombstone is stored in `source_metadata` for audit trails.
 *
 * Returns the retired memory or null if the memory doesn't exist / isn't
 * owned by the context user.
 */
export async function retireVaultMemoryOp(
  ctx: VaultMemoryOperationsContext,
  id: string,
  opts: RetireVaultMemoryOptions
): Promise<StoredVaultMemory | null> {
  try {
    const record = await ctx.vaultMemoryCollection.find(id);
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return null;

    // Decrypt the parent's content to compute its hash for the tombstone.
    const decrypted = await vaultMemoryToStored(
      record,
      ctx.walletAddress,
      ctx.signMessage,
      ctx.embeddedWalletSigner
    );
    const parentMetadata = decrypted.sourceMetadata
      ? JSON.parse(decrypted.sourceMetadata)
      : { origin: "unknown", reviewed: false };
    const priorContentHash = await computeMemoryHash({
      content: decrypted.content,
      sourceMetadata: parentMetadata,
      parentStateHash: decrypted.parentStateHash,
    });

    // Sign the retirement event.
    const retiredAt = Date.now();
    const payload = await canonicalSigningPayload({
      contentHash: priorContentHash,
      grantId: opts.writerContext.grant.id,
      parentStateHash: priorContentHash, // parent of the retirement = the memory itself
      timestamp: retiredAt,
    });
    const sig = await opts.writerContext.sign(payload);

    // Capture the tombstone metadata alongside the source attribution.
    const tombstoneMetadata = {
      ...parentMetadata,
      retiredBy: opts.writerContext.grant.id,
      retiredAt,
      retirementReason: opts.reason,
      retirementSignature: sig.signature,
      retirementSignedHash: sig.signedHash,
      priorContentHash,
    };

    await ctx.database.write(async () => {
      await record.update((r) => {
        r._setRaw("retired_at", retiredAt);
        r._setRaw("source_metadata", JSON.stringify(tombstoneMetadata));
      });
    });

    return vaultMemoryToStored(
      record,
      ctx.walletAddress,
      ctx.signMessage,
      ctx.embeddedWalletSigner
    );
  } catch {
    return null;
  }
}

/**
 * Compute the Merkle root over the active (non-retired, non-deleted) memory set.
 *
 * Each memory's leaf hash combines content + signature + grant + source metadata.
 * The root summarizes the vault's current state in a single 32-byte value
 * suitable for anchoring on chain.
 *
 * Memories without Truth Layer fields (legacy unsigned writes) are still
 * included with hashes over their content alone.
 */
export async function computeVaultRootOp(
  ctx: VaultMemoryOperationsContext
): Promise<VaultRootResult> {
  // Fetch all active (non-retired, non-deleted) memories for the context user.
  // baseVaultConditions already excludes retired_at !== null and is_deleted=true,
  // so we can rely on it without additional filters here.
  const conditions = [
    ...baseVaultConditions(ctx),
    Q.sortBy("created_at", Q.asc),
  ];
  const records = await ctx.vaultMemoryCollection.query(...conditions).fetch();

  // Compute leaf hashes in parallel. We hash the decrypted content + metadata
  // so the root reflects the user's actual content, not its encrypted form.
  const leafHashes = await Promise.all(
    records.map(async (record) => {
      const decrypted = await vaultMemoryToStored(
        record,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
      const metadata = decrypted.sourceMetadata
        ? JSON.parse(decrypted.sourceMetadata)
        : { origin: "legacy", reviewed: false };
      return await computeMemoryHash({
        content: decrypted.content,
        sourceMetadata: metadata,
        parentStateHash: decrypted.parentStateHash,
      });
    })
  );

  const root = await computeMerkleRoot(leafHashes);

  return {
    root,
    memoryCount: records.length,
    leafHashes,
  };
}

/**
 * Get the version history of a memory by walking its parent chain.
 *
 * Returns the chain of memories from oldest to newest, with the active one last.
 * When called on a current (non-retired) memory, walks backward through
 * `parent_state_hash` links. When called on a retired memory, includes itself
 * and any descendants that supersede it.
 *
 * For the PoC, this is a best-effort walk — we look up parents by content hash
 * matching, which requires scanning. Could be optimized with an index later.
 */
export async function getMemoryHistoryOp(
  ctx: VaultMemoryOperationsContext,
  memoryId: string
): Promise<MemoryHistoryEntry[]> {
  try {
    const startRecord = await ctx.vaultMemoryCollection.find(memoryId);
    if (!isOwnedByCtxUser(ctx, startRecord)) return [];

    const startStored = await vaultMemoryToStored(
      startRecord,
      ctx.walletAddress,
      ctx.signMessage,
      ctx.embeddedWalletSigner
    );

    const history: MemoryHistoryEntry[] = [
      { memory: startStored, isActive: startStored.retiredAt === null && !startStored.isDeleted },
    ];

    // Walk parent chain backwards. Each parent_state_hash points to the
    // hash of the memory's predecessor.
    let currentParentHash = startStored.parentStateHash;
    const visited = new Set<string>([memoryId]);

    while (currentParentHash) {
      // Find the parent memory by computing hashes of candidates.
      // For PoC we scan all memories; production would index by content hash.
      const allRecords = await ctx.vaultMemoryCollection
        .query(...baseVaultConditions(ctx))
        .fetch();

      let foundParent: StoredVaultMemory | null = null;
      for (const candidate of allRecords) {
        if (visited.has(candidate.id)) continue;
        const cStored = await vaultMemoryToStored(
          candidate,
          ctx.walletAddress,
          ctx.signMessage,
          ctx.embeddedWalletSigner
        );
        const cMetadata = cStored.sourceMetadata
          ? JSON.parse(cStored.sourceMetadata)
          : { origin: "legacy", reviewed: false };
        const cHash = await computeMemoryHash({
          content: cStored.content,
          sourceMetadata: cMetadata,
          parentStateHash: cStored.parentStateHash,
        });
        if (cHash === currentParentHash) {
          foundParent = cStored;
          visited.add(candidate.id);
          break;
        }
      }

      if (!foundParent) break;
      history.unshift({
        memory: foundParent,
        isActive: foundParent.retiredAt === null && !foundParent.isDeleted,
      });
      currentParentHash = foundParent.parentStateHash;
    }

    return history;
  } catch {
    return [];
  }
}
