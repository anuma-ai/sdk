/**
 * Shared setup for app-generation tool e2e tests.
 *
 * Extends the base test/tools/setup.ts with app-generation-specific
 * utilities: in-memory file store, snapshot/diff, and output dumping.
 *
 * Environment:
 *   PORTAL_API_KEY   (required)  Portal API key
 *   ANUMA_API_URL    (optional)  Override portal base URL
 *   E2E_MODEL        (optional)  Model override
 *   E2E_API_TYPE     (optional)  "completions" or "responses"
 */

import fs from "node:fs";
import path from "node:path";

import { exportAppToHtml } from "../../../src/tools/appExport.js";
import {
  compareRuns,
  finalizeRun,
  type PhaseRecord,
  type RunRecord,
  shortHash,
  summarizePhase,
} from "../../../src/tools/appGenMetrics.js";
import { config, runToolLoop } from "../setup.js";

export {
  config,
  extractText,
  printResult,
  runToolLoop,
  wrapTool,
  type ToolCallLog,
} from "../setup.js";

export {
  compareRuns,
  finalizeRun,
  type PhaseRecord,
  type RunRecord,
  shortHash,
  summarizePhase,
} from "../../../src/tools/appGenMetrics.js";

/** Wrapper that times the tool loop and logs the duration. */
export async function timedToolLoop(
  ...args: Parameters<typeof runToolLoop>
): Promise<Awaited<ReturnType<typeof runToolLoop>> & { elapsedMs: number }> {
  const start = performance.now();
  const result = await runToolLoop(...args);
  const elapsedMs = Math.round(performance.now() - start);
  console.log(`  Tool loop: ${(elapsedMs / 1000).toFixed(1)}s`);
  return { ...result, elapsedMs };
}

// ---------------------------------------------------------------------------
// In-memory file store (replaces IndexedDB for tests)
// ---------------------------------------------------------------------------

export type FileStore = Map<string, string>;

export function createFileStore(): FileStore {
  return new Map();
}

// ---------------------------------------------------------------------------
// Snapshot & diff utilities
// ---------------------------------------------------------------------------

/** Take a snapshot of the file store (deep copy). */
export function snapshot(store: FileStore): Map<string, string> {
  return new Map(store);
}

/** Diff two file store snapshots. Returns per-file change details. */
export interface FileDiff {
  path: string;
  status: "added" | "removed" | "modified" | "unchanged";
  linesChanged: number;
  totalLines: number;
  changedLineNumbers: number[];
}

function diffFile(p: string, b: string | undefined, a: string | undefined): FileDiff {
  if (b === undefined && a !== undefined) {
    const lines = a.split("\n");
    return {
      path: p,
      status: "added",
      linesChanged: lines.length,
      totalLines: lines.length,
      changedLineNumbers: lines.map((_, i) => i + 1),
    };
  }
  if (b !== undefined && a === undefined) {
    return {
      path: p,
      status: "removed",
      linesChanged: b.split("\n").length,
      totalLines: 0,
      changedLineNumbers: [],
    };
  }
  if (b === a) {
    return {
      path: p,
      status: "unchanged",
      linesChanged: 0,
      totalLines: (a ?? "").split("\n").length,
      changedLineNumbers: [],
    };
  }
  const bLines = (b ?? "").split("\n");
  const aLines = (a ?? "").split("\n");
  const changed: number[] = [];
  for (let i = 0; i < Math.max(bLines.length, aLines.length); i++) {
    if (bLines[i] !== aLines[i]) changed.push(i + 1);
  }
  return {
    path: p,
    status: "modified",
    linesChanged: changed.length,
    totalLines: aLines.length,
    changedLineNumbers: changed,
  };
}

export function diffSnapshots(before: Map<string, string>, after: Map<string, string>): FileDiff[] {
  const allPaths = new Set([...before.keys(), ...after.keys()]);
  return [...allPaths].map((p) => diffFile(p, before.get(p), after.get(p)));
}

/** Log a diff summary to console. */
export function printDiff(label: string, diffs: FileDiff[]): void {
  console.log(`  --- ${label} ---`);
  for (const d of diffs) {
    if (d.status === "unchanged") {
      console.log(`  ${d.path}: unchanged (${d.totalLines} lines)`);
    } else if (d.status === "added") {
      console.log(`  ${d.path}: +added (${d.linesChanged} lines)`);
    } else if (d.status === "removed") {
      console.log(`  ${d.path}: -removed`);
    } else {
      const pct = ((d.linesChanged / d.totalLines) * 100).toFixed(1);
      console.log(
        `  ${d.path}: ${d.linesChanged}/${d.totalLines} lines changed (${pct}%) — lines ${d.changedLineNumbers.join(", ")}`
      );
    }
  }
}

const OUTPUT_DIR = path.resolve(__dirname, ".output");

/** Generate a self-contained index.html that renders App.js in the browser.
 *  Thin wrapper around the public SDK utility — we read files from disk
 *  and hand the contents to exportAppToHtml. */
function generateAppHtml(appDir: string, title: string): string {
  const filesOnDisk: Record<string, string> = {};
  for (const name of ["App.js", "App.css", "package.json"]) {
    const p = path.join(appDir, name);
    if (fs.existsSync(p)) filesOnDisk[name] = fs.readFileSync(p, "utf-8");
  }
  return exportAppToHtml({ files: filesOnDisk, title });
}

/** Write an index.html into a directory if it contains App.js (works recursively for step dirs). */
function writeAppHtml(dir: string, title: string): void {
  if (fs.existsSync(path.join(dir, "App.js"))) {
    fs.writeFileSync(path.join(dir, "index.html"), generateAppHtml(dir, title), "utf-8");
  }
  // Handle step subdirectories (e.g. precision-multi/step-1-initial/)
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      writeAppHtml(full, `${title} / ${entry}`);
    }
  }
}

/** Write all files from the store to disk for inspection. */
export function dumpFiles(store: FileStore, testName: string): string {
  const dir = path.join(OUTPUT_DIR, testName.replace(/[^a-zA-Z0-9-_/]/g, "_"));
  fs.mkdirSync(dir, { recursive: true });
  for (const [filePath, content] of store) {
    const fullPath = path.join(dir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
  }
  writeAppHtml(dir, testName);
  console.log(`  Output written to ${path.relative(process.cwd(), dir)}/`);
  return dir;
}

// ---------------------------------------------------------------------------
// Debug trace — full request/response/tool-call record for a multi-turn run.
// ---------------------------------------------------------------------------

/** One turn of a debug trace: what was asked, what the model did, what it produced. */
export interface DebugTraceStep {
  step: number;
  /** Short slug, e.g. "1-generate" / "2-style" / "3-feature". */
  label: string;
  /** The user prompt for this turn. */
  userPrompt: string;
  request: {
    /** Conversation shape sent this turn (system / user / assistant …). */
    messageRoles: string[];
    messageCount: number;
    /** Tool names available to the model this turn. */
    toolsAvailable: string[];
  };
  response: {
    text: string;
    elapsedMs: number;
    error: string | null;
    toolCallCount: number;
  };
  /** Every tool call this turn — name, args (the generated code / patches), result. */
  toolCalls: Array<{ name: string; args: unknown; result: unknown }>;
  /** File store after this turn (path → content). */
  files: Record<string, string>;
  /** Per-step output dir (files + index.html) written by dumpFiles. */
  outputDir: string;
}

/**
 * Write a full request/response/tool-call/output trace for a multi-turn app-gen
 * run — for seeing exactly how generation + edits flow and debugging where they
 * break. Emits two files under `.output/<outputSubdir>/`:
 *   - `system-prompt.txt` — the system prompt sent every turn. Inspect it to
 *     confirm the App Builder guidance (incl. the window.app.complete contract)
 *     is present.
 *   - `trace.json` — per-turn user prompt, conversation shape, tool calls with
 *     their args (the generated code/patches) and results, response text,
 *     timing, errors, and the file snapshot.
 * Per-step file outputs + index.html are written separately via `dumpFiles`.
 */
export function writeDebugTrace(
  outputSubdir: string,
  systemPrompt: string,
  steps: DebugTraceStep[]
): void {
  const dir = path.join(OUTPUT_DIR, outputSubdir.replace(/[^a-zA-Z0-9-_/]/g, "_"));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "system-prompt.txt"), systemPrompt, "utf-8");
  const trace = {
    systemPrompt: {
      chars: systemPrompt.length,
      hash: shortHash(systemPrompt),
      mentionsWindowAppComplete: systemPrompt.includes("window.app.complete"),
      savedTo: "system-prompt.txt",
    },
    steps,
  };
  fs.writeFileSync(path.join(dir, "trace.json"), JSON.stringify(trace, null, 2), "utf-8");
  console.log(
    `  Debug trace: ${path.relative(process.cwd(), dir)}/trace.json (${steps.length} turns) + system-prompt.txt`
  );
}

// ---------------------------------------------------------------------------
// Metrics persistence — pairs with src/tools/appGenMetrics.ts.
// ---------------------------------------------------------------------------

/**
 * Persist a benchmark's `RunRecord` to disk. Writes two files:
 *   - `.output/{outputSubdir}/metrics.json`  (always the latest run)
 *   - `.output/{outputSubdir}/.history/run-{finishedAt}.json`  (append-only)
 *
 * The latest file is what `scripts/compare-app-gen-runs.ts` reads by
 * default; the history files let you diff arbitrary prior runs.
 *
 * By default the inline diff against the previous run is printed to
 * stdout (useful interactively, noisy in CI). Pass `quiet: true` or
 * `BENCHMARK_QUIET=1` to suppress — the JSON files still land, just
 * without the terminal echo. The "Metrics written to ..." pointer line
 * is always printed so the file is discoverable.
 */
export function writeRunMetrics(opts: {
  outputSubdir: string;
  benchmark: string;
  scenario?: string;
  promptHash: string;
  startedAt: string;
  phases: PhaseRecord[];
  /** Suppress the inline diff print. Default: env `BENCHMARK_QUIET=1`. */
  quiet?: boolean;
}): RunRecord {
  const run = finalizeRun({
    benchmark: opts.benchmark,
    scenario: opts.scenario,
    model: config.model,
    apiType: config.apiType,
    promptHash: opts.promptHash,
    startedAt: opts.startedAt,
    phases: opts.phases,
  });
  const dir = path.join(OUTPUT_DIR, opts.outputSubdir);
  fs.mkdirSync(dir, { recursive: true });
  const payload = JSON.stringify(run, null, 2);
  fs.writeFileSync(path.join(dir, "metrics.json"), payload, "utf-8");
  const historyDir = path.join(dir, ".history");
  fs.mkdirSync(historyDir, { recursive: true });
  // Colons are filesystem-hostile on Windows + awkward in shell globs.
  const stamp = run.finishedAt.replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(historyDir, `run-${stamp}.json`), payload, "utf-8");
  console.log(
    `  Metrics written to ${path.relative(process.cwd(), path.join(dir, "metrics.json"))}`
  );

  const quiet = opts.quiet ?? process.env.BENCHMARK_QUIET === "1";
  if (quiet) return run;

  // If a previous run exists in history, print a short diff so the
  // benchmark's terminal output shows the regression/improvement
  // inline. Skip the just-written file itself.
  const priors = fs
    .readdirSync(historyDir)
    .filter((f) => f.startsWith("run-") && f.endsWith(".json") && f !== `run-${stamp}.json`)
    .sort();
  const previous = priors[priors.length - 1];
  if (previous) {
    try {
      const prev = JSON.parse(
        fs.readFileSync(path.join(historyDir, previous), "utf-8")
      ) as RunRecord;
      console.log(`\n${compareRuns(prev, run)}`);
    } catch (err) {
      console.log(`  (skipped diff — could not read ${previous}: ${(err as Error).message})`);
    }
  }
  return run;
}

/** Write a root index.html linking to all app previews. Call after all tests. */
export function writeIndex(): void {
  if (!fs.existsSync(OUTPUT_DIR)) return;
  const dirs = fs
    .readdirSync(OUTPUT_DIR)
    .filter((d) => fs.statSync(path.join(OUTPUT_DIR, d)).isDirectory());

  const links: string[] = [];
  for (const name of dirs) {
    const appDir = path.join(OUTPUT_DIR, name);
    // If the dir has App.js directly, link to it
    if (fs.existsSync(path.join(appDir, "index.html"))) {
      links.push(`      <a href="${name}/">${name}</a>`);
    } else {
      // Step-based app — link to each step
      const steps = fs
        .readdirSync(appDir)
        .filter((s) => fs.statSync(path.join(appDir, s)).isDirectory())
        .sort();
      if (steps.length > 0) {
        links.push(`      <div class="group"><strong>${name}</strong></div>`);
        for (const step of steps) {
          links.push(`      <a href="${name}/${step}/" class="step">${step}</a>`);
        }
      } else {
        links.push(`      <a href="${name}/">${name}</a>`);
      }
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Generated Apps</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 4rem auto; padding: 0 1rem; }
    h1 { font-size: 1.5rem; margin-bottom: 2rem; }
    a { display: block; padding: 0.75rem 1rem; margin-bottom: 0.5rem; border-radius: 8px; background: #f1f5f9; color: #1e293b; text-decoration: none; }
    a:hover { background: #e2e8f0; }
    .group { padding: 0.75rem 1rem 0.25rem; margin-top: 1rem; font-size: 0.95rem; color: #475569; }
    .step { padding-left: 2rem; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Generated Apps</h1>
${links.join("\n")}
</body>
</html>`;
  fs.writeFileSync(path.join(OUTPUT_DIR, "index.html"), html, "utf-8");
  console.log(`  Index written to ${path.relative(process.cwd(), OUTPUT_DIR)}/index.html`);
}

// ---------------------------------------------------------------------------
// Playwright-backed verify_app implementation for benchmarks.
//
// The SDK's `verifyApp` host hook is normally wired by the chat app to its
// Sandpack iframe. In benchmarks there's no Sandpack — we substitute a
// headless Chromium that loads the current file store as `exportAppToHtml`
// output and reports back whatever the browser captured.
//
// Catches the entire class of "Sonnet wrote code that doesn't run" — bad
// imports, syntax the bundler rejects, runtime crashes after mount, etc.
// — by actually running the code and listening for pageerror, console.error,
// and the runtime overlay we ship inside exportAppToHtml.
//
// Browser is launched lazily on first verify call and reused across all
// subsequent calls within the same vitest run. Each benchmark `afterAll`s
// `closeSharedBrowser()` to release it.
// ---------------------------------------------------------------------------

type BrowserType = import("playwright").Browser;
let sharedBrowser: BrowserType | null = null;
let browserInitPromise: Promise<BrowserType | null> | null = null;

async function getSharedBrowser(): Promise<BrowserType | null> {
  if (sharedBrowser) return sharedBrowser;
  if (browserInitPromise) return browserInitPromise;
  browserInitPromise = (async () => {
    try {
      const { chromium } = await import("playwright");
      if (!chromium.executablePath()) return null;
      sharedBrowser = await chromium.launch();
      return sharedBrowser;
    } catch {
      // Playwright not installed or Chromium binary missing — verifier
      // degrades to the SDK's "host did not wire" fallback.
      return null;
    }
  })();
  return browserInitPromise;
}

/** Close the shared browser if it was launched. Call from each benchmark's
 *  `afterAll` so process exit doesn't dangle a Chromium subprocess. */
export async function closeSharedBrowser(): Promise<void> {
  if (sharedBrowser) {
    const b = sharedBrowser;
    sharedBrowser = null;
    browserInitPromise = null;
    await b.close();
  }
}

/**
 * Build a `verifyApp` implementation closed over the given file store.
 * Loads the current state via `exportAppToHtml`, navigates a fresh page
 * to it, races a successful `#root` populate against the runtime
 * overlay's appearance, returns the structured result.
 *
 * Returns `null` when Playwright isn't available — caller can pass
 * undefined to `createAppGenerationTools`, which already degrades the
 * `verify_app` tool to the "not wired" branch.
 */
export function createPlaywrightVerifier(
  store: FileStore
): () => Promise<{ rendered: boolean; errors: string[]; note?: string }> {
  return async () => {
    const browser = await getSharedBrowser();
    if (!browser) {
      return {
        rendered: true,
        errors: [],
        note: "Playwright is not installed in this benchmark environment — verify_app is a no-op here.",
      };
    }
    if (!store.has("App.js") && !store.has("App.jsx")) {
      return {
        rendered: false,
        errors: [],
        note: "No App.js / App.jsx in the file store yet — write the app first, then verify.",
      };
    }
    const files: Record<string, string> = {};
    for (const [p, c] of store) files[p] = c;
    const html = exportAppToHtml({ files, windowAppShim: "" });

    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    try {
      await page.setContent(html, { waitUntil: "load" });
      // Race: did the React app mount, or did the runtime overlay paint?
      // The overlay is the explicit "I failed to mount" sentinel from
      // appExport.ts; checking for it directly gives us a fast-fail path
      // before the 10s rendered-timeout would expire.
      const outcome = await Promise.race([
        page
          .waitForSelector("[data-anuma-error-overlay]", { timeout: 8000 })
          .then(() => "overlay" as const)
          .catch(() => null),
        page
          .waitForFunction(
            () => {
              const root = document.getElementById("root");
              if (!root) return false;
              // Treat the overlay itself as not-rendered.
              if (root.querySelector("[data-anuma-error-overlay]")) return false;
              return root.childNodes.length > 0;
            },
            { timeout: 8000 }
          )
          .then(() => "rendered" as const)
          .catch(() => null),
      ]);

      if (outcome === "rendered") {
        return { rendered: true, errors };
      }
      if (outcome === "overlay") {
        // Pull the overlay's text — it's the error list painted by
        // RUNTIME_ERROR_OVERLAY_SCRIPT — so the model sees the literal
        // failure rather than a generic "did not mount."
        const overlayText = await page
          .locator("[data-anuma-error-overlay]")
          .textContent()
          .catch(() => null);
        const overlayErrors = overlayText
          ? overlayText
              .replace(/Runtime error.*?did not mount/i, "")
              .replace(/Common causes:[\s\S]*$/, "")
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        const merged = [...new Set([...errors, ...overlayErrors])];
        return {
          rendered: false,
          errors: merged.length ? merged : ["app failed to mount; no error message captured"],
        };
      }
      // Neither outcome resolved — timeout.
      return {
        rendered: false,
        errors: errors.length
          ? errors
          : ["app did not mount within 8s and no runtime error was captured"],
      };
    } finally {
      await page.close();
    }
  };
}
