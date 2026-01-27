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
 * Convert a Media model instance to a StoredMedia object.
 */
export function mediaToStored(media: Media): StoredMedia {
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
  const mediaId = generateMediaId();
  const now = Date.now();

  const created = await ctx.database.write(async () => {
    return await mediaCollection.create((media) => {
      media._setRaw("media_id", mediaId);
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
      if (options.metadata)
        media._setRaw("metadata", JSON.stringify(options.metadata));
      media._setRaw("created_at", now);
      media._setRaw("updated_at", now);
      media._setRaw("is_deleted", false);
    });
  });

  return mediaToStored(created);
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

  // Generate media IDs upfront so we can query them after batch insert
  const mediaIds: string[] = optionsArray.map(() => generateMediaId());

  await ctx.database.write(async () => {
    await ctx.database.batch(
      ...optionsArray.map((options, index) => {
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
          if (options.metadata)
            media._setRaw("metadata", JSON.stringify(options.metadata));
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
  return results.map(mediaToStored);
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

  return results.length > 0 ? mediaToStored(results[0]) : null;
}

/**
 * Get a media record by its source URL.
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

  return results.length > 0 ? mediaToStored(results[0]) : null;
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
  return updated.length > 0 ? mediaToStored(updated[0]) : null;
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
  return results.map(mediaToStored);
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
  return results.map(mediaToStored);
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
  return mediaIds
    .map((id) => mediaMap.get(id))
    .filter((m): m is Media => m !== undefined)
    .map(mediaToStored);
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
 */
export async function searchMediaOp(
  ctx: MediaOperationsContext,
  walletAddress: string,
  query: string,
  limit?: number
): Promise<StoredMedia[]> {
  const mediaCollection = ctx.database.get<Media>("media");
  const results = await mediaCollection
    .query(
      Q.where("wallet_address", walletAddress),
      Q.where("is_deleted", false),
      Q.where("name", Q.like(`%${Q.sanitizeLikeString(query)}%`)),
      Q.sortBy("created_at", Q.desc),
      ...(limit ? [Q.take(limit)] : [])
    )
    .fetch();
  return results.map(mediaToStored);
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
