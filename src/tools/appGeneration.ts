/**
 * App generation tools for multi-file app development.
 *
 * Provides create_file, patch_file, delete_file, read_file, and list_files
 * tool configurations, plus the system prompt that drives LLM behavior.
 * The tools operate on a pluggable storage backend so consumers can wire
 * them to IndexedDB, an in-memory Map, a database, or any other
 * persistence layer.
 *
 * App preview rendering is automatic: every successful create_file /
 * patch_file / delete_file invokes the host's optional `displayApp`
 * callback so the chat UI refreshes the same preview card in place. There
 * is no standalone `display_app` tool — mirrors the slide pipeline, where
 * `add_slide` and `patch_slides` self-render via `displaySlides`.
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
// Snippet extraction (failure context)
// ---------------------------------------------------------------------------

/** Numbered slice of file content surrounding a point of interest. */
export interface FileSnippet {
  startLine: number;
  endLine: number;
  content: string;
}

/** Minimum line length to qualify as a fuzzy-locate anchor. Short lines
 *  (`}`, `)`, `;`) appear everywhere and produce noisy matches. */
const ANCHOR_MIN_LENGTH = 8;

/** Lines starting with these tags appear in nearly every React app's icon
 *  markup and are poor anchors: a long `<svg viewBox="0 0 24 24" ...>` will
 *  match the header icon even when the model intended to edit a button.
 *  We try non-SVG candidates first and only fall back to these when nothing
 *  else anchors — and in that case the match is marked low-confidence. */
const NOISY_MARKUP_RE =
  /^<(svg|path|circle|rect|polygon|polyline|line|ellipse|g|defs|use|symbol|stop|linearGradient|radialGradient)\b/i;

function isNoisyMarkup(line: string): boolean {
  return NOISY_MARKUP_RE.test(line.trim());
}

/** Result of fuzzy-locating where a failed `find` was probably targeting.
 *  `high` confidence means a non-noisy line matched; `low` means only a
 *  generic markup line (e.g. SVG header) matched and the snippet would
 *  likely mislead the model. */
export interface AnchorMatch {
  line: number;
  confidence: "high" | "low";
}

/**
 * Locate the most likely line in `content` that the failed `find` was
 * targeting. Two-pass strategy:
 *
 *   1. Try non-noisy candidates from `find`, longest first. If one
 *      appears in the file, return its line as `high` confidence.
 *   2. If nothing in pass 1 matched, repeat over ALL candidates
 *      (including SVG/icon markup). Mark the match as `low` confidence
 *      so callers can omit a misleading snippet.
 *
 * Returns `null` when no candidate line — noisy or not — appears in
 * the file. Typical for fully hallucinated patches.
 */
export function findBestAnchor(content: string, find: string): AnchorMatch | null {
  const candidates = find
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= ANCHOR_MIN_LENGTH)
    .sort((a, b) => b.length - a.length);

  if (candidates.length === 0) return null;

  const contentLines = content.split("\n");

  for (const candidate of candidates) {
    if (isNoisyMarkup(candidate)) continue;
    const idx = contentLines.findIndex((l) => l.includes(candidate));
    if (idx !== -1) return { line: idx + 1, confidence: "high" };
  }

  for (const candidate of candidates) {
    const idx = contentLines.findIndex((l) => l.includes(candidate));
    if (idx !== -1) return { line: idx + 1, confidence: "low" };
  }

  return null;
}

/**
 * Format a region of file content with 1-based line numbers, e.g.:
 *   42:   const foo = bar;
 *   43:   return foo;
 *
 * `before` and `after` count lines around `anchorLine` (1-based). The
 * range is clamped to the file bounds.
 */
export function snippetAroundLine(
  content: string,
  anchorLine: number,
  before: number,
  after: number
): FileSnippet {
  const lines = content.split("\n");
  const startLine = Math.max(1, anchorLine - before);
  const endLine = Math.min(lines.length, anchorLine + after);
  const numbered = lines
    .slice(startLine - 1, endLine)
    .map((l, i) => `${startLine + i}: ${l}`)
    .join("\n");
  return { startLine, endLine, content: numbered };
}

/** Lines of context to include before and after the anchor in a snippet. */
const SNIPPET_CONTEXT = 8;

/** Number of consecutive patch_file match failures on the same file before
 *  the executor stops returning snippets and demands a read_file. Failing
 *  twice in a row is strong evidence the model's mental model of the file
 *  is wrong — more snippets won't help; it needs fresh content. */
const PATCH_FAILURE_THRESHOLD = 2;

/**
 * Pick a focused region of the file to show alongside a failed patch.
 * Returns `null` when the best anchor is either missing or low-confidence
 * (only generic markup like a `<svg>` line matched). A null snippet is
 * the executor's cue to nudge the model toward `read_file` instead of
 * showing potentially misleading context.
 */
export function snippetForFailedPatch(content: string, find: string): FileSnippet | null {
  const anchor = findBestAnchor(content, find);
  if (anchor === null || anchor.confidence === "low") return null;
  return snippetAroundLine(content, anchor.line, SNIPPET_CONTEXT, SNIPPET_CONTEXT);
}

// ---------------------------------------------------------------------------
// Patch logic
// ---------------------------------------------------------------------------

/** Strip leading "42: " line-number prefixes from every line if (and
 *  only if) every non-empty line carries one. Used as a fallback in
 *  applyPatches so the model can paste numbered read_file output as
 *  a find string without manually stripping. */
function stripLineNumberPrefixes(s: string): string {
  const lines = s.split("\n");
  const prefix = /^\d+:\s/;
  if (lines.every((l) => l === "" || prefix.test(l))) {
    return lines.map((l) => l.replace(prefix, "")).join("\n");
  }
  return s;
}

/** Reason a single patch did not apply. */
export type PatchFailureReason = "empty_find" | "not_found" | "ambiguous";

/** Details for a patch that did not apply, indexed against the input array.
 *  `matchLines` is populated only for `reason: "ambiguous"` — the 1-based
 *  line numbers where the find string starts in the file. */
export interface PatchFailure {
  index: number;
  find: string;
  reason: PatchFailureReason;
  matchLines?: number[];
}

/** Count non-overlapping occurrences of `needle` in `haystack`. */
function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  while (true) {
    const idx = haystack.indexOf(needle, pos);
    if (idx === -1) return count;
    count++;
    pos = idx + needle.length;
  }
}

/** Return the 1-based line numbers where `needle` starts in `haystack`,
 *  in document order. Non-overlapping. */
function findMatchLines(haystack: string, needle: string): number[] {
  if (!needle) return [];
  const lines: number[] = [];
  let pos = 0;
  while (true) {
    const idx = haystack.indexOf(needle, pos);
    if (idx === -1) return lines;
    // 1-based line = number of newlines before `idx`, plus 1.
    let newlines = 0;
    for (let i = 0; i < idx; i++) if (haystack.charCodeAt(i) === 10) newlines++;
    lines.push(newlines + 1);
    pos = idx + needle.length;
  }
}

/**
 * Apply find/replace patches to a string atomically.
 *
 * Either all patches apply, or none do — when any patch fails (no match,
 * empty find, or ambiguous match), the returned `content` equals the input
 * and `appliedCount` is 0. This prevents committing partial edits to disk
 * (e.g. a rename that succeeds in some call sites but not others).
 *
 * A `find` must match the file exactly once. Multiple matches surface as
 * `reason: "ambiguous"` so the model can disambiguate by adding context
 * rather than silently editing the first occurrence.
 *
 * Before declaring a `find` unmatched, the function tries two fallbacks:
 *   1. unescaping JSON whitespace literals (`\\n`, `\\t`, `\\r` as
 *      two-character backslash sequences → real newline/tab/CR);
 *   2. stripping leading "42: " line-number prefixes when every line of
 *      the find carries one (the model may have copied numbered output
 *      from read_file or a failure snippet verbatim).
 * Ambiguity is checked against whichever variant matches.
 *
 * Returned `failed` includes the full `find` string and its index in the
 * input array so the caller can map failures back to the original patches
 * without ambiguity.
 */
export function applyPatches(
  content: string,
  patches: Array<{ find: string; replace: string }>
): { content: string; appliedCount: number; failed: PatchFailure[] } {
  let result = content;
  let appliedCount = 0;
  const failed: PatchFailure[] = [];

  for (let index = 0; index < patches.length; index++) {
    const patch = patches[index];
    if (!patch || !patch.find || typeof patch.find !== "string") {
      failed.push({ index, find: patch.find ?? "", reason: "empty_find" });
      continue;
    }

    // Try the find string verbatim, then JSON-unescaped, then with line-
    // number prefixes stripped. First non-empty match wins; ambiguity in
    // any one of them is reported (not silently bypassed).
    const candidates: string[] = [patch.find];
    const unescaped = patch.find.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\r/g, "\r");
    if (unescaped !== patch.find) candidates.push(unescaped);
    const stripped = stripLineNumberPrefixes(patch.find);
    if (stripped !== patch.find && stripped !== unescaped) candidates.push(stripped);

    let resolved: { needle: string; count: number } | null = null;
    for (const c of candidates) {
      const count = countOccurrences(result, c);
      if (count > 0) {
        resolved = { needle: c, count };
        break;
      }
    }

    if (resolved === null) {
      failed.push({ index, find: patch.find, reason: "not_found" });
      continue;
    }

    if (resolved.count > 1) {
      failed.push({
        index,
        find: patch.find,
        reason: "ambiguous",
        matchLines: findMatchLines(result, resolved.needle),
      });
      continue;
    }

    result = result.replace(resolved.needle, () => patch.replace ?? "");
    appliedCount++;
  }

  if (failed.length > 0) {
    return { content, appliedCount: 0, failed };
  }
  return { content: result, appliedCount, failed: [] };
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
interface FileValidationError {
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
export function validateFileContent(path: string, content: string): FileValidationError | null {
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
  description: `Build a new app — a calculator, a game, a todo list, a form, a dashboard, a chart, a simulation, or another interactive demo. Writes files into the in-chat app project; the live preview renders automatically. Pass every file (App.js, App.css, package.json, ...) in a single call.

create_file creates new files and can also overwrite existing ones for substantial restructures. For overwrites, you must have called read_file for the path earlier in this conversation (or created it via create_file in the same conversation) — the tool refuses otherwise. For incremental changes, prefer patch_file: it's easier to review and preserves surrounding code unchanged.`,
  arguments: {
    type: "object",
    properties: {
      files: {
        type: "array",
        description: 'Files to write. Each item: {"path": "App.js", "content": "..."}',
        items: {
          type: "object",
          properties: { path: { type: "string" }, content: { type: "string" } },
          required: ["path", "content"],
        },
      },
    },
    required: ["files"],
  },
} as const;

export const PATCH_FILE_SCHEMA = {
  name: "patch_file",
  description: `Edit, modify, or update an existing file in the app project via find-and-replace. Use this instead of create_file when changing a few lines of an existing app — small edits, fixes, or component updates.

REQUIRED: you must call read_file (or create_file) for this path earlier in the conversation before calling patch_file. The tool refuses otherwise — you cannot patch a file whose current content you have not seen.

Pass a "patches" array of {find, replace} objects. Each "find" string must:
  - match the file exactly, character for character;
  - match EXACTLY ONE location — if your find appears multiple times, the patch is rejected as ambiguous. Include 2-3 lines of surrounding context to make it unique;
  - NOT include the "<n>: " line-number prefix from read_file output.`,
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
    'Reads the content of a file from the app project. Required before patch_file on any file whose content you have not just written via create_file. Returned content has "<lineNumber>: " prefixes for navigation — do not copy those prefixes into a patch_file "find" string.',
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

  // Per-(conversation, path) tally of consecutive patch_file match failures.
  // When this hits PATCH_FAILURE_THRESHOLD the executor stops returning
  // snippets and demands a read_file — observed thrashing pattern is the
  // model wholesale-hallucinating file contents and retrying with the
  // same wrong mental model, even with snippets in hand.
  const patchFailuresByConv = new Map<string, Map<string, number>>();
  function bumpPatchFailure(conversationId: string, path: string): number {
    let m = patchFailuresByConv.get(conversationId);
    if (!m) {
      m = new Map();
      patchFailuresByConv.set(conversationId, m);
    }
    const n = (m.get(path) ?? 0) + 1;
    m.set(path, n);
    return n;
  }
  function clearPatchFailure(conversationId: string, path: string): void {
    patchFailuresByConv.get(conversationId)?.delete(path);
  }

  // Per-conversation set of file paths whose current content the model
  // has seen — via a successful read_file or create_file. patch_file
  // refuses to operate on files not in this set, mirroring Claude Code's
  // "must Read before Edit" contract. Prevents the failure mode where
  // the model patches against a hallucinated copy of the file.
  const seenFilesByConv = new Map<string, Set<string>>();
  function markFileSeen(conversationId: string, path: string): void {
    let s = seenFilesByConv.get(conversationId);
    if (!s) {
      s = new Set();
      seenFilesByConv.set(conversationId, s);
    }
    s.add(path);
  }
  function hasFileBeenSeen(conversationId: string, path: string): boolean {
    return seenFilesByConv.get(conversationId)?.has(path) ?? false;
  }
  function forgetFileSeen(conversationId: string, path: string): void {
    seenFilesByConv.get(conversationId)?.delete(path);
  }

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

        if (!Array.isArray(filesArg) || filesArg.length === 0) {
          return { error: "files array is required and must not be empty" };
        }

        // Read-before-Write contract (mirrors Claude Code's Write tool):
        // create_file can overwrite existing files, but only when the
        // model has read them in this conversation. Drift across
        // iterations is mitigated naturally — once the model has the
        // file's literal content in context, it tends to preserve
        // tokens, structure, and naming when rewriting. Without a prior
        // read, the model would be regenerating from memory, and design
        // drift becomes likely.
        const normalizedPaths = filesArg.map((f) => normalizePath(f.path));
        const existsInStorage = await Promise.all(
          normalizedPaths.map((p) => storage.getFile(conversationId, p))
        );
        const unreadOverwrites = normalizedPaths.filter(
          (p, i) => existsInStorage[i] !== null && !hasFileBeenSeen(conversationId, p)
        );
        if (unreadOverwrites.length > 0) {
          return {
            error: `Cannot overwrite files you have not read in this conversation: ${unreadOverwrites.join(", ")}. Call read_file for each first — you need the current content in context so the rewrite preserves the existing design tokens, structure, and choices. For incremental changes, prefer patch_file over create_file.`,
            unreadOverwrites,
          };
        }

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
        // Model just wrote the content, so it has seen it. Subsequent
        // patch_file or create_file calls against these paths can
        // proceed without requiring a separate read_file.
        for (const p of paths) markFileSeen(conversationId, p);
        const display = await triggerAppDisplay(conversationId);
        return { success: true, paths, ...display };
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

        // Read-before-patch contract: refuse if the model hasn't seen
        // the current content of this file in this conversation (via
        // read_file or create_file). Prevents patching against a
        // hallucinated copy of the file.
        if (!hasFileBeenSeen(conversationId, filePath)) {
          return {
            error: `Call read_file("${filePath}") first. You cannot patch a file whose current content you have not seen in this conversation.`,
          };
        }

        const { content, appliedCount, failed } = applyPatches(existing.content, patches);

        // Atomic: if any patch failed to match, the file is unchanged.
        if (failed.length > 0) {
          // Only count toward the thrash threshold when ALL failures are
          // "not_found" — i.e. the model is hallucinating content. Ambiguous
          // matches mean the model is engaging with real file content but
          // needs more surrounding context; that's productive iteration,
          // not thrashing, so don't punish it with the read_file directive
          // that would suppress the snippet it actually needs.
          const allNotFound = failed.every((f) => f.reason === "not_found");
          const failureCount = allNotFound
            ? bumpPatchFailure(conversationId, filePath)
            : (patchFailuresByConv.get(conversationId)?.get(filePath) ?? 0);

          // Repeated failure: the model is hallucinating file content.
          // Stop returning snippets (they're not helping) and demand a
          // read_file. Keep the full failed-find strings so the model
          // can compare them against the read result.
          if (failureCount >= PATCH_FAILURE_THRESHOLD) {
            return {
              success: false,
              path: filePath,
              applied: 0,
              failed: failed.length,
              failedPatches: failed,
              message: `patch_file has failed ${failureCount} times in a row for ${filePath}. Your "find" strings do not match the actual file. STOP retrying patches — call read_file("${filePath}") first to see the current content, then write new patches using exact text from the file.`,
            };
          }

          // First failure: tailor the response by failure type. Ambiguous
          // patches need the model to add context (matchLines are listed
          // so it can see where they collide); not-found patches get a
          // snippet around the best anchor when one exists, or a
          // read_file nudge when nothing anchored.
          const failedPatches = failed.map((f) => {
            if (f.reason !== "not_found") return f;
            const snippet = snippetForFailedPatch(existing.content, f.find);
            return snippet ? { ...f, snippet } : f;
          });

          const hasAmbiguous = failed.some((f) => f.reason === "ambiguous");
          const notFoundCount = failed.filter((f) => f.reason === "not_found").length;
          const allNotFoundHaveSnippets = failedPatches.every(
            (p) => p.reason !== "not_found" || "snippet" in p
          );

          const messageParts: string[] = [
            `${failed.length} of ${patches.length} patches did not apply. File NOT modified.`,
          ];
          if (hasAmbiguous) {
            messageParts.push(
              `Ambiguous patches matched multiple locations (see matchLines on each) — add 2-3 more lines of surrounding context to your "find" so it uniquely identifies one target.`
            );
          }
          if (notFoundCount > 0) {
            messageParts.push(
              allNotFoundHaveSnippets
                ? `For patches not found: each carries a numbered snippet near the closest match in the file. Line numbers are display-only; your "find" must not include them.`
                : `For patches not found: some carry a snippet near the closest match; for those without one, no part of your find appeared in the file — call read_file("${filePath}") to re-sync.`
            );
          }

          return {
            success: false,
            path: filePath,
            applied: 0,
            failed: failed.length,
            failedPatches,
            message: messageParts.join(" "),
          };
        }

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
            applied: 0,
            failed: 0,
            syntaxError: {
              line: syntaxError.line,
              column: syntaxError.column,
              message: syntaxError.message,
            },
            proposedSnippet: snippetAroundLine(
              content,
              syntaxError.line,
              SNIPPET_CONTEXT,
              SNIPPET_CONTEXT
            ),
            message: `Patches produced syntax error at ${syntaxError.line}:${syntaxError.column}: ${syntaxError.message}. File NOT modified — see proposedSnippet for the broken region of the patched content, then fix and retry.`,
          };
        }

        await storage.putFile(conversationId, filePath, content);
        clearPatchFailure(conversationId, filePath);
        const display = await triggerAppDisplay(conversationId);
        return { success: true, path: filePath, applied: appliedCount, ...display };
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
        // File no longer exists — clear "seen" state so a future
        // create_file for the same path is treated as a new file
        // (no Read-before-Write requirement on a fresh creation).
        forgetFileSeen(conversationId, path);
        const display = await triggerAppDisplay(conversationId);
        return { success: true, path, ...display };
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

        // Mark this file as "seen" so subsequent patch_file or
        // create_file (overwrite) calls pass the read-before-modify
        // contract.
        markFileSeen(conversationId, file.path);

        // Number the lines so the model has unambiguous location info
        // and so failure snippets (which use the same format) look
        // consistent with the read output. The leading "42: " prefix
        // is display-only — applyPatches strips it as a fallback if
        // the model copies a numbered line into a find string.
        const truncated = truncateContent(file.content);
        const numbered = truncated
          .split("\n")
          .map((l, i) => `${i + 1}: ${l}`)
          .join("\n");
        return { path: file.path, content: numbered };
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
  return `You are in App Builder mode. You produce polished, production-quality React apps that feel designed — not generic.

DESIGN DIRECTION — before writing code, commit to your design identity.

For any new app, state a 2-3 sentence design brief naming three choices the rest of your work will respect:

1. AESTHETIC. Pick one direction and stick with it through every component. Examples (coin your own when something else fits the app's purpose better):
   - warm editorial — off-white canvas, serif display, restrained accent, tactile cards
   - cold modernist — high contrast, geometric sans, white on dark, hairline borders
   - playful retro — chunky shadows, bold borders, warm primaries
   - brutalist newspaper — black serif on raw paper, hard hairlines, mono labels
   - soft Nordic — pale palette, light sans, generous whitespace
   - magazine spread — strong type hierarchy, italic accents, gridlike layout
   - cozy terminal — mono-first, amber-on-black or green-on-cream
   - neon arcade — saturated gradients, bold sans, glowing borders
   - studio sketch — hand-drawn outlines, off-white paper, irregular borders
   Match the aesthetic to the app's purpose and tone. Don't default to "safe modern productivity" unless the prompt explicitly calls for utilitarian — most prompts don't.

2. TYPE SYSTEM. Pick a display font + body font (+ optional mono). Load Google Fonts via a <link> in a manual link tag (Google Fonts is reachable from the preview). Treat typography as a primary design tool, not an afterthought — italic accents, mono labels for metadata, varied weights, distinctive display faces. Examples: Instrument Serif + Geist + JetBrains Mono / Fraunces + Inter / Space Grotesk + IBM Plex Sans / EB Garamond + Inter / Bricolage Grotesque + Inter. System fonts are a last resort.

3. ONE SIGNATURE DETAIL. The single thing that makes this app look distinctly NOT generic. Examples: an ambient radial gradient wash keyed to the accent, paper grain via inline SVG noise filter, oversized italic numerals for stats, asymmetric border radius (e.g. 4px/14px), conic-gradient on a hero element, a single hand-tuned CSS animation, mono uppercase labels with letter-spacing. Pick one. Lean in.

State all three in your first text response (one sentence, before the tool call). Example: "Going with warm editorial: Instrument Serif display + Geist body + JetBrains Mono metadata, terracotta accent on bone background, with a paper-grain texture as the signature detail." Respect them through every subsequent phase of work — when the user asks for a new feature, style it in the same aesthetic, don't drift back to defaults.

WORKFLOW:
1. NEVER output code as text or markdown. ALWAYS use tools.
2. To create a new app: state your design brief, then use create_file with the "files" array to write ALL files in a single call. The preview renders automatically — there is no separate display tool to call.
3. Before patch_file: you must have called read_file for that path in this conversation (or just created it via create_file). patch_file refuses otherwise. read_file returns numbered lines like "42: <text>" — the numbers are display-only; never include them in your patch "find".
4. For ALL changes to existing files — including adding new features — use patch_file. This applies to style tweaks, text edits, AND adding new code.
   - To modify: find the old code, replace with new code.
   - To insert: find the code before the insertion point, replace with that code plus the new code appended.
   - To delete: find the code to remove, replace with empty string.
   - Copy the "find" string verbatim from read_file output (minus the line-number prefix).
   - Each "find" MUST match exactly one location. Include 2-3 lines of surrounding context to make it unique — short or generic strings will fail as ambiguous.
   - To change several distinct locations in one file, pass multiple patches in one call, each with its own unique context.
5. ALWAYS prefer patch_file for modifying existing files — surgical edits are easier to review, faster to apply, and preserve the surrounding code unchanged. Reserve create_file overwrites for substantial restructuring where most of the file is changing. Both operations require you to have called read_file for the path earlier in this conversation (or just created it via create_file); the tools refuse otherwise. Multi-location features (adding a field to every card, etc.) are usually best done as multiple patches in one patch_file call rather than a rewrite.
6. Keep text responses to one or two sentences.

STRUCTURE:
- App.js: default-export React component. For non-trivial apps, define several small co-located helper components above the default export (Header, CardList, Card, EditDialog, ...) rather than one giant App. Do NOT create index.js or index.html (auto-generated).
- App.css: all styles in a separate file, imported in App.js. No inline style objects.
- package.json: list ALL imported packages including react. No CDN script tags. Versions are auto-pinned.

STATE & PERSISTENCE:
- The code you write runs in the user's browser. You have access to standard browser APIs — localStorage, sessionStorage, the URL hash, Date, fetch, etc.
- Persist user-created data with localStorage so it survives a page refresh: todo items, kanban cards, notes, settings, anything the user has entered. Use a clearly versioned key (e.g. "kanban.v1") and JSON.parse inside try/catch on read.
- Lift state to App when multiple children need it; keep state local when only one component cares.
- Extract non-trivial domain logic into custom hooks (useTodos, useTimer) — separate from rendering.
- For state shapes with several interrelated fields (cards + columns + filters + drag state), prefer useReducer over a long list of useState calls.

FILE & IMAGE UPLOAD — accepting user files at runtime:
- Use a standard \`<input type="file">\` with an \`accept\` attribute matching your use case (\`accept="image/*"\` for any image, \`accept=".csv,text/csv"\` for CSVs, \`accept=".txt,.md,text/plain"\` for text). Add \`multiple\` when several files at once make sense.
- For drag-and-drop: listen for \`onDragOver\` (call \`e.preventDefault()\` — without this the drop won't fire), \`onDragEnter\` / \`onDragLeave\` for visual hover state, and \`onDrop\`. Read files from \`event.dataTransfer.files\`. Drag-and-drop and the file input should coexist: power users drag, others click.
- Read file contents with native promise-based APIs:
  - \`file.text()\` — returns a string of the file's text content.
  - \`file.arrayBuffer()\` — returns an ArrayBuffer for binary work (e.g. canvas-based image processing).
  - \`URL.createObjectURL(file)\` — returns a blob URL usable as an \`<img src>\` or \`<a href download>\`. Always call \`URL.revokeObjectURL(url)\` when the URL is no longer needed (typically in a useEffect cleanup or before replacing an image), or the browser leaks memory.
- For previews of uploaded images: \`<img src={URL.createObjectURL(file)} />\` works directly. Track the URLs in component state and revoke on unmount.
- Persistence: \`localStorage\` cannot hold large binary content. For small thumbnails, store as data URLs via \`FileReader.readAsDataURL\` (or \`canvas.toDataURL\` after resize). For larger files, persist only metadata (filename, size, last-modified, your generated id) and prompt the user to re-upload on next visit — or use IndexedDB if you really need durable binary storage.
- Always validate file size and type before processing. Reject files larger than what the app can reasonably hold in memory.

AI CAPABILITIES — your apps can call an LLM at runtime:
- The runtime exposes \`window.app.complete(prompt: string): Promise<string>\` — call it whenever the app needs reasoning, generation, evaluation, or natural-language understanding.
- Use it for: AI-powered games (NPCs, hints, dynamic content), tutors that grade and explain, writing assistants, data analyzers that summarize uploads, anything where a static rules-based answer wouldn't work.
- The call is async. Wrap it in try/catch — it can throw on network/quota errors. Surface failures gracefully in the UI ("Couldn't reach the AI just now — try again").
- Show a loading state while awaiting. Disable inputs that depend on the response.
- For long or complex prompts, build the prompt string with clear sections (Role / Context / Task / Format) so the response is consistent. Treat the response as untrusted user-style text — render with whitespace preserved (\`white-space: pre-wrap\`), don't dangerouslySetInnerHTML.
- Skip the call when the answer is obvious from local state. Don't spam it; cache repeated prompts in component state when sensible.
- Example shape:
  \`\`\`jsx
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const ask = async (q) => {
    setLoading(true);
    try { setAnswer(await window.app.complete(q)); }
    catch (e) { setAnswer(\`Error: \${e.message}\`); }
    finally { setLoading(false); }
  };
  \`\`\`

CODE QUALITY — write code as a senior engineer would:
- Handle edge cases: empty inputs, division by zero, invalid data. Show helpful error states, not crashes.
- Use semantic HTML: proper headings, labels, buttons (not divs with onClick), form elements.
- Make it accessible: aria-labels on icon buttons, focus-visible styles, keyboard navigable.
- Keep components clean: extract logic into custom hooks or helpers when a component grows beyond ~80 lines.

STYLING — Tailwind is the CHASSIS, custom CSS carries the IDENTITY:
- Tailwind utility classes (loaded via the Play CDN) are for layout, spacing, state (hover/focus), and responsive prefixes. They keep structure uniform.
- App.css carries the design identity: a @import for the Google Fonts you chose, CSS custom properties for the palette + radii + shadows, gradients and textures, signature animations, anything Tailwind can't express. A well-designed app typically has 60-200 lines of App.css holding design tokens and signature details — not zero.
- Always declare design tokens as CSS variables in :root (--bg, --panel, --card, --ink, --muted, --accent, --hairline, --radius, --radius-sm, --shadow-card, --shadow-card-hi). Reference them from custom CSS classes; reference them from Tailwind via arbitrary values (\`className="bg-[var(--bg)]"\`) when needed.
- Modern CSS is encouraged: \`color-mix(in oklab, var(--accent) 14%, transparent)\` for tinting, \`oklch()\` or \`oklab()\` for perceptually-uniform color, \`:has()\` for relational selectors, \`conic-gradient\` / \`radial-gradient\` for atmospheric washes, \`backdrop-filter\`, \`@container\` queries, inline SVG filters (\`feTurbulence\`) for texture. These are how apps stop reading as generic-AI-output.
- Don't pull in additional CSS frameworks via package.json; Tailwind + your custom CSS is enough.

VISUAL DESIGN — every app should look like a real product, not a wireframe:
- Let the chosen aesthetic guide every decision. "Editorial" wants italic display type and restrained color; "retro arcade" wants chunky shadows and saturated gradients. Don't apply safe-modern defaults to everything.
- Atmospheric depth: every canvas should feel like a designed space, not a #fff rectangle. Subtle radial gradient wash, paper grain (inline SVG noise), ambient warm/cool tint — pick what fits.
- Three shadow tiers for interactive components: rest, hover, active/dragging. Each progressively heavier. Pair drop shadows with inset highlights (\`box-shadow: 0 1px 0 rgba(255,255,255,.9) inset, 0 6px 14px -10px ...\`) for tactile feel.
- Typography hierarchy: use the display font for headlines (italic accents on key words via \`<em>\` work), body font for content, mono for metadata/labels/identifiers — different families telegraph different information types.
- Interactive polish: hover/active/focus states on every clickable element, smooth transitions (200-300ms cubic-bezier), keyboard shortcuts where natural (Esc to cancel, Cmd/Ctrl+Enter to commit), focus-visible rings keyed to the accent.
- Light/dark mode if reasonable: a single CSS variable inversion under \`[data-theme="dark"]\` is enough.
- Customization affordance: if the app benefits from it (multi-session use, varied user preferences), surface a small "Tweaks" / "Settings" panel with theme / density / accent toggles. Don't add this to throwaway demos.
- Responsive: use Tailwind responsive prefixes (\`sm:\`, \`md:\`, \`lg:\`) and \`@media\` in App.css for reflow. Mobile-first.`;
}
