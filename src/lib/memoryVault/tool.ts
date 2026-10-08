import type { ToolConfig } from "../chat/useChat/types";
import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import {
  createVaultMemoryOp,
  getVaultMemoryOp,
  updateVaultMemoryOp,
} from "../db/memoryVault/operations";
import type { EmbeddingOptions } from "../memoryEngine/types";
import { eagerEmbedContent, type VaultEmbeddingCache } from "./searchTool";

const MANUAL_FACT_TYPES = [
  "identity",
  "preference",
  "relationship",
  "plan",
  "ongoing_context",
  "constraint",
  "other",
] as const;

/** A FactType the save tool's optional `type` argument may carry. */
export type ManualFactType = (typeof MANUAL_FACT_TYPES)[number];

function normalizeManualFactType(value: unknown): ManualFactType | undefined {
  return typeof value === "string" && (MANUAL_FACT_TYPES as readonly string[]).includes(value)
    ? (value as ManualFactType)
    : undefined;
}

function isSharedScope(scope: string | null | undefined): boolean {
  return scope === "shared";
}

/**
 * What a {@link VaultMemoryWriter} reports back. The action set mirrors
 * `RetainResult.action` in `memory/retain` — restated here rather than imported
 * for the same reason MANUAL_FACT_TYPES is (memoryVault → memory import cycle).
 */
export type VaultWriteAction = "create" | "merge" | "update" | "supersede" | "suppressed" | "skip";

export interface VaultWriteOutcome {
  /** The memory the write landed on: the fresh row, or the existing one it merged into. */
  memoryId: string;
  action: VaultWriteAction;
}

/** A NEW memory the tool wants written — `id`-addressed updates never come here. */
export interface VaultWriteInput {
  content: string;
  scope: string;
  folderId?: string;
  factType?: ManualFactType;
}

/**
 * The seam through which the tool writes NEW memories when the host supplies one.
 * `useChatStorage` (react + expo) passes a `retain()`-backed writer so a
 * model-initiated save gets the same cosine auto-merge the background extractor
 * gets, instead of a bare insert that trusts the model to have de-duplicated.
 */
export type VaultMemoryWriter = (input: VaultWriteInput) => Promise<VaultWriteOutcome>;

async function notifyWritten(
  options: MemoryVaultToolOptions | undefined,
  input: VaultWriteInput,
  outcome: VaultWriteOutcome
): Promise<void> {
  try {
    await options?.onWritten?.({ input, outcome });
  } catch {
    // Swallowed on purpose; see above.
  }
}

function describeWriteOutcome(outcome: VaultWriteOutcome): string {
  switch (outcome.action) {
    case "create":
      return `Memory saved successfully (ID: ${outcome.memoryId}).`;
    case "update":
    case "supersede":
      return `Memory saved successfully (ID: ${outcome.memoryId}); it replaces an earlier version of this fact.`;
    case "merge":
    case "skip":
      return `The vault already holds this fact (ID: ${outcome.memoryId}); it was noted as re-observed. Nothing new was created — do not save it again.`;
    case "suppressed":
      return "Not saved: this matches a memory the user previously deleted. Do not re-save it.";
  }
}

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
   * When provided, the confirmation is built into the executor.
   * When not provided, the tool has no executor and is emitted
   * via onToolCall so the host app can handle it.
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
  /**
   * Writer for NEW memories. When set, a save without an `id` goes through it
   * instead of a bare `createVaultMemoryOp`, and the tool phrases its reply from
   * the reported action (a merge reads as "already known", not "saved").
   *
   * The hooks supply a `retain()`-backed writer, which is what makes this tool
   * stop being a dedup bypass: until then the only thing standing between the
   * model and a duplicate row was the prompt asking it to pass an `id`. Omit it
   * (as a bare `createMemoryVaultTool(vaultCtx, …)` caller must — retain needs
   * embeddings) and the direct insert path is unchanged.
   *
   * Updates addressed by `id` never come here: the model has already named the
   * row, so there is nothing to de-duplicate against.
   */
  write?: VaultMemoryWriter;
  /**
   * Fires after a NEW memory's write settles, with what was asked and what the
   * writer did. The host's analytics hook: `onSave` runs BEFORE the write and so
   * cannot tell a fresh create from a merge into an existing memory — and that
   * split is the one number that says whether model-initiated saves duplicate
   * the vault. Fires on both write paths (a `write` seam, or the direct insert
   * when none is supplied — reported as `create`). Not called for
   * `id`-addressed updates or cancelled saves. A throwing or rejecting listener
   * is awaited and swallowed so it can never fail the tool call.
   */
  onWritten?: (event: {
    input: VaultWriteInput;
    outcome: VaultWriteOutcome;
  }) => void | Promise<void>;
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
          type: {
            type: "string",
            enum: [...MANUAL_FACT_TYPES],
            description:
              "Optional classification of the memory: identity, preference, relationship, " +
              "plan, ongoing_context, constraint, or other. Omit if unsure — it defaults to " +
              "untyped. The type is used only for organization and retrieval; memories saved " +
              "with this tool are never auto-archived by decay regardless of type.",
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
    executor: hasOnSave
      ? async (args: Record<string, unknown>): Promise<string> => {
          const content = args.content as string;
          const id = args.id as string | undefined;
          const folderName = args.folderName as string | undefined;
          const factType = normalizeManualFactType(args.type);

          if (!content || typeof content !== "string") {
            return "Error: content is required and must be a string.";
          }

          try {
            const isUpdate = !!id;
            let previousContent: string | undefined;

            const scope = options?.scope ?? "private";

            if (isUpdate) {
              const existing = await getVaultMemoryOp(vaultCtx, id);
              if (!existing) {
                return `Error: Memory with ID "${id}" not found. Creating a new memory instead would require a separate call without an ID.`;
              }
              if (isSharedScope(existing.scope) !== isSharedScope(scope)) {
                return `Error: Memory "${id}" belongs to a different scope than this conversation and cannot be updated from here. It was not modified. To record this fact, save it as a new memory without an ID.`;
              }
              previousContent = existing.content;
            }

            const operation: VaultSaveOperation = {
              action: isUpdate ? "update" : "add",
              content,
              ...(!isUpdate && { scope }),
              ...(isUpdate && { id, previousContent }),
            };

            if (options?.onSave) {
              const confirmed = await options.onSave(operation);
              if (!confirmed) {
                return isUpdate
                  ? `Memory update was cancelled by the user. The memory "${id}" was not modified.`
                  : "Memory save was cancelled by the user. No memory was created.";
              }
            }

            if (isUpdate) {
              const folderId = folderName ? options?.folderMap?.get(folderName) : undefined;
              const updated = await updateVaultMemoryOp(vaultCtx, id, {
                content,
                embedding: null,
                folderId,
                ...(factType !== undefined && { factType }),
              });
              if (!updated) {
                return `Error: Failed to update memory "${id}".`;
              }
              if (embeddingOptions && cache) {
                cache.delete(id);
                eagerEmbedContent(
                  content,
                  embeddingOptions,
                  cache,
                  vaultCtx,
                  id,
                  updated.updatedAt
                ).catch(() => {});
              }
              return `Memory updated successfully (ID: ${updated.uniqueId}).`;
            } else {
              const folderId = folderName ? options?.folderMap?.get(folderName) : undefined;
              if (options?.write) {
                const input: VaultWriteInput = {
                  content,
                  scope,
                  ...(folderId !== undefined && { folderId }),
                  ...(factType !== undefined && { factType }),
                };
                const outcome = await options.write(input);
                await notifyWritten(options, input, outcome);
                return describeWriteOutcome(outcome);
              }
              const created = await createVaultMemoryOp(vaultCtx, {
                content,
                scope,
                folderId,
                ...(factType !== undefined && { factType }),
              });
              if (embeddingOptions && cache) {
                eagerEmbedContent(
                  content,
                  embeddingOptions,
                  cache,
                  vaultCtx,
                  created.uniqueId,
                  created.updatedAt
                ).catch(() => {});
              }
              await notifyWritten(
                options,
                {
                  content,
                  scope,
                  ...(folderId !== undefined && { folderId }),
                  ...(factType !== undefined && { factType }),
                },
                { memoryId: created.uniqueId, action: "create" }
              );
              return `Memory saved successfully (ID: ${created.uniqueId}).`;
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            return `Error saving memory: ${message}`;
          }
        }
      : undefined,
    removeAfterExecution: hasOnSave,
    deAnonymizeArgs: true,
  };
}
