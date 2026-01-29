import type { Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";
import type { Message } from "../chat/models";
import type { FileMetadata } from "../chat/types";
import { generateMediaId, getMediaTypeFromMime } from "../media/types";
import type { CreateMediaOptions } from "../media/types";
import { createMediaBatchOp } from "../media/operations";

/**
 * Migration context for files to media migration.
 */
export interface MigrateFilesToMediaContext {
  database: Database;
  walletAddress: string;
}

/**
 * Migration result for tracking progress.
 */
export interface MigrateFilesToMediaResult {
  migratedMessages: number;
  migratedFiles: number;
  errors: Array<{ messageId: string; error: string }>;
}

/**
 * Local storage key to track if migration has been completed.
 */
const MIGRATION_COMPLETED_KEY = "anuma-files-to-media-migration-completed";

/**
 * Check if the files to media migration has already been completed.
 */
export function isFilesToMediaMigrationCompleted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MIGRATION_COMPLETED_KEY) === "true";
}

/**
 * Mark the files to media migration as completed.
 */
export function markFilesToMediaMigrationCompleted(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MIGRATION_COMPLETED_KEY, "true");
}

/**
 * Migrate legacy `files` field to `fileIds` with media records.
 *
 * This migration:
 * 1. Finds all messages that have `files` but no `fileIds`
 * 2. For each file, creates a media record in the media table
 * 3. Updates the message with the new `fileIds`
 *
 * The migration is idempotent - safe to run multiple times.
 *
 * @param ctx - Migration context with database and wallet address
 * @returns Migration result with counts and any errors
 */
export async function migrateFilesToMedia(
  ctx: MigrateFilesToMediaContext
): Promise<MigrateFilesToMediaResult> {
  const { database, walletAddress } = ctx;

  const result: MigrateFilesToMediaResult = {
    migratedMessages: 0,
    migratedFiles: 0,
    errors: [],
  };

  // Skip if already completed
  if (isFilesToMediaMigrationCompleted()) {
    // eslint-disable-next-line no-console
    console.log("[migrateFilesToMedia] Migration already completed, skipping");
    return result;
  }

  // eslint-disable-next-line no-console
  console.log("[migrateFilesToMedia] Starting migration...");

  try {
    const messagesCollection = database.get<Message>("history");

    // Find messages that have files but no file_ids
    // We need to check the raw records since WatermelonDB doesn't support JSON queries
    const allMessages = await messagesCollection.query().fetch();

    const messagesToMigrate: Array<{
      message: Message;
      files: FileMetadata[];
    }> = [];

    for (const message of allMessages) {
      const raw = (message as unknown as { _raw: Record<string, unknown> })
        ._raw;
      const filesJson = raw.files as string | undefined;
      const fileIdsJson = raw.file_ids as string | undefined;

      // Skip if no files or already has file_ids
      if (!filesJson || fileIdsJson) continue;

      try {
        const files = JSON.parse(filesJson) as FileMetadata[];
        if (files && files.length > 0) {
          messagesToMigrate.push({ message, files });
        }
      } catch {
        // Invalid JSON, skip this message
        continue;
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `[migrateFilesToMedia] Found ${messagesToMigrate.length} messages to migrate`
    );

    if (messagesToMigrate.length === 0) {
      markFilesToMediaMigrationCompleted();
      return result;
    }

    // Process each message
    for (const { message, files } of messagesToMigrate) {
      try {
        const raw = (message as unknown as { _raw: Record<string, unknown> })
          ._raw;
        const conversationId = raw.conversation_id as string;
        const messageRole = raw.role as "user" | "assistant" | "system";
        const messageModel = raw.model as string | undefined;

        // Create media records for each file
        const mediaOptions: CreateMediaOptions[] = files.map((file) => ({
          mediaId: file.id.startsWith("media_") ? file.id : `media_${file.id}`,
          walletAddress,
          messageId: message.id,
          conversationId,
          name: file.name,
          mimeType: file.type,
          mediaType: getMediaTypeFromMime(file.type),
          size: file.size,
          role: messageRole === "assistant" ? "assistant" : "user",
          model: messageRole === "assistant" ? messageModel : undefined,
          sourceUrl: file.sourceUrl,
        }));

        // Create media records in batch
        const createdMedia = await createMediaBatchOp(
          { database },
          mediaOptions
        );
        const fileIds = createdMedia.map((m) => m.mediaId);

        // Update message with file_ids
        await database.write(async () => {
          await message.update((m) => {
            (m as unknown as { _raw: Record<string, unknown> })._raw.file_ids =
              JSON.stringify(fileIds);
          });
        });

        result.migratedMessages++;
        result.migratedFiles += files.length;

        // eslint-disable-next-line no-console
        console.log(
          `[migrateFilesToMedia] Migrated message ${message.id}: ${files.length} files -> ${fileIds.length} media records`
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        result.errors.push({ messageId: message.id, error: errorMessage });
        // eslint-disable-next-line no-console
        console.error(
          `[migrateFilesToMedia] Error migrating message ${message.id}:`,
          err
        );
      }
    }

    // Mark migration as completed if no errors
    if (result.errors.length === 0) {
      markFilesToMediaMigrationCompleted();
    }

    // eslint-disable-next-line no-console
    console.log(
      `[migrateFilesToMedia] Migration complete: ${result.migratedMessages} messages, ${result.migratedFiles} files`
    );

    return result;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[migrateFilesToMedia] Migration failed:", err);
    throw err;
  }
}
