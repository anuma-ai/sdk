/**
 * Memory Vault Tool
 *
 * Provides a tool for LLMs to save and update persistent memories.
 * Each operation can be intercepted by the host app for confirmation/cancellation.
 */

import type { ToolConfig } from "../chat/useChat/types";
import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import {
  createVaultMemoryOp,
  getVaultMemoryOp,
  updateVaultMemoryOp,
} from "../db/memoryVault/operations";
import type { EmbeddingOptions } from "../memoryEngine/types";
import { eagerEmbedContent, type VaultEmbeddingCache } from "./searchTool";

/**
 * Describes a pending vault save operation for UI confirmation.
 */
export interface VaultSaveOperation {
  /** Whether this is a new memory or an update to an existing one */
  action: "add" | "update";
  /** The memory content to save */
  content: string;
  /** The scope of the memory (only present for add operations) */
  scope?: string;
  /** The ID of the memory being updated (only present for updates) */
  id?: string;
  /** The previous content of the memory (only present for updates, for diff display) */
  previousContent?: string;
}

/**
 * Options for creating a memory vault tool.
 */
export interface MemoryVaultToolOptions {
  /**
   * Callback invoked before each save operation.
   * Return `true` to confirm the save, `false` to cancel it.
   *
   * When provided, the tool uses autoExecute with the confirmation
   * built into the executor. When not provided, the tool uses
   * autoExecute: false so the host app can handle it via onToolCall.
   */
  onSave?: (operation: VaultSaveOperation) => Promise<boolean>;

  /**
   * Scope to assign to new memories. Defaults to "private".
   * This is injected by the client, not controlled by the LLM.
   */
  scope?: string;

  /**
   * Map of folder names to folder IDs for auto-classification.
   * When provided, the LLM can specify a folderName argument.
   */
  folderMap?: Map<string, string>;
}

/**
 * Creates a memory vault tool for use with chat completions.
 *
 * The tool allows the LLM to save and update persistent memories.
 * Each operation can be intercepted for user confirmation before committing.
 *
 * @param vaultCtx - Vault operations context for database access
 * @param options - Optional configuration (onSave callback for confirmation)
 * @returns A ToolConfig that can be passed to chat completion tools
 *
 * @example
 * ```ts
 * const tool = createMemoryVaultTool(vaultCtx, {
 *   onSave: async (op) => {
 *     // Show confirmation toast, return true/false
 *     return await showConfirmationToast(op);
 *   },
 * });
 *
 * await sendMessage({
 *   messages: [...],
 *   clientTools: [tool],
 * });
 * ```
 */
export function createMemoryVaultTool(
  vaultCtx: VaultMemoryOperationsContext,
  options?: MemoryVaultToolOptions,
  embeddingOptions?: EmbeddingOptions,
  cache?: VaultEmbeddingCache
): ToolConfig {
  const hasOnSave = !!options?.onSave;
  const folderNames = options?.folderMap ? Array.from(options.folderMap.keys()) : [];

  return {
    type: "function",
    function: {
      name: "memory_vault_save",
      description:
        "Save or update a memory in the user's persistent memory vault. " +
        "Use this to remember important facts, preferences, or context about the user. " +
        "When the vault already contains a related memory, provide its ID to update it " +
        "rather than creating a duplicate. Merge new information into existing entries " +
        "to keep the vault compact and non-redundant.",
      arguments: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description:
              "The memory text to save. Should be a concise, self-contained fact or preference.",
          },
          id: {
            type: "string",
            description:
              "The ID of an existing memory to update. " +
              "If omitted, a new memory is created. " +
              "Prefer updating existing memories over creating new ones.",
          },
          ...(folderNames.length > 0 && {
            folderName: {
              type: "string",
              description:
                `The name of the folder to save or move the memory into. ` +
                `Available folders: ${folderNames.join(", ")}. ` +
                `Omit if no folder is a good fit.`,
            },
          }),
        },
        required: ["content"],
      },
    },
    executor: async (args: Record<string, unknown>): Promise<string> => {
      const content = args.content as string;
      const id = args.id as string | undefined;
      const folderName = args.folderName as string | undefined;

      if (!content || typeof content !== "string") {
        return "Error: content is required and must be a string.";
      }

      try {
        const isUpdate = !!id;
        let previousContent: string | undefined;

        // For updates, fetch the existing memory to get previous content
        if (isUpdate) {
          const existing = await getVaultMemoryOp(vaultCtx, id);
          if (!existing) {
            return `Error: Memory with ID "${id}" not found. Creating a new memory instead would require a separate call without an ID.`;
          }
          previousContent = existing.content;
        }

        // Build the operation descriptor for the confirmation callback
        const scope = options?.scope ?? "private";
        const operation: VaultSaveOperation = {
          action: isUpdate ? "update" : "add",
          content,
          ...(!isUpdate && { scope }),
          ...(isUpdate && { id, previousContent }),
        };

        // If onSave callback is provided, ask for confirmation
        if (options?.onSave) {
          const confirmed = await options.onSave(operation);
          if (!confirmed) {
            return isUpdate
              ? `Memory update was cancelled by the user. The memory "${id}" was not modified.`
              : "Memory save was cancelled by the user. No memory was created.";
          }
        }

        // Execute the save
        if (isUpdate) {
          const folderId = folderName ? options?.folderMap?.get(folderName) : undefined;
          const updated = await updateVaultMemoryOp(vaultCtx, id, { content, embedding: null, folderId });
          if (!updated) {
            return `Error: Failed to update memory "${id}".`;
          }
          // Sync embedding cache: evict stale entry, embed new content
          if (embeddingOptions && cache) {
            if (previousContent) {
              cache.delete(previousContent);
            }
            eagerEmbedContent(content, embeddingOptions, cache, vaultCtx, id).catch((err) => {
              console.warn("[anuma/sdk] Failed to embed updated memory:", err);
            });
          }
          return `Memory updated successfully (ID: ${updated.uniqueId}).`;
        } else {
          const folderId = folderName ? options?.folderMap?.get(folderName) : undefined;
          const created = await createVaultMemoryOp(vaultCtx, { content, scope, folderId });
          // Eagerly embed the new memory so it's searchable immediately
          if (embeddingOptions && cache) {
            eagerEmbedContent(content, embeddingOptions, cache, vaultCtx, created.uniqueId).catch(
              (err) => {
                console.warn("[anuma/sdk] Failed to embed new memory:", err);
              }
            );
          }
          return `Memory saved successfully (ID: ${created.uniqueId}).`;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return `Error saving memory: ${message}`;
      }
    },
    autoExecute: hasOnSave,
    removeAfterExecution: hasOnSave,
  };
}
