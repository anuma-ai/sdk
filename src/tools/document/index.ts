/**
 * Document generation tools — `create_document`, `read_document`,
 * `patch_document`.
 *
 * The model authors a document as a single `@react-pdf/renderer` DSL source
 * file (see {@link module:tools/document/dsl}). Each document is stored as one
 * file per conversation in the shared {@link AppFileStorage}; the host's
 * `displayDocument` callback renders it to a vector PDF and attaches it to the
 * assistant message (the web app does this on the main thread — see the web
 * `useDocumentPdfExport`). To revise, the model reads the current source and
 * applies find/replace patches.
 *
 * This is a single-file sibling of {@link createAppGenerationTools}: it reuses
 * that module's pure patch engine (`applyPatches`, `truncateContent`,
 * `snippetForFailedPatch`, `snippetAroundLine`) and the read-before-write
 * contract, but validates content with {@link parseDocumentDsl} (react-pdf
 * DSL) rather than the JS/JSX syntax checker, and has no multi-file batch.
 *
 * Multiple distinct documents per conversation are supported via an optional
 * `documentId` (default `"document"`), each backed by its own `<id>.jsx` file
 * and rendered to its own PDF chip — so a single response can attach one or
 * several documents.
 *
 * @module tools/document
 */

import type { ToolConfig } from "../../lib/chat/useChat/types.js";
import {
  type AppFileStorage,
  applyPatches,
  snippetAroundLine,
  snippetForFailedPatch,
  truncateContent,
} from "../appGeneration.js";
import { DocDslError, parseDocumentDsl } from "./dsl.js";

export { buildDocumentSystemPrompt, DOCUMENT_BUILDER_PROMPT } from "./documentBuilderPrompt.js";
export type { DocAttrValue, DocChild, DocNode, PdfTag } from "./dsl.js";
export { DocDslError, isPdfTag, parseDocumentDsl, pdfStyleKeys, pdfTags } from "./dsl.js";

/** Default document identifier when the model omits `documentId`. */
export const DEFAULT_DOCUMENT_ID = "document";

/** Consecutive `patch_document` failures before the tool demands a re-read. */
const PATCH_FAILURE_THRESHOLD = 2;

/** Lines of context included around a syntax error / failed-patch snippet. */
const SNIPPET_CONTEXT = 3;

/** Tool names this module owns — for host filtering / set membership. */
export const DOCUMENT_TOOL_NAMES: ReadonlySet<string> = Object.freeze(
  new Set(["create_document", "read_document", "patch_document"])
);

/**
 * Map a `documentId` to its storage path. Slug-validated to keep ids
 * filesystem-safe and prevent traversal via the storage key.
 */
export function documentPath(documentId: string): string {
  return `${documentId}.jsx`;
}

function normalizeDocumentId(raw: unknown): string {
  if (raw === undefined || raw === null || raw === "") return DEFAULT_DOCUMENT_ID;
  if (typeof raw !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/i.test(raw)) {
    throw new Error(
      `Invalid documentId ${JSON.stringify(raw)}. Use a short slug of letters, digits, and dashes (e.g. "nda", "cover-letter").`
    );
  }
  return raw.toLowerCase();
}

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

const DOCUMENT_ID_PROP = {
  documentId: {
    type: "string",
    description:
      'Optional slug identifying which document to operate on (e.g. "nda", "offer-letter"). Omit for the default document. Use distinct ids to attach several separate documents in one response.',
  },
} as const;

export const CREATE_DOCUMENT_SCHEMA = {
  name: "create_document",
  description: `Author a formatted, paginated document the user can read and download as a PDF — a contract, agreement, letter, cover letter, memo, essay, report, brief, proposal, resume, or similar. Use this whenever the user asks to draft, write, compose, or generate a document. The document renders to a real PDF and attaches to your reply automatically — never write the document body as chat prose.

This is NOT for slide decks/presentations (use the deck tools) or interactive apps (use the app tools).

Write the "source" as a single @react-pdf/renderer JSX expression: a <Document> root containing one or more <Page> elements, with <View>/<Text> for layout and prose, using react-pdf style objects (flexbox only — no CSS grid/float). To revise a document later, prefer read_document + patch_document over rewriting the whole thing with create_document.`,
  arguments: {
    type: "object",
    properties: {
      ...DOCUMENT_ID_PROP,
      title: {
        type: "string",
        description:
          "Short human-readable document title (used for the PDF filename / attachment label).",
      },
      source: {
        type: "string",
        description:
          "The complete @react-pdf/renderer DSL: one <Document> root with <Page> children. Literal values only — no variables, expressions, or event handlers.",
      },
    },
    required: ["source"],
  },
} as const;

export const READ_DOCUMENT_SCHEMA = {
  name: "read_document",
  description:
    'Read the current document source (the @react-pdf/renderer DSL) with "<n>: " line-number prefixes, to plan an edit. Required before patch_document. Do not copy the line-number prefixes into a patch "find" string.',
  arguments: {
    type: "object",
    properties: { ...DOCUMENT_ID_PROP },
    required: [],
  },
} as const;

export const PATCH_DOCUMENT_SCHEMA = {
  name: "patch_document",
  description: `Edit, revise, amend, or reword an existing document via find-and-replace on its source, then re-render the PDF. Use this for incremental changes ("make it more formal", "add a confidentiality clause") instead of rewriting with create_document.

REQUIRED: call read_document for this document earlier in the conversation first — the tool refuses otherwise.

Pass a "patches" array of {find, replace}. Each "find" must match the source exactly, character for character, at EXACTLY ONE location (add 2-3 lines of surrounding context if it would otherwise be ambiguous), and must NOT include the "<n>: " line-number prefix from read_document.`,
  arguments: {
    type: "object",
    properties: {
      ...DOCUMENT_ID_PROP,
      patches: {
        type: "array",
        description: "Array of find/replace operations applied atomically.",
        items: {
          type: "object",
          properties: {
            find: { type: "string", description: "Exact string to find in the document source" },
            replace: { type: "string", description: "Replacement string" },
          },
          required: ["find", "replace"],
        },
      },
    },
    required: ["patches"],
  },
} as const;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface CreateDocumentToolsOptions {
  /** Returns the current conversation ID (may be null before the first message). */
  getConversationId: () => string | null;
  /** Storage backend for the document source file. */
  storage: Pick<AppFileStorage, "getFile" | "putFile">;
  /** Optional error logger. Falls back to console.error. */
  logError?: (message: string, error?: Error) => void;
  /**
   * Host callback that renders the just-written document to a PDF and
   * attaches it to the assistant message (web: render on the main thread via
   * `@react-pdf/renderer`, write to encrypted OPFS, append the media id to the
   * message's `fileIds`). Invoked automatically after every successful
   * `create_document` / `patch_document` — the model never calls a separate
   * display tool.
   *
   * Receives `{ documentId, path, title? }`. Unlike `displayApp`/`displaySlides`,
   * a THROW here is NOT swallowed: a render failure becomes a tool-error result
   * so the model can fix an unrenderable document and retry. Any object it
   * returns is spread into the tool result.
   */

  displayDocument?: (
    args: Record<string, unknown>
  ) => Promise<Record<string, unknown> | void> | Record<string, unknown> | void;
  /** Cap on per-conversation in-memory state (read-tracking, patch tallies). */
  maxConversations?: number;
}

/** Default cap for {@link CreateDocumentToolsOptions.maxConversations}. */
export const DEFAULT_MAX_DOCUMENT_CONVERSATIONS = 1_000;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the document tool set (`create_document`, `read_document`,
 * `patch_document`) backed by the provided storage adapter and host render
 * callback. The write tools do NOT skip continuation: their results are small
 * (`{ success, documentId }` — never the source), so feeding them back is cheap
 * and lets the model add a brief confirmation ("Drafted your cover letter — see
 * the attached PDF.") after the chip renders. Render/validation failures also
 * feed back as tool errors, so the model can recover.
 *
 * @category Document Tools
 */
export function createDocumentTools({
  getConversationId,
  storage,
  logError = (msg, err) => console.error(msg, err),
  displayDocument,
  maxConversations,
}: CreateDocumentToolsOptions): ToolConfig[] {
  const convCap =
    typeof maxConversations === "number" && maxConversations > 0
      ? maxConversations
      : DEFAULT_MAX_DOCUMENT_CONVERSATIONS;

  function touchConv<V>(map: Map<string, V>, conversationId: string, value: V): void {
    if (map.has(conversationId)) map.delete(conversationId);
    map.set(conversationId, value);
    while (map.size > convCap) {
      const oldest = map.keys().next().value;
      if (oldest === undefined) break;
      map.delete(oldest);
    }
  }

  function requireConversationId(): string {
    const id = getConversationId();
    if (!id) throw new Error("No active conversation");
    return id;
  }

  // Per-(conversation, path) set of documents whose current source the model
  // has seen (via read_document, or by writing them this turn). patch_document
  // refuses on an unseen document — mirrors the app/slide read-before-write
  // contract, preventing patches against a hallucinated copy.
  const seenByConv = new Map<string, Set<string>>();
  function markSeen(conversationId: string, path: string): void {
    const s = seenByConv.get(conversationId) ?? new Set<string>();
    touchConv(seenByConv, conversationId, s);
    s.add(path);
  }
  function hasBeenSeen(conversationId: string, path: string): boolean {
    return seenByConv.get(conversationId)?.has(path) ?? false;
  }

  // Per-(conversation, path) consecutive not-found patch failures.
  const patchFailuresByConv = new Map<string, Map<string, number>>();
  function bumpPatchFailure(conversationId: string, path: string): number {
    const m = patchFailuresByConv.get(conversationId) ?? new Map<string, number>();
    touchConv(patchFailuresByConv, conversationId, m);
    const n = (m.get(path) ?? 0) + 1;
    m.set(path, n);
    return n;
  }
  function clearPatchFailure(conversationId: string, path: string): void {
    patchFailuresByConv.get(conversationId)?.delete(path);
  }

  /** Validate the DSL, returning a structured tool-error result or null. */
  function validateOrError(source: string): Record<string, unknown> | null {
    try {
      parseDocumentDsl(source);
      return null;
    } catch (err) {
      if (err instanceof DocDslError) {
        return {
          error: `Invalid document DSL: ${err.message}`,
          dslError: { line: err.line, column: err.column, message: err.message },
        };
      }
      throw err;
    }
  }

  /**
   * Invoke the host render-and-attach callback. The reply is spread into the
   * tool result. A throw propagates (becomes a tool error) so the model can
   * fix an unrenderable document — this is the deliberate difference from the
   * error-swallowing `displayApp`/`displaySlides` hooks.
   */
  async function triggerDocDisplay(
    documentId: string,
    path: string,
    title: string | undefined
  ): Promise<Record<string, unknown>> {
    if (!displayDocument) return {};
    const reply = await displayDocument({ documentId, path, ...(title ? { title } : {}) });
    return reply && typeof reply === "object" ? reply : {};
  }

  const createDocumentTool: ToolConfig = {
    type: "function",
    function: CREATE_DOCUMENT_SCHEMA,
    executor: async (args: Record<string, unknown>) => {
      try {
        const conversationId = requireConversationId();
        const documentId = normalizeDocumentId(args.documentId);
        const path = documentPath(documentId);
        const source = args.source;
        const title = typeof args.title === "string" ? args.title : undefined;

        if (typeof source !== "string" || source.trim() === "") {
          return { error: "source is required and must be a non-empty react-pdf DSL string" };
        }

        const validationError = validateOrError(source);
        if (validationError) return validationError;

        await storage.putFile(conversationId, path, source);
        // Model just wrote it, so it counts as seen for a follow-up patch.
        markSeen(conversationId, path);
        clearPatchFailure(conversationId, path);

        // The display callback runs AFTER persist (the host renders by reading
        // the file back). A render throw here therefore happens on an
        // already-saved document — surface that instead of a misleading
        // "Failed to create document": the source is on disk, so the model
        // should fix and re-create (which overwrites) rather than assume
        // nothing was written.
        try {
          const display = await triggerDocDisplay(documentId, path, title);
          return { success: true, documentId, ...display };
        } catch (renderErr) {
          logError(
            "create_document rendering failed after persist",
            renderErr instanceof Error ? renderErr : undefined
          );
          return {
            error: `The document source was saved but failed to render as a PDF: ${
              renderErr instanceof Error ? renderErr.message : String(renderErr)
            }. Fix the source and call create_document again (it overwrites the same document).`,
          };
        }
      } catch (err) {
        logError("create_document failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to create document: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };

  const readDocumentTool: ToolConfig = {
    type: "function",
    function: READ_DOCUMENT_SCHEMA,
    executor: async (args: Record<string, unknown>) => {
      try {
        const conversationId = requireConversationId();
        const documentId = normalizeDocumentId(args.documentId);
        const path = documentPath(documentId);

        const file = await storage.getFile(conversationId, path);
        if (!file) {
          return {
            error: `No document "${documentId}" yet. Use create_document to author it first.`,
          };
        }

        markSeen(conversationId, path);
        clearPatchFailure(conversationId, path);

        const numbered = truncateContent(file.content)
          .split("\n")
          .map((l, i) => `${i + 1}: ${l}`)
          .join("\n");
        return { documentId, source: numbered };
      } catch (err) {
        logError("read_document failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to read document: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };

  const patchDocumentTool: ToolConfig = {
    type: "function",
    function: PATCH_DOCUMENT_SCHEMA,
    executor: async (args: Record<string, unknown>) => {
      try {
        const conversationId = requireConversationId();
        const documentId = normalizeDocumentId(args.documentId);
        const path = documentPath(documentId);
        const patches = args.patches as Array<{ find: string; replace: string }>;

        if (!Array.isArray(patches) || patches.length === 0) {
          return { error: "patches array is required and must not be empty" };
        }

        const existing = await storage.getFile(conversationId, path);
        if (!existing) {
          return { error: `No document "${documentId}" to patch. Use create_document first.` };
        }
        if (!hasBeenSeen(conversationId, path)) {
          return {
            error: `Call read_document for "${documentId}" first. You cannot patch a document whose current source you have not seen in this conversation.`,
          };
        }

        const { content, appliedCount, failed } = applyPatches(existing.content, patches);

        if (failed.length > 0) {
          const allNotFound = failed.every((f) => f.reason === "not_found");
          const failureCount = allNotFound
            ? bumpPatchFailure(conversationId, path)
            : (patchFailuresByConv.get(conversationId)?.get(path) ?? 0);

          if (allNotFound && failureCount >= PATCH_FAILURE_THRESHOLD) {
            return {
              success: false,
              documentId,
              applied: 0,
              failed: failed.length,
              failedPatches: failed,
              message: `patch_document has failed ${failureCount} times in a row. Your "find" strings do not match the actual source. STOP retrying — call read_document for "${documentId}" to see the current source, then write new patches using exact text from it.`,
            };
          }

          const failedPatches = failed.map((f) => {
            if (f.reason !== "not_found") return f;
            const snippet = snippetForFailedPatch(existing.content, f.find);
            return snippet ? { ...f, snippet } : f;
          });
          const hasAmbiguous = failed.some((f) => f.reason === "ambiguous");
          const notFoundCount = failed.filter((f) => f.reason === "not_found").length;
          const messageParts = [
            `${failed.length} of ${patches.length} patches did not apply. Document NOT modified.`,
          ];
          if (hasAmbiguous) {
            messageParts.push(
              `Ambiguous patches matched multiple locations (see matchLines) — add 2-3 lines of surrounding context so the "find" is unique.`
            );
          }
          if (notFoundCount > 0) {
            messageParts.push(
              `For patches not found: each carries a numbered snippet near the closest match; line numbers are display-only and must not appear in your "find".`
            );
          }
          return {
            success: false,
            documentId,
            applied: 0,
            failed: failed.length,
            failedPatches,
            message: messageParts.join(" "),
          };
        }

        // Re-validate the patched source before persisting, so a patch that
        // produces an invalid tree gives line:col feedback instead of a
        // downstream render failure.
        const validationError = validateOrError(content);
        if (validationError) {
          const dslError = validationError.dslError as { line?: number } | undefined;
          return {
            success: false,
            documentId,
            applied: 0,
            ...validationError,
            ...(dslError?.line
              ? {
                  proposedSnippet: snippetAroundLine(
                    content,
                    dslError.line,
                    SNIPPET_CONTEXT,
                    SNIPPET_CONTEXT
                  ),
                }
              : {}),
            message: `Patches produced an invalid document — see dslError. Document NOT modified; fix and retry.`,
          };
        }

        await storage.putFile(conversationId, path, content);
        markSeen(conversationId, path);
        clearPatchFailure(conversationId, path);

        // Persist happened above, then the host renders by reading the file
        // back. If rendering throws now, the patch is ALREADY applied and
        // saved — reporting a generic "Failed to patch document" would be a
        // lie and, because patches are non-idempotent, would tempt the model
        // to resend the same find/replace (which no longer matches). Report
        // the persisted state explicitly instead.
        try {
          const display = await triggerDocDisplay(documentId, path, undefined);
          return { success: true, documentId, applied: appliedCount, ...display };
        } catch (renderErr) {
          logError(
            "patch_document rendering failed after persist",
            renderErr instanceof Error ? renderErr : undefined
          );
          return {
            success: false,
            documentId,
            applied: appliedCount,
            persisted: true,
            renderError: renderErr instanceof Error ? renderErr.message : String(renderErr),
            message: `The patch was applied and the document source was saved — its "find" text no longer matches, so do NOT resend the same patch. Rendering the PDF failed: ${
              renderErr instanceof Error ? renderErr.message : String(renderErr)
            }. Call read_document for "${documentId}" to see the current source, then patch to fix the rendering problem.`,
          };
        }
      } catch (err) {
        logError("patch_document failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to patch document: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };

  return [createDocumentTool, readDocumentTool, patchDocumentTool];
}
