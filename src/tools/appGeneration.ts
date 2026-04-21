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
  description: `Modify, update, or edit an existing file in the app project using targeted find-and-replace patches. Use this instead of create_file when making small changes to an app — color tweaks, text edits, styling updates, adding a few lines, fixing bugs, or updating components. The file must already exist.

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
  /** Optional executor for display_app. When provided, a display_app tool is included in the returned array. */
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

  const createFileTool: ToolConfig = {
    type: "function",
    function: CREATE_FILE_SCHEMA,
    executor: async (args: Record<string, unknown>) => {
      try {
        const conversationId = requireConversationId();
        const filesArg = args.files as Array<{ path: string; content: string }> | undefined;

        // Batch mode: files array
        if (Array.isArray(filesArg) && filesArg.length > 0) {
          const err = await writeBatch(storage, conversationId, filesArg);
          if (err) return { error: err };
          const paths = filesArg.map((f) => normalizePath(f.path));
          const allFiles = await storage.getFiles(conversationId);
          return {
            success: true,
            paths,
            message: `Created ${paths.join(", ")}`,
            projectFiles: allFiles.map((f) => f.path),
          };
        }

        // Single-file fallback
        const rawPath = args.path as string;
        const content = args.content as string;
        if (!rawPath || typeof rawPath !== "string") return { error: "path is required" };
        if (typeof content !== "string") return { error: "content is required" };
        const path = normalizePath(rawPath);
        await storage.putFile(conversationId, path, content);
        const allFiles = await storage.getFiles(conversationId);
        return {
          success: true,
          path,
          message: `Created ${path}`,
          projectFiles: allFiles.map((f) => f.path),
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

        return { success: true, path: filePath, applied: applied.length };
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
        return { success: true, path, message: `Deleted ${path}` };
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

  const tools: ToolConfig[] = [
    createFileTool,
    patchFileTool,
    deleteFileTool,
    readFileTool,
    listFilesTool,
  ];

  if (displayApp) {
    tools.push({
      type: "function",
      function: DISPLAY_APP_SCHEMA,
      executor: displayApp,
      dependsOn: ["create_file", "patch_file", "delete_file"],
    });
  }

  return tools;
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
2. To create a new app: use create_file with the "files" array to write ALL files in a single call, then call display_app.
3. For ALL changes to existing files — including adding new features — use patch_file. This applies to style tweaks, text edits, AND adding new code.
   - To modify: find the old code, replace with new code.
   - To insert: find the code before the insertion point, replace with that code plus the new code appended.
   - To delete: find the code to remove, replace with empty string.
   - Include 2-3 lines of surrounding context in "find" to ensure a unique match.
   - Use multiple patches in one call to change several locations in the same file.
4. Only use create_file to rewrite a file when the majority of lines are changing.
5. After patching, call display_app.
6. Keep text responses to one or two sentences.

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
