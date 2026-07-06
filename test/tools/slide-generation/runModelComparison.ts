/**
 * One-off comparison runner: generate the SAME 10-slide deck (with images)
 * across four LLMs and dump each result to its own subdirectory so you
 * can flip between them and judge real-world performance.
 *
 * Run:
 *   pnpm exec tsx test/tools/slide-generation/runModelComparison.ts
 *
 * Output:
 *   test/tools/slide-generation/.output/model-comparison/
 *     index.html                       — side-by-side links + per-model summary
 *     openai__gpt-5p4/                 — one dir per model, contains slides.jsx
 *     anthropic__claude-sonnet-4-6/      and index.html (or FAILED.txt)
 *     anthropic__claude-opus-4-7/
 *     fireworks__kimi-k2p5/
 *
 * Models can be overridden via the COMPARE_MODELS env var (comma-separated).
 */

import "dotenv/config";

import fs from "node:fs";
import path from "node:path";

import { buildSlideSystemPrompt, createSlideTools } from "../../../src/tools/slides/index.js";
import { runToolLoop } from "../../../src/lib/chat/toolLoop.js";
import { normalizePath, type AppFileStorage } from "../../../src/tools/appGeneration.js";
import {
  config,
  createFileStore,
  dumpFiles,
  getServerToolSchemas,
  type FileStore,
} from "./setup.js";

const DEFAULT_MODELS = [
  "openai/gpt-5.4",
  "anthropic/claude-sonnet-4-6",
  "anthropic/claude-opus-4-7",
  "fireworks/accounts/fireworks/models/kimi-k2p5",
];

const MODELS = process.env.COMPARE_MODELS
  ? process.env.COMPARE_MODELS.split(",").map((s) => s.trim())
  : DEFAULT_MODELS;

// COMPARE_OUT overrides the output subdirectory so multiple runs (different
// prompts / topics) can coexist without overwriting each other.
const OUT_SUBDIR = process.env.COMPARE_OUT ?? "model-comparison";

const OUT_DIR = path.resolve(__dirname, ".output", OUT_SUBDIR);

const DEFAULT_PROMPT = [
  "Build a 10-slide investor pitch deck for Volta Atelier, a high-end electric vehicle startup.",
  "Slide shape: cover, problem, market opportunity with stats, brand story, product showcase,",
  "founder quote, competitive comparison, business model, why-now moment, and a closing ask slide.",
  "Use a mix of composition layouts including ones with image slots; lean on the variable-count",
  "flex regions (agenda / stats / facts / cards) where helpful.",
  "For images: generate 2-3 real images via AnumaMediaMCP-anuma_create_image and reference them",
  "in the relevant slide JSX. REMOVE any unused <Anuma.Image> placeholder elements from slides you",
  "don't fill with a real URL — don't ship the sentinel.",
  "Pick whichever design system best matches a premium automotive brand and apply it consistently.",
].join(" ");

const PROMPT = process.env.COMPARE_PROMPT ?? DEFAULT_PROMPT;

function modelSlug(model: string): string {
  return model.replace(/[^a-zA-Z0-9-]/g, "_");
}

function createMapStorage(store: FileStore): Pick<AppFileStorage, "getFile" | "putFile"> {
  return {
    getFile: async (_cid: string, p: string) => {
      const content = store.get(normalizePath(p));
      return content !== undefined ? { path: normalizePath(p), content } : null;
    },
    putFile: async (_cid: string, p: string, content: string) => {
      store.set(normalizePath(p), content);
    },
  };
}

interface RunResult {
  model: string;
  slug: string;
  elapsedMs: number;
  slideCount: number;
  realImages: number;
  sentinelImages: number;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
  rounds: number;
}

async function runOne(model: string): Promise<RunResult> {
  const slug = modelSlug(model);
  console.log(`\n────────── ${model} ──────────`);
  const store = createFileStore();
  const storage = createMapStorage(store);
  const slideTools = createSlideTools({
    getConversationId: () => "compare-conversation",
    storage,
    hasImageGenerator: true,
    displaySlides: async () => ({}),
  });
  const imageSchemas = await getServerToolSchemas(["AnumaMediaMCP-anuma_create_image"]);
  const tools = [...slideTools, ...imageSchemas];

  let inputTokens = 0;
  let outputTokens = 0;
  let rounds = 0;
  const start = performance.now();
  const result = await runToolLoop({
    messages: [
      {
        role: "system",
        content: [
          {
            type: "text",
            text: buildSlideSystemPrompt({ hasImageGenerator: true }),
          },
        ],
      },
      { role: "user", content: [{ type: "text", text: PROMPT }] },
    ],
    model,
    baseUrl: config.baseUrl,
    headers: { "X-API-Key": config.portalKey },
    apiType: config.apiType,
    tools,
    toolChoice: "auto",
    maxToolRounds: 30,
    onStepFinish: (event) => {
      rounds++;
      inputTokens += event.usage.inputTokens ?? 0;
      outputTokens += event.usage.outputTokens ?? 0;
    },
  });
  const elapsedMs = Math.round(performance.now() - start);

  dumpFiles(store, slug, { outDir: OUT_DIR, error: result.error });

  const jsx = store.get("slides.jsx") ?? "";
  const slideCount = (jsx.match(/<Anuma\.Slide\b/g) ?? []).length;
  const realImages = (jsx.match(/src="https?:\/\/(?!placehold\.co)[^"]+"/g) ?? []).length;
  const sentinelImages = (jsx.match(/REPLACE_WITH_IMAGE_OR_REMOVE/g) ?? []).length;

  console.log(
    `  ${(elapsedMs / 1000).toFixed(1)}s · ${rounds} rounds · in=${inputTokens} out=${outputTokens}`
  );
  console.log(
    `  ${slideCount} slides · ${realImages} real images · ${sentinelImages} sentinels` +
      (result.error ? ` · error: ${result.error}` : "")
  );

  return {
    model,
    slug,
    elapsedMs,
    slideCount,
    realImages,
    sentinelImages,
    error: result.error,
    inputTokens,
    outputTokens,
    rounds,
  };
}

function writeIndex(results: RunResult[]): void {
  const rows = results
    .map((r) => {
      const ok = r.error === null && r.slideCount > 0;
      const dirRel = `./${r.slug}/`;
      const status = ok ? "OK" : "FAILED";
      const statusColor = ok ? "#16a34a" : "#dc2626";
      const link = ok
        ? `<a href="${dirRel}index.html">view deck</a>`
        : `<a href="${dirRel}FAILED.txt">view FAILED.txt</a>`;
      return `
    <tr>
      <td><code>${r.model}</code></td>
      <td style="color:${statusColor};font-weight:600">${status}</td>
      <td>${r.slideCount}</td>
      <td>${r.realImages}</td>
      <td>${r.sentinelImages}</td>
      <td>${(r.elapsedMs / 1000).toFixed(1)}s</td>
      <td>${r.rounds}</td>
      <td>${r.inputTokens.toLocaleString()}</td>
      <td>${r.outputTokens.toLocaleString()}</td>
      <td>${link}</td>
      <td>${r.error ? `<span style="color:#dc2626">${escapeHtml(r.error)}</span>` : ""}</td>
    </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Model comparison · 10-slide deck</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
           max-width: 1300px; margin: 32px auto; padding: 0 24px; color: #18181B; }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 8px; }
    p.sub { color: #71717A; margin: 0 0 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #E4E4E7; vertical-align: top; }
    th { background: #FAFAFA; font-weight: 600; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px;
           background: #F4F4F5; padding: 2px 6px; border-radius: 4px; }
    pre.prompt { background: #FAFAFA; border: 1px solid #E4E4E7; padding: 16px; border-radius: 8px;
                 font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px;
                 line-height: 1.6; white-space: pre-wrap; margin: 16px 0 24px; }
  </style>
</head>
<body>
  <h1>10-slide deck — model comparison</h1>
  <p class="sub">Same prompt, same tools (slide suite + AnumaMediaMCP), one row per model.</p>
  <pre class="prompt">${escapeHtml(PROMPT)}</pre>
  <table>
    <thead>
      <tr>
        <th>Model</th>
        <th>Status</th>
        <th>Slides</th>
        <th>Real images</th>
        <th>Sentinels left</th>
        <th>Wall</th>
        <th>Rounds</th>
        <th>Tokens in</th>
        <th>Tokens out</th>
        <th>Output</th>
        <th>Error</th>
      </tr>
    </thead>
    <tbody>${rows}
    </tbody>
  </table>
</body>
</html>
`;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), html, "utf-8");
  console.log(
    `\nComparison index → ${path.relative(process.cwd(), path.join(OUT_DIR, "index.html"))}`
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function main(): Promise<void> {
  if (!config.portalKey) {
    console.error("PORTAL_API_KEY is required (set in .env).");
    process.exit(1);
  }
  // Clear the comparison output dir so stale results from prior runs don't
  // confuse the index. Per-model subdirs are re-created by dumpFiles.
  if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const results: RunResult[] = [];
  for (const model of MODELS) {
    try {
      results.push(await runOne(model));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  EXCEPTION: ${message}`);
      results.push({
        model,
        slug: modelSlug(model),
        elapsedMs: 0,
        slideCount: 0,
        realImages: 0,
        sentinelImages: 0,
        error: message,
        inputTokens: 0,
        outputTokens: 0,
        rounds: 0,
      });
    }
  }
  writeIndex(results);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
