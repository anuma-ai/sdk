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

import { runToolLoop } from "../../../src/lib/chat/toolLoop.js";

export { config, extractText, printResult, wrapTool, type ToolCallLog } from "../setup.js";
export { runToolLoop };

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

/** Write all files from the store to disk for inspection. */
export function dumpFiles(store: FileStore, testName: string): string {
  const dir = path.join(OUTPUT_DIR, testName.replace(/[^a-zA-Z0-9-_/]/g, "_"));
  fs.mkdirSync(dir, { recursive: true });
  for (const [filePath, content] of store) {
    const fullPath = path.join(dir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
  }
  console.log(`  Output written to ${path.relative(process.cwd(), dir)}/`);
  return dir;
}

/** Write a root index.html linking to all app previews. Call after all tests. */
export function writeIndex(): void {
  if (!fs.existsSync(OUTPUT_DIR)) return;
  const dirs = fs
    .readdirSync(OUTPUT_DIR)
    .filter((d) => fs.statSync(path.join(OUTPUT_DIR, d)).isDirectory());
  const links = dirs.map((name) => `      <a href="${name}/">${name}</a>`).join("\n");
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
  </style>
</head>
<body>
  <h1>Generated Apps</h1>
${links}
</body>
</html>`;
  fs.writeFileSync(path.join(OUTPUT_DIR, "index.html"), html, "utf-8");
  console.log(`  Index written to ${path.relative(process.cwd(), OUTPUT_DIR)}/index.html`);
}
