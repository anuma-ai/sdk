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
import { isJunkMemoryContent } from "../memory/junkGate";
import type { RetainOptions, RetainResult } from "../memory/types";
import type { EmbeddingOptions } from "../memoryEngine/types";
import { eagerEmbedContent, type VaultEmbeddingCache } from "./searchTool";

/**
 * The 7 FactTypes a manual save may self-classify into (PR5). Mirrors the
 * extractor's `FactType` union in `memory/autoExtract` — kept as a local const
 * (not imported) to avoid a memoryVault → memory runtime import cycle. Only used
 * to validate the optional `type` tool argument; an unrecognized value is
 * dropped (persisted as null, the untyped/medium-decay bucket).
 */
const MANUAL_FACT_TYPES = [
  "identity",
  "preference",
  "relationship",
  "plan",
  "ongoing_context",
  "constraint",
  "other",
] as const;

/** Validate a caller/LLM-supplied `type` arg to a known FactType, or undefined. */
function normalizeManualFactType(value: unknown): (typeof MANUAL_FACT_TYPES)[number] | undefined {
  return typeof value === "string" && (MANUAL_FACT_TYPES as readonly string[]).includes(value)
    ? (value as (typeof MANUAL_FACT_TYPES)[number])
    : undefined;
}

/**
 * Map a {@link RetainResult} (the create path now routes through `retain()`,
 * which may merge/update/supersede a near-duplicate instead of inserting) to
 * the tool's success string. Every branch names the memory's id so the model
 * can reference it in a later update. `create` keeps the original wording so
 * the common case reads identically to before.
 */
function describeRetainResult(result: RetainResult): string {
  const id = result.memoryId;
  switch (result.action) {
    case "merge":
      return `Memory merged into an existing memory (ID: ${id}).`;
    case "update":
      return `Memory updated an existing memory (ID: ${id}).`;
    case "supersede":
      return `Memory saved, replacing an outdated memory (ID: ${id}).`;
    case "suppressed":
      // Unreachable from this tool (manual writes don't set respectTombstones),
      // but handled so a future opt-in doesn't silently mis-report.
      return "Memory was not saved: it matches a memory you previously deleted.";
    case "rejected":
      // Unreachable — junk is gated before retain() is called — but kept honest.
      return "Error: content too short or low-signal to save.";
    case "create":
    default:
      return `Memory saved successfully (ID: ${id}).`;
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
   * Auth/endpoint (and optional `onFallback` / `piiRedaction`) for the
   * write-time consolidation LLM used on the CREATE path. When this is present
   * AND both `embeddingOptions` and `cache` were passed to
   * {@link createMemoryVaultTool}, a model tool-save is routed through
   * `retain()`, which dedups and consolidates against near-duplicate memories
   * exactly like auto-extraction (instead of blindly inserting a new row).
   *
   * When omitted, create still dedups via retain's cosine auto-merge (as long
   * as embeddings are available) but skips the LLM consolidation stage. It must
   * be passed explicitly — it can't default from `embeddingOptions`, whose
   * `model` is the EMBEDDING model (not a chat model) and which carries no
   * `onFallback` / `piiRedaction`.
   */
  retainConsolidate?: RetainOptions["consolidateOptions"];
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
        "New saves are automatically de-duplicated: if a near-identical memory already " +
        "exists it is reinforced or consolidated rather than duplicated, so you do not " +
        "need to search first to avoid duplicates. Provide an existing memory's ID only " +
        "when you intend to overwrite that specific memory's content.",
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
    // When onSave is provided, the executor runs with confirmation built in.
    // Without onSave, omit the executor so the tool is emitted via onToolCall
    // and the host app can handle it.
    executor: hasOnSave
      ? async (args: Record<string, unknown>): Promise<string> => {
          // PII de-anonymization is handled by runToolLoop before the executor
          // runs: this tool sets `deAnonymizeArgs: true`, so the loop restores the
          // original values in the arguments (with the same redactor that minted
          // the placeholders) before they reach here. The content we store is
          // already the real fact, not "[EMAIL_1]".
          const content = args.content as string;
          const id = args.id as string | undefined;
          const folderName = args.folderName as string | undefined;
          // PR5 — optional self-classification. Unknown/absent → undefined
          // (persisted as null, the untyped/medium-decay bucket).
          const factType = normalizeManualFactType(args.type);

          if (!content || typeof content !== "string") {
            return "Error: content is required and must be a string.";
          }

          // Shared junk gate (same predicate the extraction path uses): reject
          // low-signal scraps like "1"/"2"/"---" before any create OR update, so
          // the model can't smuggle junk into the vault through this tool.
          if (isJunkMemoryContent(content)) {
            return "Error: content too short or low-signal to save.";
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
              const updated = await updateVaultMemoryOp(vaultCtx, id, {
                content,
                embedding: null,
                folderId,
                // Manual update sets the type when the user explicitly picked one
                // (an intentional classification, so overwrite is fine here).
                ...(factType !== undefined && { factType }),
              });
              if (!updated) {
                return `Error: Failed to update memory "${id}".`;
              }
              // Sync embedding cache: eagerEmbedContent overwrites the entry
              // keyed by this memory's id (same id → new vector replaces the
              // stale one), so no explicit evict-by-content is needed.
              if (embeddingOptions && cache) {
                // Drop the stale vector first: if the re-embed fails, the id has
                // no entry (next search re-embeds from DB) instead of serving the
                // pre-edit vector under this id.
                cache.delete(id);
                // AWAIT (not fire-and-forget) so the updated row is embedded
                // before we return — the caller/UI can search it immediately and
                // tests are deterministic. An embed failure must NOT turn an
                // already-persisted update into an error, so swallow it here (the
                // vector is retried on the next search); we do NOT run
                // consolidation on an explicit id-update.
                try {
                  await eagerEmbedContent(content, embeddingOptions, cache, vaultCtx, id);
                } catch {
                  // Best-effort embed; the DB update already committed. Retried on
                  // next search. SDK must not use console.*.
                }
              }
              return `Memory updated successfully (ID: ${updated.uniqueId}).`;
            } else {
              const folderId = folderName ? options?.folderMap?.get(folderName) : undefined;

              // Fix A — route CREATE through retain() so a model tool-save dedups
              // and consolidates against near-duplicate memories exactly like
              // auto-extraction, instead of raw-inserting a duplicate. Only when
              // we have the embedding pieces retain needs (embeddingOptions +
              // cache); without them we keep the raw create for back-compat.
              if (embeddingOptions && cache) {
                let retainResult: RetainResult | undefined;
                try {
                  // Dynamic import mirrors this module's cycle-avoidance stance
                  // (see the FactType note above): memoryVault must not statically
                  // pull the heavier memory/* graph at module load.
                  const { retain } = await import("../memory/retain");
                  retainResult = await retain(
                    content,
                    { vaultCtx, embeddingOptions, vaultCache: cache },
                    {
                      source: "manual",
                      scope,
                      ...(folderId !== undefined && { folderId }),
                      ...(factType && { factType }),
                      ...(options?.retainConsolidate && {
                        consolidateOptions: options.retainConsolidate,
                      }),
                    }
                  );
                } catch {
                  // retain() THROWS on an embedding outage (it refuses to
                  // auto-merge against an inert cosine lane, which would create a
                  // duplicate). A user-CONFIRMED save must never be lost to that,
                  // so fall through to the raw create + eager embed below (the
                  // pre-retain behavior). Any rare duplicate self-reconciles at the
                  // next consolidation pass.
                }
                if (retainResult) {
                  return describeRetainResult(retainResult);
                }
              }

              // Fallback / no-embeddings path: raw create + best-effort eager embed.
              const created = await createVaultMemoryOp(vaultCtx, {
                content,
                scope,
                folderId,
                ...(factType !== undefined && { factType }),
              });
              // Eagerly embed the new memory so it's searchable immediately
              if (embeddingOptions && cache) {
                eagerEmbedContent(
                  content,
                  embeddingOptions,
                  cache,
                  vaultCtx,
                  created.uniqueId
                ).catch(
                  // Silently swallow – SDK must not use console.*; embedding will be retried on next search
                  () => {}
                );
              }
              return `Memory saved successfully (ID: ${created.uniqueId}).`;
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            return `Error saving memory: ${message}`;
          }
        }
      : undefined,
    removeAfterExecution: hasOnSave,
    // Saved memories live on-device, so restore real PII values (runToolLoop
    // de-anonymizes the call arguments with the turn's redactor) — the vault
    // must store "bob@acme.com", not "[EMAIL_1]".
    deAnonymizeArgs: true,
  };
}
