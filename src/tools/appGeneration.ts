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
import { auditDesign } from "./appAudit.js";
import { APP_BUILDER_PROMPT } from "./appBuilderPrompt.js";

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
        // Report line numbers against the ORIGINAL content, not the
        // mid-batch `result`. The whole call reverts atomically on any
        // failure, so the model re-reads the original file — line numbers
        // computed against a partially-mutated buffer would be off by the
        // size of an earlier applied patch's edit.
        matchLines: findMatchLines(content, resolved.needle),
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

/** Tool names for app file operations (create, patch, delete, read, list,
 *  audit, critique, verify). */
export const APP_FILE_TOOL_NAMES: ReadonlySet<string> = Object.freeze(
  new Set([
    "create_file",
    "patch_file",
    "delete_file",
    "read_file",
    "list_files",
    "audit_design",
    "critique_design",
    "verify_app",
  ])
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
  description: `Build a complete, standalone interactive app from scratch — a calculator, a game, a todo list, a dashboard, a simulation, or another self-contained interactive tool. Writes files into the in-chat app project; the live preview renders automatically. Pass every file (App.js, App.css, package.json, ...) in a single call.

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

export const AUDIT_DESIGN_SCHEMA = {
  name: "audit_design",
  description:
    "Inspect the current app's design coherence. Reports raw hex colors outside :root (should be tokens), CSS variables declared but unused, missing :focus-visible rules on interactive elements, icon-only buttons without aria-label, images without alt, heading-level skips, and inline styles with hardcoded colors. Returns a 0-100 score and a list of issues with line numbers. Call this after substantial changes to verify the design system is intact, then patch the actionable issues.",
  arguments: { type: "object", properties: {}, required: [] },
} as const;

export const CRITIQUE_DESIGN_SCHEMA = {
  name: "critique_design",
  description:
    "Step back and look at what you just made. Returns App.js + App.css plus a rubric of open-ended questions for you to answer honestly in your next response — about intent, hierarchy, distinctiveness, coherence, and what's weakest. This is not a checklist of rules; it's an occasion to apply taste. After answering, patch the 2-3 weakest items you identified. Call this after the initial build and after substantial design changes — complementary to audit_design (which catches mechanical/accessibility issues), where critique_design catches taste and composition.",
  arguments: { type: "object", properties: {}, required: [] },
} as const;

export const VERIFY_APP_SCHEMA = {
  name: "verify_app",
  description:
    "Ask the host runtime whether the current app actually mounts. The host's bundler / preview iframe (e.g. Sandpack in a chat UI) is already compiling and running your code; this tool collects whatever errors that runtime captured — hallucinated imports, syntax the bundler rejects, undefined components, runtime crashes — and returns them. Use this after substantial changes and before declaring done. If `rendered` is false or `errors` is non-empty, fix every error before doing anything else. If the host did not wire a runtime verifier, the tool returns `{ rendered: true, errors: [] }` with a `note` explaining — degrade to audit_design + critique_design in that case.",
  arguments: { type: "object", properties: {}, required: [] },
} as const;

/** Default open-ended questions for `critique_design`. Each is designed to
 *  extract the model's own judgment rather than enforce a property — the
 *  model brings the taste, the rubric only supplies the occasion. */
export const DEFAULT_DESIGN_CRITIQUE_RUBRIC: readonly string[] = Object.freeze([
  "What feeling does this app convey? Was that intentional, or did it default to 'polished modern productivity' because that's the safest fallback for an AI-generated React app?",
  "If a user opens this for the first time, where does their eye land first, second, third? Is that the hierarchy you wanted? If not, what specifically is fighting it?",
  "Name ONE detail that makes this app NOT look like generic Tailwind+React output. If you can't name one, that's the gap you need to fix — pick a place to add a signature.",
  "Is there a piece of the design that feels added-on or inconsistent? A shadow that doesn't match its siblings, a font weight that's wrong, a color that doesn't belong to the palette?",
  "Of all your design decisions on this app, which is the weakest? Don't be diplomatic — name it specifically with a line number if possible.",
  "What would you cut if a senior designer told you 'this is 30% too much'? Identify the noisiest two or three rules.",
]);

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

/**
 * Result returned by the host's `verifyApp` hook (and surfaced as the
 * `verify_app` tool's response to the model). Same shape regardless of
 * how the host implements verification — Sandpack error state, an
 * iframe error listener, a headless browser in a benchmark, etc.
 *
 * `rendered`: did the React app actually mount in the host's runtime?
 *   True when the preview is showing content; false when the runtime
 *   reported a fatal failure or never mounted within the host's wait
 *   window.
 *
 * `errors`: human-readable error messages captured by the runtime. One
 *   per distinct error. Order is host-defined; usually chronological.
 *
 * `note`: optional explanation when the result is degenerate — host
 *   didn't wire the hook, hook is wired but the preview isn't mounted
 *   yet, etc. Lets the model interpret the result correctly without
 *   silently treating "no errors" as success.
 */
export interface VerifyAppResult {
  rendered: boolean;
  errors: string[];
  note?: string;
}

/**
 * Event emitted after a successful file mutation. Hosts subscribe via
 * the `onFileChange` option to {@link createAppGenerationTools} and
 * attach versioning (isomorphic-git, sqlite-history, etc.), audit
 * logs, analytics, or whatever else benefits from a per-mutation hook.
 *
 * Read operations (`read_file`, `list_files`) do not emit — they
 * don't mutate state.
 *
 * Batch `create_file` calls fan out to one event per file, with each
 * file getting `type: "created"` or `type: "modified"` depending on
 * whether it existed before the write.
 */
export type FileChangeEvent =
  | {
      type: "created";
      conversationId: string;
      path: string;
      content: string;
      tool: "create_file";
    }
  | {
      type: "modified";
      conversationId: string;
      path: string;
      before: string;
      after: string;
      tool: "create_file" | "patch_file";
    }
  | {
      type: "deleted";
      conversationId: string;
      path: string;
      before: string;
      tool: "delete_file";
    };

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
  /**
   * Optional host callback that runs the generated app in whatever
   * runtime the host has available (Sandpack iframe in a chat UI, a
   * headless browser in a benchmark, etc.) and reports back whether
   * the app mounted plus any errors the runtime captured.
   *
   * When wired, the SDK exposes a `verify_app` tool the model can call
   * after substantial changes; the tool's executor invokes this hook
   * and returns the result to the model. When NOT wired, the tool
   * still exists but returns `{ rendered: true, errors: [], note: … }`
   * so the model degrades gracefully to audit/critique-only feedback.
   *
   * Same host-hook pattern as `displayApp` and `onFileChange` — the
   * SDK never executes anything itself.
   */
  verifyApp?: () => Promise<VerifyAppResult>;
  /**
   * Optional host callback fired after every successful file mutation
   * (`create_file`, `patch_file`, `delete_file`). See
   * {@link FileChangeEvent} for the event shape.
   *
   * Use this to attach versioning, audit logs, or analytics from the
   * host side without wrapping the storage adapter. The callback is
   * `await`ed but a thrown error is logged and swallowed — a host
   * subsystem failure should not fail the underlying tool.
   *
   * Read tools (`read_file`, `list_files`) and failed mutations
   * (validation errors, patch ambiguity, syntax errors) do not emit.
   */
  onFileChange?: (event: FileChangeEvent) => Promise<void> | void;
  /**
   * Override the open-ended rubric returned by `critique_design`. Each
   * string is a question the model is expected to answer in its next
   * response about the current App.js + App.css. Defaults to
   * {@link DEFAULT_DESIGN_CRITIQUE_RUBRIC} — six questions covering
   * intent, hierarchy, distinctiveness, coherence, the weakest decision,
   * and what to cut. Pass a custom rubric to steer the kind of critique
   * the model performs (e.g. brand-specific concerns).
   */
  designCritiqueRubric?: readonly string[];
  /**
   * Cap on the number of distinct conversations whose per-conversation
   * state (read-before-write tracking, patch-failure tallies, display
   * cache) is retained in memory. When a new conversation pushes the
   * count over the cap, the oldest entry is evicted (FIFO by first
   * touch).
   *
   * Defaults to {@link DEFAULT_MAX_CONVERSATIONS}. The factory is
   * typically long-lived in a server process, so this prevents the
   * maps from growing unboundedly as conversations churn. An evicted
   * conversation that comes back will need to call `read_file` again
   * before `patch_file` — same as a cold start.
   *
   * Set to a positive integer; non-positive values fall back to the
   * default.
   */
  maxConversations?: number;
}

/** Default cap for {@link CreateAppGenerationToolsOptions.maxConversations}. */
export const DEFAULT_MAX_CONVERSATIONS = 1_000;

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
 * read_file, list_files, audit_design, critique_design, verify_app) backed by
 * the provided storage adapter.
 *
 * Give the tool loop running these at least 8 tool rounds per turn
 * (`maxToolRounds` in `runToolLoop` / `useChat`). The workflow the App Builder
 * prompt mandates — re-orient, create, critique, patch, audit, patch, verify —
 * takes 7–8 rounds on a substantial turn; a smaller budget silently starves
 * the trailing `verify_app` call, so the host's runtime verification never runs.
 */
export function createAppGenerationTools({
  getConversationId,
  storage,
  logError = (msg, err) => console.error(msg, err),
  displayApp,
  verifyApp,
  onFileChange,
  designCritiqueRubric = DEFAULT_DESIGN_CRITIQUE_RUBRIC,
  maxConversations,
}: CreateAppGenerationToolsOptions): ToolConfig[] {
  const convCap =
    typeof maxConversations === "number" && maxConversations > 0
      ? maxConversations
      : DEFAULT_MAX_CONVERSATIONS;

  /**
   * Touch a per-conversation Map entry: refreshes its position to the
   * tail of insertion order and evicts the oldest entries until the
   * map size is within `convCap`. Insertion order on a JS Map is
   * stable, so deleting + re-setting an existing key promotes it.
   *
   * Used for the maps below where `conversationId` is the outer key
   * (`patchFailuresByConv`, `seenFilesByConv`, `appStateByConv`) so
   * a long-running factory doesn't accumulate stale entries.
   */
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

  /**
   * Invoke the host's `onFileChange` callback. Mirrors `triggerAppDisplay`
   * in its error handling: the callback is awaited but a thrown error
   * is logged and swallowed so a failing host hook never causes the
   * tool to look broken to the model.
   */
  async function emitFileChange(event: FileChangeEvent): Promise<void> {
    if (!onFileChange) return;
    try {
      await onFileChange(event);
    } catch (err) {
      logError("onFileChange callback failed", err instanceof Error ? err : undefined);
    }
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
    // touchConv on every bump, not just first insertion — otherwise the
    // conversation's map position is frozen at first failure and eviction
    // degrades to FIFO (an active conversation can be dropped before idle
    // ones that merely arrived later).
    const m = patchFailuresByConv.get(conversationId) ?? new Map<string, number>();
    touchConv(patchFailuresByConv, conversationId, m);
    const n = (m.get(path) ?? 0) + 1;
    m.set(path, n);
    return n;
  }
  function clearPatchFailure(conversationId: string, path: string): void {
    patchFailuresByConv.get(conversationId)?.delete(path);
  }

  // Per-conversation set of file paths whose current content the model
  // has seen — via a successful read_file, create_file, or patch_file
  // (a successful patch means the model constructed the new content, so
  // it still knows it). patch_file refuses to operate on files not in
  // this set, mirroring Claude Code's "must Read before Edit" contract.
  // Prevents the failure mode where the model patches against a
  // hallucinated copy of the file.
  const seenFilesByConv = new Map<string, Set<string>>();
  function markFileSeen(conversationId: string, path: string): void {
    // touchConv on every mark so each read/write refreshes the
    // conversation's LRU position — see bumpPatchFailure for the
    // FIFO-degradation failure mode this prevents.
    const s = seenFilesByConv.get(conversationId) ?? new Set<string>();
    touchConv(seenFilesByConv, conversationId, s);
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
        touchConv(appStateByConv, conversationId, {
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
        // Split paths into fresh writes vs. overwrites of existing files.
        // The overwrite signal nudges the model toward patch_file for
        // incremental changes — read-before-write only ensures the model
        // saw the content; it doesn't enforce that patch was the better
        // tool. Surfacing the count both in the immediate tool result
        // (so the model self-corrects) and via metrics summary (so we
        // can measure rewrite rate run-over-run).
        const created: string[] = [];
        const overwritten: string[] = [];
        // Fan out one onFileChange event per file. Files that existed
        // before this batch are reported as "modified" with before/after
        // content; new ones as "created". `existsInStorage[i]` was
        // captured above before any write so the `before` content is
        // the actual pre-mutation state, not a re-read of what we just
        // wrote.
        for (let i = 0; i < filesArg.length; i++) {
          const path = paths[i];
          const after = filesArg[i].content;
          const previous = existsInStorage[i];
          if (previous === null) {
            created.push(path);
            await emitFileChange({
              type: "created",
              conversationId,
              path,
              content: after,
              tool: "create_file",
            });
          } else {
            overwritten.push(path);
            await emitFileChange({
              type: "modified",
              conversationId,
              path,
              before: previous.content,
              after,
              tool: "create_file",
            });
          }
        }
        const display = await triggerAppDisplay(conversationId);
        const result: Record<string, unknown> = {
          success: true,
          paths,
          created,
          overwritten,
          ...display,
        };
        if (overwritten.length > 0) {
          result.note = `Overwrote ${overwritten.length} existing file(s): ${overwritten.join(", ")}. For incremental changes, prefer patch_file — smaller diffs are easier to review and preserve more of the existing structure.`;
          // Rewrites of the audited files are where JSX class names and CSS
          // selectors drift apart (rename in one file, forget the other →
          // blank or unstyled render). Suggest the audit at the exact moment
          // the risk is introduced, not just in the system prompt.
          const auditedFiles = ["App.js", "App.jsx", "App.css"];
          if (overwritten.some((p) => auditedFiles.includes(p))) {
            result.note +=
              " After rewriting App.js or App.css, call audit_design — it flags JSX class names and CSS selectors that no longer match across the two files.";
          }
        }
        return result;
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
          // can compare them against the read result. Gate on `allNotFound`
          // too: an ambiguous failure must never inherit a prior not_found
          // streak's STOP directive — that would suppress the matchLines
          // guidance the model needs (see the productive-iteration note above).
          if (allNotFound && failureCount >= PATCH_FAILURE_THRESHOLD) {
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
        // A successful patch is conversation activity: re-mark the path so
        // a patch-only conversation keeps refreshing its LRU position
        // instead of aging toward eviction while actively editing.
        markFileSeen(conversationId, filePath);
        clearPatchFailure(conversationId, filePath);
        await emitFileChange({
          type: "modified",
          conversationId,
          path: filePath,
          before: existing.content,
          after: content,
          tool: "patch_file",
        });
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

        // Capture the pre-delete content so onFileChange subscribers
        // (versioning, audit log, rollback) get the actual bytes that
        // were removed. Skip the fetch when no callback is wired —
        // saves a storage round-trip in the common case.
        const previous = onFileChange ? await storage.getFile(conversationId, path) : null;
        await storage.deleteFile(conversationId, path);
        // File no longer exists — clear "seen" state so a future
        // create_file for the same path is treated as a new file
        // (no Read-before-Write requirement on a fresh creation).
        forgetFileSeen(conversationId, path);
        if (previous !== null) {
          await emitFileChange({
            type: "deleted",
            conversationId,
            path,
            before: previous.content,
            tool: "delete_file",
          });
        }
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
        // contract. Use the locally-normalized `path` (not
        // `file.path`) so the key matches what `hasFileBeenSeen`
        // checks — third-party storage adapters may return a
        // differently-shaped `path` than the one they were queried
        // with, which would silently break the contract.
        markFileSeen(conversationId, path);
        // Reading re-syncs the model with the file, which is exactly what the
        // thrash-detection STOP directive asks for — so clear the failure
        // streak. Otherwise the next not_found would re-fire STOP immediately
        // even though the model just complied by reading.
        clearPatchFailure(conversationId, path);

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

  const auditDesignTool: ToolConfig = {
    type: "function",
    function: AUDIT_DESIGN_SCHEMA,
    executor: async () => {
      try {
        const conversationId = requireConversationId();
        const files = await storage.getFiles(conversationId);
        const map: Record<string, string> = {};
        for (const f of files) map[f.path] = f.content;
        return auditDesign(map);
      } catch (err) {
        logError("audit_design failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to audit design: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };

  const critiqueDesignTool: ToolConfig = {
    type: "function",
    function: CRITIQUE_DESIGN_SCHEMA,
    executor: async () => {
      try {
        const conversationId = requireConversationId();
        const files = await storage.getFiles(conversationId);
        const appJs =
          files.find((f) => f.path === "App.js")?.content ??
          files.find((f) => f.path === "App.jsx")?.content ??
          "";
        const appCss = files.find((f) => f.path === "App.css")?.content ?? "";
        // The tool's job is to PROMPT reflection — it returns the files
        // (so the model has them fresh) plus the rubric (the occasion).
        // The model produces the actual critique in its next response;
        // we don't try to evaluate design quality in code here, because
        // that's a regression to checklist-as-prompt. Taste belongs to
        // the model; the system supplies the moment for it to apply.
        //
        // Content is truncated like read_file: without the cap this was
        // the one tool result whose size grew with the app instead of
        // staying bounded, which breaks predictable per-turn token cost
        // on long edit sessions.
        return {
          instruction:
            "Read your App.js and App.css below, then answer each of the rubric questions honestly in your next response — be specific (cite lines, name choices, don't hedge). After answering, identify the 2-3 weakest items you named and patch them now. The point is to step back from the keyboard and actually look, not to satisfy a checklist.",
          rubric: designCritiqueRubric,
          appJs: {
            path: "App.js",
            lines: appJs.split("\n").length,
            content: truncateContent(appJs),
          },
          appCss: {
            path: "App.css",
            lines: appCss.split("\n").length,
            content: truncateContent(appCss),
          },
        };
      } catch (err) {
        logError("critique_design failed", err instanceof Error ? err : undefined);
        return {
          error: `Failed to load files for critique: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };

  const verifyAppTool: ToolConfig = {
    type: "function",
    function: VERIFY_APP_SCHEMA,
    executor: async (): Promise<VerifyAppResult> => {
      if (!verifyApp) {
        // Host didn't wire the runtime verifier. The tool exists so
        // the prompt can refer to it unconditionally; the model
        // degrades to audit/critique-only feedback when the host
        // doesn't ship runtime introspection.
        return {
          rendered: true,
          errors: [],
          note: "This host did not wire verify_app — runtime introspection is unavailable in this environment. Rely on audit_design and critique_design for feedback. Do not interpret the empty errors list as proof the app runs.",
        };
      }
      try {
        const result = await verifyApp();
        // Defensive: hosts may return malformed results. Coerce to
        // the expected shape so the model always sees a stable
        // structure even when the host's implementation is buggy.
        return {
          rendered: Boolean(result?.rendered),
          errors: Array.isArray(result?.errors) ? result.errors.map((e) => String(e)) : [],
          ...(result?.note ? { note: String(result.note) } : {}),
        };
      } catch (err) {
        logError("verifyApp hook threw", err instanceof Error ? err : undefined);
        return {
          rendered: false,
          errors: [
            `Host verifyApp hook threw: ${err instanceof Error ? err.message : String(err)}`,
          ],
          note: "The runtime verifier itself errored — treat the app as unverified, not as healthy.",
        };
      }
    },
  };

  // No standalone display_app tool — display happens automatically
  // from inside create_file / patch_file / delete_file via the
  // `displayApp` callback. Mirrors `createSlideTools`, which has no
  // `display_slides` tool either; the deck viewer is opened from
  // within `plan_deck` / `add_slide` / `patch_slides`.
  return [
    createFileTool,
    patchFileTool,
    deleteFileTool,
    readFileTool,
    listFilesTool,
    auditDesignTool,
    critiqueDesignTool,
    verifyAppTool,
  ];
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

// `APP_BUILDER_PROMPT` is defined in its own dependency-free module
// (`./appBuilderPrompt`) so the lib/server layer can import the string — it's
// attached to the `app-generation` tool set's `systemPrompt` — without pulling
// in this module's heavy runtime deps. Re-exported here for back-compat.
export { APP_BUILDER_PROMPT };

/**
 * Returns the {@link APP_BUILDER_PROMPT} constant. Thin function wrapper
 * kept for callers that import a builder rather than a string constant
 * (e.g. existing test setups). The prompt itself is now a static
 * constant — there is no per-call assembly.
 */
export function buildAppSystemPrompt(): string {
  return APP_BUILDER_PROMPT;
}

// ---------------------------------------------------------------------------
// Turn envelope — bounded per-turn context for long edit sessions
// ---------------------------------------------------------------------------

/**
 * Build a compact manifest of the conversation's current app files, for
 * injection into each turn's context as a system message.
 *
 * This is the anchor of the *turn envelope* pattern, which keeps per-request
 * token cost flat across arbitrarily long edit sessions. The files in
 * storage — not the conversation — are the durable state: every prior change
 * is already encoded in them, so old tool traffic adds cost without adding
 * information. Hosts that resend tool history across turns pay per-turn cost
 * that grows linearly with turn count (quadratic total); hosts using the
 * envelope pay a cost bounded by app size, the same at request 5 and
 * request 100.
 *
 * The envelope recipe, per change request:
 *   1. system: `APP_BUILDER_PROMPT`
 *   2. system: this manifest (rebuilt from storage each turn)
 *   3. the last few user/assistant TEXT exchanges (drop all tool messages)
 *   4. the new user request
 *
 * In-turn tool traffic stays within the turn; `maxToolRounds` bounds the
 * rounds and `maxTurnTokens` (on `runToolLoop`) gives a hard ceiling. The
 * model re-reads the files it wants to edit (`read_file` results are
 * truncation-bounded), so per-turn cost is a function of app size and the
 * text window — never of how many turns came before.
 *
 * The manifest deliberately lists paths and sizes only, no content: the
 * read-before-write contract tracks what the model has actually seen via
 * `read_file`/`create_file`, and inlined-but-unread content would invite
 * patches against text the gate can't vouch for.
 */
export async function buildAppFileManifest(opts: {
  storage: AppFileStorage;
  conversationId: string;
}): Promise<string> {
  const files = await opts.storage.getFiles(opts.conversationId);
  if (files.length === 0) {
    return "No app files exist in this conversation yet.";
  }
  const lines = files
    .map((f) => ({ path: normalizePath(f.path), chars: f.content.length }))
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((f) => `- ${f.path} (${f.chars} chars)`);
  return [
    "Current app files (latest state; supersedes anything earlier in the conversation):",
    ...lines,
    "Your context does not carry file contents between turns — call read_file before patching.",
  ].join("\n");
}
