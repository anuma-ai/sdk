/**
 * Shared setup for slide-generation tool e2e tests.
 *
 * Extends the base test/tools/setup.ts with slide-generation-specific
 * utilities: in-memory file store for slides.json plus any images, and
 * output dumping of the resulting deck JSON to disk for inspection.
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
import type { StepFinishEvent } from "../../../src/lib/chat/toolLoop.js";
import type { SlideDeck } from "../../../src/tools/slides/index.js";
import { renderDeckToHtml } from "./renderHtml.js";

export { config, extractText, printResult, wrapTool, type ToolCallLog } from "../setup.js";
export { runToolLoop };
export type { StepFinishEvent };

/**
 * Wrapper that times the tool loop, captures per-round info via
 * `onStepFinish`, and logs the total duration. Returns the raw tool-loop
 * result plus `elapsedMs` and the ordered `rounds` array.
 *
 * If the caller also passes `onStepFinish`, it's invoked after the
 * captured event is recorded.
 */
export async function timedToolLoop(
  options: Parameters<typeof runToolLoop>[0]
): Promise<
  Awaited<ReturnType<typeof runToolLoop>> & { elapsedMs: number; rounds: StepFinishEvent[] }
> {
  const rounds: StepFinishEvent[] = [];
  const userOnStepFinish = options.onStepFinish;
  const start = performance.now();
  const result = await runToolLoop({
    ...options,
    onStepFinish: (event) => {
      rounds.push(event);
      userOnStepFinish?.(event);
    },
  });
  const elapsedMs = Math.round(performance.now() - start);
  console.log(`  Tool loop: ${(elapsedMs / 1000).toFixed(1)}s`);
  return { ...result, elapsedMs, rounds };
}

/**
 * Print a per-round summary: rounds, wall time, input/output tokens, and
 * tool-call names in order. Designed to give a compact, scannable record
 * of what the model did during an e2e run.
 */
export function printRunSummary(rounds: StepFinishEvent[], elapsedMs: number): void {
  if (rounds.length === 0) {
    console.log(`  Rounds: 0 · ${(elapsedMs / 1000).toFixed(1)}s total`);
    return;
  }

  let totalInput = 0;
  let totalOutput = 0;
  for (const r of rounds) {
    totalInput += r.usage.inputTokens ?? 0;
    totalOutput += r.usage.outputTokens ?? 0;
  }
  const usage = totalInput || totalOutput ? ` · tokens in=${totalInput} out=${totalOutput}` : "";
  console.log(`  Rounds: ${rounds.length} · ${(elapsedMs / 1000).toFixed(1)}s total${usage}`);
  for (const r of rounds) {
    const calls = r.toolCalls.map((c) => c.name).join(", ") || "(no tool calls)";
    const roundTokens =
      r.usage.inputTokens || r.usage.outputTokens
        ? ` [in=${r.usage.inputTokens ?? "?"} out=${r.usage.outputTokens ?? "?"}]`
        : "";
    console.log(`    · Round ${r.stepIndex}: ${calls}${roundTokens}`);
  }
}

// ---------------------------------------------------------------------------
// In-memory file store (replaces IndexedDB for tests)
// ---------------------------------------------------------------------------

export type FileStore = Map<string, string>;

export function createFileStore(): FileStore {
  return new Map();
}

// ---------------------------------------------------------------------------
// Snapshot utility
// ---------------------------------------------------------------------------

/** Take a snapshot of the file store (deep copy). */
export function snapshot(store: FileStore): Map<string, string> {
  return new Map(store);
}

// ---------------------------------------------------------------------------
// Deck helpers
// ---------------------------------------------------------------------------

/** Parse slides.json from the store. Throws if missing or invalid. */
export function getDeck(store: FileStore): SlideDeck {
  const raw = store.get("slides.json");
  if (!raw) throw new Error("slides.json not found in store");
  return JSON.parse(raw) as SlideDeck;
}

/** Return the deck or null if not present / unparseable. */
export function tryGetDeck(store: FileStore): SlideDeck | null {
  const raw = store.get("slides.json");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SlideDeck;
  } catch {
    return null;
  }
}

/** Extract all text element contents from a deck (for content-based assertions). */
export function allSlideText(deck: SlideDeck): string {
  return deck.slides
    .flatMap((s) =>
      s.elements.filter((e) => e.kind === "text").map((e) => (e as { text: string }).text)
    )
    .join("\n");
}

// ---------------------------------------------------------------------------
// Output dumping
// ---------------------------------------------------------------------------

const OUTPUT_DIR = path.resolve(__dirname, ".output");

/**
 * Write all files from the store to disk for inspection. If slides.json is
 * present and parses as a SlideDeck, also emits a self-contained `index.html`
 * you can open in a browser to visually step through the deck, and refreshes
 * the top-level .output/index.html that links to every dumped deck.
 */
export function dumpFiles(store: FileStore, testName: string): string {
  const dir = path.join(OUTPUT_DIR, testName.replace(/[^a-zA-Z0-9-_/]/g, "_"));
  fs.mkdirSync(dir, { recursive: true });
  for (const [filePath, content] of store) {
    const fullPath = path.join(dir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
  }

  const deck = tryGetDeck(store);
  if (deck) {
    const html = renderDeckToHtml(deck, testName);
    fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
    writeOutputIndex();
  }

  console.log(`  Output written to ${path.relative(process.cwd(), dir)}/`);
  return dir;
}

/**
 * Rewrite the top-level `.output/index.html` with a link to every dumped
 * deck. Scans the directory each call so stale dirs don't linger in the list.
 */
function writeOutputIndex(): void {
  const entries = fs
    .readdirSync(OUTPUT_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(OUTPUT_DIR, e.name, "index.html")))
    .map((e) => e.name)
    .sort();

  const items = entries
    .map((name) => `    <li><a href="./${encodeURIComponent(name)}/index.html">${name}</a></li>`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Slide generation output</title>
<style>
  *{box-sizing:border-box;margin:0}
  body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#f8fafc;padding:40px;min-height:100vh}
  h1{font-size:22px;font-weight:600;margin-bottom:6px}
  p{color:#94a3b8;font-size:14px;margin-bottom:24px}
  ul{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;max-width:900px}
  li a{display:block;padding:16px 18px;border:1px solid #334155;border-radius:10px;background:#1e293b;color:#f8fafc;text-decoration:none;font-size:14px;transition:background .15s,border-color .15s}
  li a:hover{background:#273548;border-color:#475569}
  .empty{color:#64748b;font-size:14px}
</style>
</head>
<body>
  <h1>Slide generation output</h1>
  <p>${entries.length} deck${entries.length === 1 ? "" : "s"}. Click to open.</p>
  ${entries.length === 0 ? '<p class="empty">No dumps yet.</p>' : `<ul>\n${items}\n  </ul>`}
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, "index.html"), html, "utf-8");
}
