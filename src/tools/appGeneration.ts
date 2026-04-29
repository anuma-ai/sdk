/**
 * App generation tools for multi-file app development.
 *
 * Provides create_file, patch_file, delete_file, read_file, list_files, and
 * display_app tool configurations, plus the system prompt that drives LLM
 * behavior. The tools operate on a pluggable storage backend so consumers
 * can wire them to IndexedDB, an in-memory Map, a database, or any other
 * persistence layer.
 *
 * @example
 * ```typescript
 * import { createAppGenerationTools, buildAppSystemPrompt } from "@anuma/sdk/tools";
 *
 * const tools = createAppGenerationTools({
 *   getConversationId: () => currentConversationId,
 *   storage: myStorageAdapter,
 * });
 * ```
 */

import { parse as babelParse } from "@babel/parser";

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import { normalizePath } from "../utils/paths.js";

// ---------------------------------------------------------------------------
// Storage interface
// ---------------------------------------------------------------------------

/** Minimal file record returned by storage operations. */
export interface AppFileRecord {
  path: string;
  content: string;
}

/**
 * Pluggable storage backend for app files.
 * Consumers provide an implementation backed by IndexedDB, a Map, etc.
 */
export interface AppFileStorage {
  getFile: (conversationId: string, path: string) => Promise<AppFileRecord | null>;
  getFiles: (conversationId: string) => Promise<AppFileRecord[]>;
  putFile: (conversationId: string, path: string, content: string) => Promise<void>;
  putFiles: (
    conversationId: string,
    files: Array<{ path: string; content: string }>
  ) => Promise<void>;
  deleteFile: (conversationId: string, path: string) => Promise<void>;
}

// Re-export so existing consumers of normalizePath from this module keep working.
export { normalizePath } from "../utils/paths.js";

// ---------------------------------------------------------------------------
// Result size management
// ---------------------------------------------------------------------------

/** Max characters for file content in tool results sent back to the LLM. */
const MAX_CONTENT_CHARS = 4000;

/**
 * Truncate file content for inclusion in tool results.
 * Keeps the first and last portions so the LLM has both the beginning
 * (imports, declarations) and end (exports, closing tags) of the file.
 */
export function truncateContent(content: string): string {
  if (content.length <= MAX_CONTENT_CHARS) return content;
  const half = Math.floor(MAX_CONTENT_CHARS / 2);
  const head = content.slice(0, half);
  const tail = content.slice(-half);
  const omitted = content.length - MAX_CONTENT_CHARS;
  return `${head}\n\n... (${omitted} characters omitted) ...\n\n${tail}`;
}

// ---------------------------------------------------------------------------
// Patch logic
// ---------------------------------------------------------------------------

/** Apply find/replace patches to a string. Returns patched content + results. */
export function applyPatches(
  content: string,
  patches: Array<{ find: string; replace: string }>
): { content: string; applied: string[]; failed: string[] } {
  let result = content;
  const applied: string[] = [];
  const failed: string[] = [];
  for (const patch of patches) {
    if (!patch.find || typeof patch.find !== "string") {
      failed.push("(empty find string)");
      continue;
    }
    if (result.includes(patch.find)) {
      // Intentionally replaces only the first match — the LLM should provide
      // enough surrounding context in "find" to target a unique location.
      result = result.replace(patch.find, () => patch.replace ?? "");
      applied.push(patch.find.slice(0, 40));
    } else {
      failed.push(patch.find.slice(0, 40));
    }
  }
  return { content: result, applied, failed };
}

// ---------------------------------------------------------------------------
// Pre-persist content validation
// ---------------------------------------------------------------------------

/** File extensions we run through the JS/TS/JSX parser. The `jsx` plugin is
 *  permissive — it accepts plain JS as well — so we use it for every flavour
 *  here; the `typescript` plugin is added on top for `.ts` / `.tsx`. */
const JS_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);

/** File extensions we validate as JSON. */
const JSON_EXTENSIONS = new Set([".json"]);

/** Structured syntax error pinpointing the failure for the LLM to retry. */
export interface FileValidationError {
  line: number;
  column: number;
  message: string;
}

/**
 * Validate that file content is syntactically parseable for its
 * extension. JS / JSX / TS / TSX go through Babel; JSON goes through
 * `JSON.parse`; every other extension is treated as opaque (returns
 * `null` — no validation).
 *
 * Returns `null` when valid, otherwise a structured error with
 * 1-based line + 0-based column. The LLM uses these to retry a patch
 * or correct a freshly-written file without bouncing through the
 * Sandpack bundler.
 */
export function validateFileContent(
  path: string,
  content: string
): FileValidationError | null {
  const lower = path.toLowerCase();
  const dotIdx = lower.lastIndexOf(".");
  if (dotIdx === -1) return null;
  const ext = lower.slice(dotIdx);
  if (JS_EXTENSIONS.has(ext)) return validateJsLike(content, ext);
  if (JSON_EXTENSIONS.has(ext)) return validateJson(content);
  return null;
}

function validateJsLike(content: string, ext: string): FileValidationError | null {
  // Empty file is valid (an empty module).
  if (content.length === 0) return null;
  const plugins: ("jsx" | "typescript")[] = ["jsx"];
  if (ext === ".ts" || ext === ".tsx") plugins.push("typescript");
  try {
    babelParse(content, { sourceType: "module", plugins });
    return null;
  } catch (err) {
    return babelErrorToValidation(err);
  }
}

function babelErrorToValidation(err: unknown): FileValidationError {
  const e = err as { message?: unknown; loc?: { line?: unknown; column?: unknown } };
  const line = typeof e.loc?.line === "number" ? e.loc.line : 1;
  const column = typeof e.loc?.column === "number" ? e.loc.column : 0;
  // Babel includes the "(line:col)" suffix in its message — strip it so
  // we don't render the position twice in tool error output.
  const raw = typeof e.message === "string" ? e.message : "Parse error";
  const message = raw.replace(/\s*\(\d+:\d+\)\s*$/, "");
  return { line, column, message };
}

function validateJson(content: string): FileValidationError | null {
  if (content.trim().length === 0) return null;
  try {
    JSON.parse(content);
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON";
    // Modern Node embeds `position N` in the SyntaxError message. Map it
    // back to (line, column) so the LLM gets the same shape as Babel
    // errors. Older runtimes / fallbacks land at 1:0.
    const posMatch = /position\s+(\d+)/i.exec(message);
    if (posMatch?.[1]) {
      const pos = Number(posMatch[1]);
      const before = content.slice(0, pos);
      const lines = before.split("\n");
      const lastLine = lines[lines.length - 1] ?? "";
      return { line: lines.length, column: lastLine.length, message };
    }
    return { line: 1, column: 0, message };
  }
}

// ---------------------------------------------------------------------------
// Tool name constants
// ---------------------------------------------------------------------------

/** Tool names for app file operations (create, patch, delete, read, list). */
export const APP_FILE_TOOL_NAMES: ReadonlySet<string> = Object.freeze(
  new Set(["create_file", "patch_file", "delete_file", "read_file", "list_files"])
);

// ---------------------------------------------------------------------------
// In-memory storage implementation
// ---------------------------------------------------------------------------

/**
 * In-memory `AppFileStorage` backed by a `Map<string, string>`.
 *
 * Useful for server-side consumers (Cloudflare Workers, Node.js) that manage
 * their own persistence. The `conversationId` parameter is ignored — all
 * operations target the single internal map.
 *
 * @example
 * ```typescript
 * const storage = new MapFileStorage();
 * const tools = createAppGenerationTools({
 *   getConversationId: () => "task-1",
 *   storage,
 * });
 * // After tool execution, read the files:
 * const files = storage.getAll(); // Map<string, string>
 * ```
 */
export class MapFileStorage implements AppFileStorage {
  private files: Map<string, string>;

  constructor(initial?: Map<string, string>) {
    this.files = initial ? new Map(initial) : new Map<string, string>();
  }

  getFile(_conversationId: string, path: string): Promise<AppFileRecord | null> {
    const content = this.files.get(path);
    return Promise.resolve(content !== undefined ? { path, content } : null);
  }

  getFiles(_conversationId: string): Promise<AppFileRecord[]> {
    return Promise.resolve(
      Array.from(this.files.entries()).map(([path, content]) => ({ path, content }))
    );
  }

  putFile(_conversationId: string, path: string, content: string): Promise<void> {
    this.files.set(path, content);
    return Promise.resolve();
  }

  putFiles(
    _conversationId: string,
    files: Array<{ path: string; content: string }>
  ): Promise<void> {
    for (const f of files) this.files.set(f.path, f.content);
    return Promise.resolve();
  }

  deleteFile(_conversationId: string, path: string): Promise<void> {
    this.files.delete(path);
    return Promise.resolve();
  }

  /** Direct access to the underlying map. */
  getAll(): Map<string, string> {
    return this.files;
  }

  /** Number of files stored. */
  get size(): number {
    return this.files.size;
  }

  /** Serialize to JSON for persistence (e.g. Durable Object storage). */
  serialize(): string {
    return JSON.stringify(Array.from(this.files.entries()));
  }

  /** Restore from a previously serialized JSON string. */
  static deserialize(json: string | undefined | null): MapFileStorage {
    if (!json) return new MapFileStorage();
    return new MapFileStorage(new Map(JSON.parse(json) as Array<[string, string]>));
  }
}

// ---------------------------------------------------------------------------
// Tool schemas (name, description, parameters — no executors)
// ---------------------------------------------------------------------------

export const CREATE_FILE_SCHEMA = {
  name: "create_file",
  description: `Creates or overwrites files in the app project. ALWAYS use this tool when the user asks to create any visual, interactive app, demo, diagram, game, simulation, UI mockup, dashboard, tracker, or data visualization. NEVER output code as text. A live preview appears automatically.

Supports two modes:
- Single file: pass "path" and "content".
- Batch (preferred): pass "files" array with {path, content} objects to write all files in one call.

WORKFLOW: Call create_file once with all files (package.json, App.js, styles, etc.), then call display_app.

App.js must be a default export React component. Do NOT create index.js or index.html — these are auto-generated. Use standard import statements for all libraries. NEVER use CDN script tags — instead list dependencies in package.json. Example package.json: {"dependencies": {"chart.js": "^4.4.0", "react-chartjs-2": "^5.2.0"}}

DESIGN: Visually polished apps with modern aesthetics, generous whitespace, readable typography, cohesive colors, and responsive layouts.`,
  arguments: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path (single-file mode)" },
      content: { type: "string", description: "File content (single-file mode)" },
      files: {
        type: "array",
        description:
          'Array of files to write in one batch (preferred). Each item: {"path": "App.js", "content": "..."}',
        items: {
          type: "object",
          properties: { path: { type: "string" }, content: { type: "string" } },
          required: ["path", "content"],
        },
      },
    },
  },
} as const;

export const PATCH_FILE_SCHEMA = {
  name: "patch_file",
  description: `Applies targeted find-and-replace patches to an existing file. Use this instead of create_file when making small changes (color tweaks, text edits, adding a few lines). The file must already exist.

Pass a "patches" array where each item has "find" (exact string to locate) and "replace" (replacement string). Patches are applied in order. The find string must match exactly — include enough surrounding context (2-3 lines) to be unique.`,
  arguments: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path to patch" },
      patches: {
        type: "array",
        description: "Array of find/replace operations",
        items: {
          type: "object",
          properties: {
            find: { type: "string", description: "Exact string to find in the file" },
            replace: { type: "string", description: "Replacement string" },
          },
          required: ["find", "replace"],
        },
      },
    },
    required: ["path", "patches"],
  },
} as const;

export const DELETE_FILE_SCHEMA = {
  name: "delete_file",
  description: "Deletes a file from the app project.",
  arguments: {
    type: "object",
    properties: { path: { type: "string", description: "File path to delete" } },
    required: ["path"],
  },
} as const;

export const READ_FILE_SCHEMA = {
  name: "read_file",
  description:
    "Reads the content of a file from the app project. Use this to inspect existing files before making changes.",
  arguments: {
    type: "object",
    properties: { path: { type: "string", description: "File path to read" } },
    required: ["path"],
  },
} as const;

export const LIST_FILES_SCHEMA = {
  name: "list_files",
  description:
    "Lists all files in the app project. Returns file paths and sizes. Use this to understand the current project structure.",
  arguments: { type: "object", properties: {}, required: [] },
} as const;

export const DISPLAY_APP_SCHEMA = {
  name: "display_app",
  description:
    "Renders the app preview from the current saved files. This does NOT modify files — you must call patch_file or create_file first to make changes, then call display_app to show the updated result.",
  arguments: {
    type: "object",
    properties: { title: { type: "string", description: "Short title for the app" } },
    required: ["title"],
  },
} as const;

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export interface CreateAppGenerationToolsOptions {
  /** Returns the current conversation ID (may be null before first message). */
  getConversationId: () => string | null;
  /** Storage backend for file operations. */
  storage: AppFileStorage;
  /** Optional error logger. Falls back to console.error. */
  logError?: (message: string, error?: Error) => void;
  /**
   * Optional host callback that renders / refreshes the app preview in
   * the chat UI. When provided, it's invoked automatically after every
   * successful create_file / patch_file / delete_file — the model
   * never needs to call a separate display tool. Mirrors the
   * `displaySlides` pattern in `createSlideTools`.
   *
   * The callback receives `{ title?, replaces_interaction_id? }` and
   * should return `{ interaction_id, title? }` so subsequent calls can
   * thread `replaces_interaction_id` and fold updates onto the same card.
   */
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- intentional: allows synchronous return values
  displayApp?: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

/** Validate and write a batch of files. Returns an error string or null on success. */
async function writeBatch(
  storage: AppFileStorage,
  conversationId: string,
  files: Array<{ path: string; content: string }>
): Promise<string | null> {
  for (const f of files) {
    if (!f.path || typeof f.path !== "string") return "Each file needs a path";
    if (typeof f.content !== "string") return `Missing content for ${f.path}`;
  }
  await storage.putFiles(
    conversationId,
    files.map((f) => ({ path: normalizePath(f.path), content: f.content }))
  );
  return null;
}

/**
 * Run `validateFileContent` against every file in a batch, returning a
 * flat list of `{ path, line, column, message }` for the LLM to fix.
 * Files with non-string `path` / `content` are skipped here — `writeBatch`
 * will reject those with its own error message.
 */
function collectValidationErrors(
  files: Array<{ path: string; content: string }>
): Array<{ path: string; line: number; column: number; message: string }> {
  const errors: Array<{ path: string; line: number; column: number; message: string }> = [];
  for (const f of files) {
    if (typeof f.path !== "string" || typeof f.content !== "string") continue;
    const ve = validateFileContent(f.path, f.content);
    if (ve) {
      errors.push({
        path: normalizePath(f.path),
        line: ve.line,
        column: ve.column,
        message: ve.message,
      });
    }
  }
  return errors;
}

/**
 * Creates the suite of app generation tools (create_file, patch_file, delete_file,
 * read_file, list_files) backed by the provided storage adapter.
 */
export function createAppGenerationTools({
  getConversationId,
  storage,
  logError = (msg, err) => console.error(msg, err),
  displayApp,
}: CreateAppGenerationToolsOptions): ToolConfig[] {
  function requireConversationId(): string {
    const id = getConversationId();
    if (!id) throw new Error("No active conversation");
    return id;
  }

  // Per-conversation display state. Mirrors `deckStateByConv` in the
  // slide tools: tracks the most recent interaction id (so we can pass
  // `replaces_interaction_id` on the next refresh) and the cached title
  // (so explicit titles set by an earlier call survive subsequent
  // file-only edits).
  interface AppDisplayState {
    interactionId: string;
    title: string;
  }
  const appStateByConv = new Map<string, AppDisplayState>();

  /**
   * Invoke the host's `displayApp` callback with cached state, fold
   * the reply back into per-conversation state, AND return it to the
   * caller so executors can spread it into their tool result. Without
   * the spread, the persisted tool-result message has no `displayType`
   * field and the chat renderer skips it. Mirrors the slide pattern.
   *
   * Returns `{}` when no callback was provided or it threw — display
   * is a UX concern, not a correctness one, and a failed render
   * shouldn't make the underlying file operation look like it failed.
   */
  async function triggerAppDisplay(
    conversationId: string,
    hint?: { title?: string }
  ): Promise<Record<string, unknown>> {
    if (!displayApp) return {};
    const cached = appStateByConv.get(conversationId);
    const args: Record<string, unknown> = {};
    if (hint?.title) args.title = hint.title;
    else if (cached?.title) args.title = cached.title;
    if (cached?.interactionId) args.replaces_interaction_id = cached.interactionId;
    try {
      const reply = await displayApp(args);
      if (!reply || typeof reply !== "object") return {};
      const r = reply as { interaction_id?: unknown; title?: unknown };
      const newId = typeof r.interaction_id === "string" ? r.interaction_id : undefined;
      const newTitle = typeof r.title === "string" ? r.title : undefined;
      if (newId) {
        appStateByConv.set(conversationId, {
          interactionId: newId,
          title: newTitle ?? cached?.title ?? hint?.title ?? "App",
        });
      }
      return reply as Record<string, unknown>;
    } catch (err) {
      logError("displayApp callback failed", err instanceof Error ? err : undefined);
      return {};
    }
  }

  const createFileTool: ToolConfig = {
    type: "function",
    function: CREATE_FILE_SCHEMA,
    executor: async (args: Record<string, unknown>) => {
      try {
        const conversationId = requireConversationId();
        const filesArg = args.files as Array<{ path: string; content: string }> | undefined;

        // Batch mode: files array
        if (Array.isArray(filesArg) && filesArg.length > 0) {
          // Validate every file's syntax before any write — atomic so a
          // single broken file doesn't leave half the project committed.
          const validationErrors = collectValidationErrors(filesArg);
          if (validationErrors.length > 0) {
            return {
              error: `Validation failed: ${validationErrors.length} file(s) had syntax errors. Fix and retry — nothing was written.`,
              validationErrors,
            };
          }
          const err = await writeBatch(storage, conversationId, filesArg);
          if (err) return { error: err };
          const paths = filesArg.map((f) => normalizePath(f.path));
          const allFiles = await storage.getFiles(conversationId);
          const display = await triggerAppDisplay(conversationId);
          return {
            success: true,
            paths,
            message: `Created ${paths.join(", ")}`,
            projectFiles: allFiles.map((f) => f.path),
            ...display,
          };
        }

        // Single-file fallback
        const rawPath = args.path as string;
        const content = args.content as string;
        if (!rawPath || typeof rawPath !== "string") return { error: "path is required" };
        if (typeof content !== "string") return { error: "content is required" };
        const path = normalizePath(rawPath);
        const ve = validateFileContent(path, content);
        if (ve) {
          return {
            error: `Syntax error in ${path} at ${ve.line}:${ve.column}: ${ve.message}. File NOT written — fix and retry.`,
            path,
            line: ve.line,
            column: ve.column,
            message: ve.message,
          };
        }
        await storage.putFile(conversationId, path, content);
        const allFiles = await storage.getFiles(conversationId);
        const display = await triggerAppDisplay(conversationId);
        return {
          success: true,
          path,
          message: `Created ${path}`,
          projectFiles: allFiles.map((f) => f.path),
          ...display,
        };
      } catch (err) {
        logError("create_file failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to create file: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };

  const patchFileTool: ToolConfig = {
    type: "function",
    function: PATCH_FILE_SCHEMA,
    executor: async (args: Record<string, unknown>) => {
      try {
        const conversationId = requireConversationId();
        const rawPath = args.path as string;
        const patches = args.patches as Array<{ find: string; replace: string }>;

        if (!rawPath || typeof rawPath !== "string") return { error: "path is required" };
        const filePath = normalizePath(rawPath);
        if (!Array.isArray(patches) || patches.length === 0) {
          return { error: "patches array is required and must not be empty" };
        }

        const existing = await storage.getFile(conversationId, filePath);
        if (!existing) return { error: `File not found: ${filePath}. Use create_file instead.` };

        const { content, applied, failed } = applyPatches(existing.content, patches);

        // Syntax-check the proposed content before persisting. A patch
        // that produces broken JSX (e.g. removed a `}` but left the `{`)
        // would otherwise land in storage, fail at bundle time, and force
        // the model to debug a runtime error. Refusing to persist gives
        // the model immediate `line:col` feedback instead.
        const syntaxError = validateFileContent(filePath, content);
        if (syntaxError) {
          return {
            success: false,
            path: filePath,
            applied: applied.length,
            failed: failed.length,
            failedPatches: failed,
            syntaxError: {
              line: syntaxError.line,
              column: syntaxError.column,
              message: syntaxError.message,
            },
            currentContent: truncateContent(existing.content),
            proposedContent: truncateContent(content),
            message: `Patches produced syntax error at ${syntaxError.line}:${syntaxError.column}: ${syntaxError.message}. File NOT modified — read currentContent and retry.`,
          };
        }

        // Save the partially-patched file even when some patches fail so the
        // LLM can see the current content and retry only the failed ones.
        await storage.putFile(conversationId, filePath, content);

        if (failed.length > 0) {
          return {
            success: false,
            path: filePath,
            applied: applied.length,
            failed: failed.length,
            failedPatches: failed,
            currentContent: truncateContent(content),
          };
        }

        const display = await triggerAppDisplay(conversationId);
        return { success: true, path: filePath, applied: applied.length, ...display };
      } catch (err) {
        logError("patch_file failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to patch file: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };

  const deleteFileTool: ToolConfig = {
    type: "function",
    function: DELETE_FILE_SCHEMA,
    executor: async (args: Record<string, unknown>) => {
      try {
        const conversationId = requireConversationId();
        const rawPath = args.path as string;

        if (!rawPath || typeof rawPath !== "string") return { error: "path is required" };
        const path = normalizePath(rawPath);

        await storage.deleteFile(conversationId, path);
        const display = await triggerAppDisplay(conversationId);
        return { success: true, path, message: `Deleted ${path}`, ...display };
      } catch (err) {
        logError("delete_file failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to delete file: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };

  const readFileTool: ToolConfig = {
    type: "function",
    function: READ_FILE_SCHEMA,
    executor: async (args: Record<string, unknown>) => {
      try {
        const conversationId = requireConversationId();
        const rawPath = args.path as string;

        if (!rawPath || typeof rawPath !== "string") return { error: "path is required" };
        const path = normalizePath(rawPath);

        const file = await storage.getFile(conversationId, path);
        if (!file) return { error: `File not found: ${path}` };

        return { path: file.path, content: truncateContent(file.content) };
      } catch (err) {
        logError("read_file failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };

  const listFilesTool: ToolConfig = {
    type: "function",
    function: LIST_FILES_SCHEMA,
    executor: async () => {
      try {
        const conversationId = requireConversationId();
        const files = await storage.getFiles(conversationId);

        return {
          files: files.map((f) => ({
            path: f.path,
            size: new TextEncoder().encode(f.content).length,
          })),
        };
      } catch (err) {
        logError("list_files failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to list files: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };

  // No standalone display_app tool — display happens automatically
  // from inside create_file / patch_file / delete_file via the
  // `displayApp` callback. Mirrors `createSlideTools`, which has no
  // `display_slides` tool either; the deck viewer is opened from
  // within `plan_deck` / `add_slide` / `patch_slides`.
  return [createFileTool, patchFileTool, deleteFileTool, readFileTool, listFilesTool];
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

/**
 * Build the app builder mode system prompt.
 *
 * @deprecated Use `buildSystemPrompt` with the "app-builder" persona instead.
 * Fetch the persona via the API and pass `config.prompt` as `basePrompt`:
 * ```
 * import { buildSystemPrompt } from "@anuma/sdk";
 * const { prompt } = buildSystemPrompt({ basePrompt: persona.config.prompt });
 * ```
 */
export function buildAppSystemPrompt(): string {
  return `You are in App Builder mode. You produce polished, production-quality React apps.

WORKFLOW:
1. NEVER output code as text or markdown. ALWAYS use tools.
2. To create a new app: use create_file with the "files" array to write ALL files in a single call. The preview renders automatically — there is no separate display tool to call.
3. For ALL changes to existing files — including adding new features — use patch_file. This applies to style tweaks, text edits, AND adding new code.
   - To modify: find the old code, replace with new code.
   - To insert: find the code before the insertion point, replace with that code plus the new code appended.
   - To delete: find the code to remove, replace with empty string.
   - Include 2-3 lines of surrounding context in "find" to ensure a unique match.
   - Use multiple patches in one call to change several locations in the same file.
4. Only use create_file to rewrite a file when the majority of lines are changing.
5. Keep text responses to one or two sentences.

STRUCTURE:
- App.js: default-export React component. Do NOT create index.js or index.html (auto-generated).
- App.css: all styles in a separate file, imported in App.js. No inline style objects.
- package.json: list ALL imported packages including react. No CDN script tags. Versions are auto-pinned.

CODE QUALITY — write code as a senior engineer would:
- Handle edge cases: empty inputs, division by zero, invalid data. Show helpful error states, not crashes.
- Use semantic HTML: proper headings, labels, buttons (not divs with onClick), form elements.
- Make it accessible: aria-labels on icon buttons, focus-visible styles, keyboard navigable.
- Keep components clean: extract logic into custom hooks or helpers when a component grows beyond ~80 lines.

VISUAL DESIGN — every app should look like a real product:
- Layout: center the main content, max-width container, generous padding (2rem+). Use CSS Grid or Flexbox.
- Typography: system font stack, clear hierarchy (larger/bolder headings, muted secondary text), comfortable line-height (1.5+).
- Colors: use a cohesive palette with CSS custom properties (--color-primary, --color-bg, etc.). Support both light backgrounds and subtle dark accents. Avoid raw hex in component styles.
- Depth: subtle box-shadows on cards (0 2px 12px rgba(0,0,0,0.08)), rounded corners (8-12px), borders only where needed.
- Interactivity: hover/active states on all clickable elements, smooth transitions (0.2s ease), focus rings for keyboard users.
- Spacing: consistent gaps between elements. When in doubt, add more whitespace.
- Responsive: use relative units (rem, %), media queries for mobile (<640px).`;
}
