import { Q } from "@nozbe/watermelondb";
import { Media } from "./models";
import type {
  StoredMedia,
  CreateMediaOptions,
  UpdateMediaOptions,
  MediaFilterOptions,
  MediaOperationsContext,
  MediaType,
  MediaRole,
} from "./types";
import { generateMediaId } from "./types";
import { deleteEncryptedFile, isOPFSSupported } from "../../storage";
import { encryptMediaFields, decryptMediaFields } from "./encryption";
import type { SignMessageFn, EmbeddedWalletSignerFn } from "../../../react/useEncryption";

/**
 * Delete a file from OPFS if supported, silently ignoring errors.
 */
async function tryDeleteFromOPFS(mediaId: string): Promise<void> {
  if (!isOPFSSupported()) {
    return;
  }
  try {
    await deleteEncryptedFile(mediaId);
  } catch {
    // Silently ignore errors (file may not exist or be stored differently)
  }
}

/**
 * Convert a Media model instance to a StoredMedia object (raw, without decryption).
 */
export function mediaToStoredRaw(media: Media): StoredMedia {
  return {
    id: media.id,
    mediaId: media.mediaId,
    walletAddress: media.walletAddress,
    messageId: media.messageId,
    conversationId: media.conversationId,
    name: media.name,
    mimeType: media.mimeType,
    mediaType: media.mediaType,
    size: media.size,
    role: media.role,
    model: media.model,
    sourceUrl: media.sourceUrl,
    dimensions: media.dimensions,
    duration: media.duration,
    metadata: media.metadata,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
    isDeleted: media.isDeleted,
  };
}

/**
 * Converts a Media model to StoredMedia, decrypting fields if encryption context is available.
 */
export async function mediaToStored(
  media: Media,
  walletAddress?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredMedia> {
  const baseMedia = mediaToStoredRaw(media);

  // Decrypt fields if wallet address provided
  if (walletAddress) {
    return await decryptMediaFields(baseMedia, walletAddress, signMessage, embeddedWalletSigner);
  }

  return baseMedia;
}

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Create a new media record.
 */
export async function createMediaOp(
  ctx: MediaOperationsContext,
  options: CreateMediaOptions
): Promise<StoredMedia> {
  const mediaCollection = ctx.database.get<Media>("media");
  const mediaId = options.mediaId || generateMediaId();
  const now = Date.now();

  // Encrypt media fields if encryption context is available
  const encryptedOpts = ctx.walletAddress && ctx.signMessage
    ? await encryptMediaFields(options, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    : options;

  const created = await ctx.database.write(async () => {
    return await mediaCollection.create((media) => {
      media._setRaw("media_id", mediaId);
      media._setRaw("wallet_address", encryptedOpts.walletAddress);
      if (encryptedOpts.messageId) media._setRaw("message_id", encryptedOpts.messageId);
      if (encryptedOpts.conversationId)
        media._setRaw("conversation_id", encryptedOpts.conversationId);
      media._setRaw("name", encryptedOpts.name);
      media._setRaw("mime_type", encryptedOpts.mimeType);
      media._setRaw("media_type", encryptedOpts.mediaType);
      media._setRaw("size", encryptedOpts.size);
      media._setRaw("role", encryptedOpts.role);
      if (encryptedOpts.model) media._setRaw("model", encryptedOpts.model);
      if (encryptedOpts.sourceUrl) media._setRaw("source_url", encryptedOpts.sourceUrl);
      if (encryptedOpts.dimensions)
        media._setRaw("dimensions", JSON.stringify(encryptedOpts.dimensions));
      if (encryptedOpts.duration !== undefined)
        media._setRaw("duration", encryptedOpts.duration);
      if (encryptedOpts.metadata) {
        // Metadata may already be encrypted as a string
        const metadataValue = typeof encryptedOpts.metadata === 'string'
          ? encryptedOpts.metadata
          : JSON.stringify(encryptedOpts.metadata);
        media._setRaw("metadata", metadataValue);
      }
      media._setRaw("created_at", now);
      media._setRaw("updated_at", now);
      media._setRaw("is_deleted", false);
    });
  });

  return mediaToStored(created, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
}

/**
 * Create multiple media records in a batch.
 */
export async function createMediaBatchOp(
  ctx: MediaOperationsContext,
  optionsArray: CreateMediaOptions[]
): Promise<StoredMedia[]> {
  const mediaCollection = ctx.database.get<Media>("media");
  const now = Date.now();

  // Use provided media IDs or generate new ones
  const mediaIds: string[] = optionsArray.map(
    (opt) => opt.mediaId || generateMediaId()
  );

  // Encrypt all media options if encryption context is available
  const encryptedArray = ctx.walletAddress && ctx.signMessage
    ? await Promise.all(
        optionsArray.map((opts) =>
          encryptMediaFields(opts, ctx.walletAddress!, ctx.signMessage!, ctx.embeddedWalletSigner)
        )
      )
    : optionsArray;

  await ctx.database.write(async () => {
    await ctx.database.batch(
      ...encryptedArray.map((options, index) => {
        return mediaCollection.prepareCreate((media) => {
          media._setRaw("media_id", mediaIds[index]);
          media._setRaw("wallet_address", options.walletAddress);
          if (options.messageId) media._setRaw("message_id", options.messageId);
          if (options.conversationId)
            media._setRaw("conversation_id", options.conversationId);
          media._setRaw("name", options.name);
          media._setRaw("mime_type", options.mimeType);
          media._setRaw("media_type", options.mediaType);
          media._setRaw("size", options.size);
          media._setRaw("role", options.role);
          if (options.model) media._setRaw("model", options.model);
          if (options.sourceUrl) media._setRaw("source_url", options.sourceUrl);
          if (options.dimensions)
            media._setRaw("dimensions", JSON.stringify(options.dimensions));
          if (options.duration !== undefined)
            media._setRaw("duration", options.duration);
          if (options.metadata) {
            const metadataValue = typeof options.metadata === 'string'
              ? options.metadata
              : JSON.stringify(options.metadata);
            media._setRaw("metadata", metadataValue);
          }
          media._setRaw("created_at", now);
          media._setRaw("updated_at", now);
          media._setRaw("is_deleted", false);
        });
      })
    );
  });

  // Fetch the created records by their media IDs
  const results = await mediaCollection
    .query(Q.where("media_id", Q.oneOf(mediaIds)))
    .fetch();
  return Promise.all(
    results.map((m) => mediaToStored(m, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner))
  );
}

/**
 * Get a media record by its media_id.
 */
export async function getMediaByIdOp(
  ctx: MediaOperationsContext,
  mediaId: string
): Promise<StoredMedia | null> {
  const mediaCollection = ctx.database.get<Media>("media");
  const results = await mediaCollection
    .query(Q.where("media_id", mediaId), Q.where("is_deleted", false))
    .fetch();

  return results.length > 0
    ? await mediaToStored(results[0], ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    : null;
}

/**
 * Get a media record by its source URL.
 * Note: When encryption is enabled, sourceUrl is encrypted and this query
 * will only match if the stored value is plaintext (legacy data).
 * For encrypted data, use getMediaByIdOp instead.
 */
export async function getMediaBySourceUrlOp(
  ctx: MediaOperationsContext,
  sourceUrl: string,
  walletAddress: string
): Promise<StoredMedia | null> {
  const mediaCollection = ctx.database.get<Media>("media");
  const results = await mediaCollection
    .query(
      Q.where("source_url", sourceUrl),
      Q.where("wallet_address", walletAddress),
      Q.where("is_deleted", false)
    )
    .fetch();

  return results.length > 0
    ? await mediaToStored(results[0], ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    : null;
}

/**
 * Update a media record.
 */
export async function updateMediaOp(
  ctx: MediaOperationsContext,
  mediaId: string,
  options: UpdateMediaOptions
): Promise<StoredMedia | null> {
  const mediaCollection = ctx.database.get<Media>("media");
  const results = await mediaCollection
    .query(Q.where("media_id", mediaId))
    .fetch();

  if (results.length === 0) {
    return null;
  }

  const media = results[0];
  const now = Date.now();

  await ctx.database.write(async () => {
    await media.update((m) => {
      if (options.name !== undefined) m._setRaw("name", options.name);
      if (options.messageId !== undefined)
        m._setRaw("message_id", options.messageId);
      if (options.sourceUrl !== undefined)
        m._setRaw("source_url", options.sourceUrl);
      if (options.dimensions !== undefined)
        m._setRaw("dimensions", JSON.stringify(options.dimensions));
      if (options.duration !== undefined)
        m._setRaw("duration", options.duration);
      if (options.metadata !== undefined)
        m._setRaw("metadata", JSON.stringify(options.metadata));
      if (options.isDeleted !== undefined)
        m._setRaw("is_deleted", options.isDeleted);
      m._setRaw("updated_at", now);
    });
  });

  // Fetch updated record
  const updated = await mediaCollection
    .query(Q.where("media_id", mediaId))
    .fetch();
  return updated.length > 0
    ? await mediaToStored(updated[0], ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    : null;
}

/**
 * Batch update media records with a messageId.
 * Used to associate media records with their message after message creation.
 *
 * @param ctx - Database context
 * @param mediaIds - Array of mediaIds to update
 * @param messageId - The messageId to set on all records
 * @returns Number of records updated
 */
export async function updateMediaMessageIdBatchOp(
  ctx: MediaOperationsContext,
  mediaIds: string[],
  messageId: string
): Promise<number> {
  if (mediaIds.length === 0) {
    return 0;
  }

  const mediaCollection = ctx.database.get<Media>("media");
  const results = await mediaCollection
    .query(Q.where("media_id", Q.oneOf(mediaIds)))
    .fetch();

  if (results.length === 0) {
    return 0;
  }

  const now = Date.now();

  await ctx.database.write(async () => {
    await ctx.database.batch(
      ...results.map((media) =>
        media.prepareUpdate((m) => {
          m._setRaw("message_id", messageId);
          m._setRaw("updated_at", now);
        })
      )
    );
  });

  return results.length;
}

/**
 * Soft delete a media record.
 * Clears source_url, removes file from OPFS, but keeps all metadata.
 */
export async function deleteMediaOp(
  ctx: MediaOperationsContext,
  mediaId: string
): Promise<boolean> {
  const mediaCollection = ctx.database.get<Media>("media");
  const results = await mediaCollection
    .query(Q.where("media_id", mediaId))
    .fetch();

  if (results.length === 0) {
    return false;
  }

  const media = results[0];
  const now = Date.now();

  // Delete file from OPFS
  await tryDeleteFromOPFS(mediaId);

  await ctx.database.write(async () => {
    await media.update((m) => {
      // Clear source URL but keep all metadata
      m._setRaw("source_url", null);
      m._setRaw("is_deleted", true);
      m._setRaw("updated_at", now);
    });
  });

  return true;
}

/**
 * Permanently delete a media record (hard delete).
 * Also removes the file from OPFS.
 */
export async function hardDeleteMediaOp(
  ctx: MediaOperationsContext,
  mediaId: string
): Promise<boolean> {
  const mediaCollection = ctx.database.get<Media>("media");
  const results = await mediaCollection
    .query(Q.where("media_id", mediaId))
    .fetch();

  if (results.length === 0) {
    return false;
  }

  // Delete file from OPFS
  await tryDeleteFromOPFS(mediaId);

  await ctx.database.write(async () => {
    await results[0].destroyPermanently();
  });

  return true;
}

// =============================================================================
// Library Query Operations
// =============================================================================

/**
 * Get all media for a user with optional filters.
 */
export async function getMediaOp(
  ctx: MediaOperationsContext,
  filters: MediaFilterOptions
): Promise<StoredMedia[]> {
  const mediaCollection = ctx.database.get<Media>("media");

  const conditions: Q.Clause[] = [
    Q.where("wallet_address", filters.walletAddress),
  ];

  if (!filters.includeDeleted) {
    conditions.push(Q.where("is_deleted", false));
  }

  if (filters.mediaType) {
    conditions.push(Q.where("media_type", filters.mediaType));
  }

  if (filters.role) {
    conditions.push(Q.where("role", filters.role));
  }

  if (filters.conversationId) {
    conditions.push(Q.where("conversation_id", filters.conversationId));
  }

  if (filters.model) {
    conditions.push(Q.where("model", filters.model));
  }

  // Add sorting by created_at descending (newest first)
  conditions.push(Q.sortBy("created_at", Q.desc));

  // Add pagination
  if (filters.limit) {
    conditions.push(Q.take(filters.limit));
  }
  if (filters.offset) {
    conditions.push(Q.skip(filters.offset));
  }

  const results = await mediaCollection.query(...conditions).fetch();
  return Promise.all(
    results.map((m) => mediaToStored(m, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner))
  );
}

/**
 * Get media by type (image, video, audio, document).
 */
export async function getMediaByTypeOp(
  ctx: MediaOperationsContext,
  walletAddress: string,
  mediaType: MediaType,
  limit?: number
): Promise<StoredMedia[]> {
  return getMediaOp(ctx, { walletAddress, mediaType, limit });
}

/**
 * Get all images for a user.
 */
export async function getImagesOp(
  ctx: MediaOperationsContext,
  walletAddress: string,
  limit?: number
): Promise<StoredMedia[]> {
  return getMediaByTypeOp(ctx, walletAddress, "image", limit);
}

/**
 * Get all videos for a user.
 */
export async function getVideosOp(
  ctx: MediaOperationsContext,
  walletAddress: string,
  limit?: number
): Promise<StoredMedia[]> {
  return getMediaByTypeOp(ctx, walletAddress, "video", limit);
}

/**
 * Get all audio files for a user.
 */
export async function getAudioOp(
  ctx: MediaOperationsContext,
  walletAddress: string,
  limit?: number
): Promise<StoredMedia[]> {
  return getMediaByTypeOp(ctx, walletAddress, "audio", limit);
}

/**
 * Get all documents for a user.
 */
export async function getDocumentsOp(
  ctx: MediaOperationsContext,
  walletAddress: string,
  limit?: number
): Promise<StoredMedia[]> {
  return getMediaByTypeOp(ctx, walletAddress, "document", limit);
}

/**
 * Get media by conversation.
 */
export async function getMediaByConversationOp(
  ctx: MediaOperationsContext,
  walletAddress: string,
  conversationId: string,
  limit?: number
): Promise<StoredMedia[]> {
  return getMediaOp(ctx, { walletAddress, conversationId, limit });
}

/**
 * Get media by message.
 */
export async function getMediaByMessageOp(
  ctx: MediaOperationsContext,
  messageId: string
): Promise<StoredMedia[]> {
  const mediaCollection = ctx.database.get<Media>("media");
  const results = await mediaCollection
    .query(
      Q.where("message_id", messageId),
      Q.where("is_deleted", false),
      Q.sortBy("created_at", Q.asc)
    )
    .fetch();
  return Promise.all(
    results.map((m) => mediaToStored(m, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner))
  );
}

/**
 * Get media by an array of media IDs.
 * Useful for fetching media using the fileIds array stored in messages.
 */
export async function getMediaByIdsOp(
  ctx: MediaOperationsContext,
  mediaIds: string[],
  includeDeleted: boolean = false
): Promise<StoredMedia[]> {
  if (mediaIds.length === 0) {
    return [];
  }

  const mediaCollection = ctx.database.get<Media>("media");
  const conditions: Q.Clause[] = [Q.where("media_id", Q.oneOf(mediaIds))];

  if (!includeDeleted) {
    conditions.push(Q.where("is_deleted", false));
  }

  const results = await mediaCollection.query(...conditions).fetch();

  // Return in the same order as the input mediaIds
  const mediaMap = new Map(results.map((m) => [m.mediaId, m]));
  const orderedMedia = mediaIds
    .map((id) => mediaMap.get(id))
    .filter((m): m is Media => m !== undefined);
  // Use allSettled so one decryption failure doesn't lose the entire batch
  const settled = await Promise.allSettled(
    orderedMedia.map((m) => mediaToStored(m, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner))
  );
  return settled
    .filter((r): r is PromiseFulfilledResult<StoredMedia> => {
      if (r.status === "rejected") {
        // eslint-disable-next-line no-console
        console.warn("[getMediaByIdsOp] Failed to decrypt media record:", r.reason);
      }
      return r.status === "fulfilled";
    })
    .map((r) => r.value);
}

/**
 * Get media by role (user uploads vs AI generated).
 */
export async function getMediaByRoleOp(
  ctx: MediaOperationsContext,
  walletAddress: string,
  role: MediaRole,
  limit?: number
): Promise<StoredMedia[]> {
  return getMediaOp(ctx, { walletAddress, role, limit });
}

/**
 * Get AI-generated media for a user.
 */
export async function getAIGeneratedMediaOp(
  ctx: MediaOperationsContext,
  walletAddress: string,
  limit?: number
): Promise<StoredMedia[]> {
  return getMediaByRoleOp(ctx, walletAddress, "assistant", limit);
}

/**
 * Get user-uploaded media.
 */
export async function getUserUploadedMediaOp(
  ctx: MediaOperationsContext,
  walletAddress: string,
  limit?: number
): Promise<StoredMedia[]> {
  return getMediaByRoleOp(ctx, walletAddress, "user", limit);
}

/**
 * Get media by AI model.
 */
export async function getMediaByModelOp(
  ctx: MediaOperationsContext,
  walletAddress: string,
  model: string,
  limit?: number
): Promise<StoredMedia[]> {
  return getMediaOp(ctx, { walletAddress, model, limit });
}

/**
 * Get recent media for library homepage.
 */
export async function getRecentMediaOp(
  ctx: MediaOperationsContext,
  walletAddress: string,
  limit: number = 20
): Promise<StoredMedia[]> {
  return getMediaOp(ctx, { walletAddress, limit });
}

/**
 * Search media by name.
 * Handles both encrypted and plaintext names:
 * - First tries SQL LIKE for plaintext/legacy records
 * - Then fetches all records and filters decrypted names in memory
 * - Deduplicates and returns merged results
 */
export async function searchMediaOp(
  ctx: MediaOperationsContext,
  walletAddress: string,
  query: string,
  limit?: number
): Promise<StoredMedia[]> {
  const mediaCollection = ctx.database.get<Media>("media");
  const queryLower = query.toLowerCase();

  // Fetch recent non-deleted media for this wallet, decrypt, and filter in memory.
  // SQL LIKE cannot match encrypted field content, so we must decrypt first.
  // Capped at 500 most recent records to prevent memory blowup at scale.
  const MAX_SEARCH_RECORDS = 500;
  const allResults = await mediaCollection
    .query(
      Q.where("wallet_address", walletAddress),
      Q.where("is_deleted", false),
      Q.sortBy("created_at", Q.desc),
      Q.take(MAX_SEARCH_RECORDS),
    )
    .fetch();

  const decrypted = await Promise.all(
    allResults.map((m) => mediaToStored(m, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner))
  );

  const matched = decrypted.filter(
    (m) => m.name?.toLowerCase().includes(queryLower)
  );

  return limit ? matched.slice(0, limit) : matched;
}

/**
 * Get media count for a user.
 */
export async function getMediaCountOp(
  ctx: MediaOperationsContext,
  walletAddress: string,
  mediaType?: MediaType
): Promise<number> {
  const mediaCollection = ctx.database.get<Media>("media");

  const conditions: Q.Clause[] = [
    Q.where("wallet_address", walletAddress),
    Q.where("is_deleted", false),
  ];

  if (mediaType) {
    conditions.push(Q.where("media_type", mediaType));
  }

  return await mediaCollection.query(...conditions).fetchCount();
}

/**
 * Get media counts by type for a user.
 */
export async function getMediaCountsByTypeOp(
  ctx: MediaOperationsContext,
  walletAddress: string
): Promise<Record<MediaType, number>> {
  const [images, videos, audio, documents] = await Promise.all([
    getMediaCountOp(ctx, walletAddress, "image"),
    getMediaCountOp(ctx, walletAddress, "video"),
    getMediaCountOp(ctx, walletAddress, "audio"),
    getMediaCountOp(ctx, walletAddress, "document"),
  ]);

  return { image: images, video: videos, audio, document: documents };
}

/**
 * Delete all media for a conversation (when conversation is deleted).
 * Clears source_url, removes files from OPFS, but keeps all metadata.
 */
export async function deleteMediaByConversationOp(
  ctx: MediaOperationsContext,
  conversationId: string
): Promise<number> {
  const mediaCollection = ctx.database.get<Media>("media");
  const results = await mediaCollection
    .query(Q.where("conversation_id", conversationId), Q.where("is_deleted", false))
    .fetch();

  if (results.length === 0) {
    return 0;
  }

  // Delete files from OPFS in parallel
  await Promise.all(results.map((media) => tryDeleteFromOPFS(media.mediaId)));

  const now = Date.now();
  await ctx.database.write(async () => {
    await ctx.database.batch(
      ...results.map((media) =>
        media.prepareUpdate((m) => {
          // Clear source URL but keep all metadata
          m._setRaw("source_url", null);
          m._setRaw("is_deleted", true);
          m._setRaw("updated_at", now);
        })
      )
    );
  });

  return results.length;
}

/**
 * Delete all media for a message (when message is deleted).
 * Clears source_url, removes files from OPFS, but keeps all metadata.
 */
export async function deleteMediaByMessageOp(
  ctx: MediaOperationsContext,
  messageId: string
): Promise<number> {
  const mediaCollection = ctx.database.get<Media>("media");
  const results = await mediaCollection
    .query(Q.where("message_id", messageId), Q.where("is_deleted", false))
    .fetch();

  if (results.length === 0) {
    return 0;
  }

  // Delete files from OPFS in parallel
  await Promise.all(results.map((media) => tryDeleteFromOPFS(media.mediaId)));

  const now = Date.now();
  await ctx.database.write(async () => {
    await ctx.database.batch(
      ...results.map((media) =>
        media.prepareUpdate((m) => {
          // Clear source URL but keep all metadata
          m._setRaw("source_url", null);
          m._setRaw("is_deleted", true);
          m._setRaw("updated_at", now);
        })
      )
    );
  });

  return results.length;
}
