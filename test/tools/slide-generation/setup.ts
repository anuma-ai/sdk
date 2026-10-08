import fs from "node:fs";
import path from "node:path";

import type { StepFinishEvent } from "../../../src/lib/chat/toolLoop.js";
import type { AnumaNode } from "../../../src/tools/slides/index.js";
import { parseJsx, SLIDES_FILE_PATH, walk } from "../../../src/tools/slides/index.js";
import { renderDeckToHtml } from "./renderHtml.js";
import { runToolLoop } from "../setup.js";

export {
  config,
  extractText,
  printResult,
  runToolLoop,
  wrapTool,
  type ToolCallLog,
} from "../setup.js";
export type { StepFinishEvent };

import { config as _config, requirePortalKey, type ToolCallLog } from "../setup.js";

export function succeeded(entry: ToolCallLog): boolean {
  let r = entry.result;
  if (typeof r === "string") {
    try {
      r = JSON.parse(r);
    } catch {
      return true;
    }
  }
  return !(r !== null && typeof r === "object" && "error" in r);
}

export type ServerToolSchema = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

let cachedServerTools: ServerToolSchema[] | null = null;

export async function getServerToolSchemas(names: string[]): Promise<ServerToolSchema[]> {
  if (cachedServerTools) {
    const nameSet = new Set(names);
    return cachedServerTools.filter((t) => nameSet.has(t.function.name));
  }
  const res = await fetch(`${_config.baseUrl}/api/v1/tools`, {
    headers: { "X-API-Key": _config.portalKey },
  });
  if (!res.ok) throw new Error(`Failed to fetch server tools: ${res.status}`);
  const raw = (await res.json()) as Record<string, unknown>;
  const toolsMap = ("tools" in raw && typeof raw.tools === "object" ? raw.tools : raw) as Record<
    string,
    Record<string, unknown>
  >;
  cachedServerTools = Object.values(toolsMap).map((t) => {
    const schema = (t.schema ?? t) as {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
    return {
      type: "function" as const,
      function: {
        name: schema.name,
        description: schema.description,
        parameters: schema.parameters,
      },
    };
  });
  console.log(`  Fetched ${cachedServerTools.length} server tools from portal`);
  const nameSet = new Set(names);
  const matched = cachedServerTools.filter((t) => nameSet.has(t.function.name));
  console.log(`  Matched ${matched.length} tool(s) for: ${names.join(", ")}`);
  return matched;
}

export async function timedToolLoop(
  options: Parameters<typeof runToolLoop>[0]
): Promise<
  Awaited<ReturnType<typeof runToolLoop>> & { elapsedMs: number; rounds: StepFinishEvent[] }
> {
  requirePortalKey();
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

export type FileStore = Map<string, string>;

export function createFileStore(): FileStore {
  return new Map();
}

export function snapshot(store: FileStore): Map<string, string> {
  return new Map(store);
}

export function getDeck(store: FileStore): AnumaNode {
  const raw = store.get(SLIDES_FILE_PATH);
  if (!raw) throw new Error(`${SLIDES_FILE_PATH} not found in store`);
  return parseJsx(raw);
}

export function tryGetDeck(store: FileStore): AnumaNode | null {
  const raw = store.get(SLIDES_FILE_PATH);
  if (!raw) return null;
  try {
    return parseJsx(raw);
  } catch {
    return null;
  }
}

export function slidesOf(deck: AnumaNode): AnumaNode[] {
  return deck.children.filter((c): c is AnumaNode => typeof c !== "string" && c.tag === "Slide");
}

export function elementsOf(node: AnumaNode): AnumaNode[] {
  return node.children.filter((c): c is AnumaNode => typeof c !== "string");
}

export function allSlideText(deck: AnumaNode): string {
  const out: string[] = [];
  walk(deck, (node) => {
    if (node.tag === "Text") {
      const body = node.children.filter((c): c is string => typeof c === "string").join("");
      if (body) out.push(body);
    }
  });
  return out.join("\n");
}

const OUTPUT_DIR = path.resolve(__dirname, ".output");

export function dumpFiles(
  store: FileStore,
  testName: string,
  meta?: { error?: string | null; outDir?: string }
): string {
  const baseDir = meta?.outDir ?? OUTPUT_DIR;
  const dir = path.join(baseDir, testName.replace(/[^a-zA-Z0-9-_/]/g, "_"));
  fs.mkdirSync(dir, { recursive: true });
  for (const [filePath, content] of store) {
    const fullPath = path.join(dir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
  }

  const deck = tryGetDeck(store);
  const slideCount = deck
    ? deck.children.filter((c) => typeof c !== "string" && c.tag === "Slide").length
    : 0;
  const failureReasons: string[] = [];
  if (meta?.error) failureReasons.push(`Test reported an error: ${meta.error}`);
  if (!deck) failureReasons.push("slides.jsx was missing or unparseable");
  else if (slideCount === 0) failureReasons.push("Deck parsed but has zero <Anuma.Slide> children");

  if (failureReasons.length > 0) {
    fs.writeFileSync(
      path.join(dir, "FAILED.txt"),
      `Dump marked as failed by dumpFiles().\n\n${failureReasons.join("\n")}\n`,
      "utf-8"
    );
    console.log(
      `  Output written to ${path.relative(process.cwd(), dir)}/ (FAILED — skipped from index)`
    );
    return dir;
  }

  const stale = path.join(dir, "FAILED.txt");
  if (fs.existsSync(stale)) fs.unlinkSync(stale);
  const html = renderDeckToHtml(deck!, testName);
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
  if (baseDir === OUTPUT_DIR) writeOutputIndex();

  console.log(`  Output written to ${path.relative(process.cwd(), dir)}/`);
  return dir;
}

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
