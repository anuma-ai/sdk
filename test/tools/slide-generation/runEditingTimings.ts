/**
 * Diagnostic runner: generate a short deck, then walk through several
 * typical edit requests (change color, add a slide, remove a slide,
 * change copy, move an element). Prints detailed per-request timing so
 * you can see exactly where the wall time goes when "asking to change
 * the color takes minutes".
 *
 * Per request logs:
 *   - Wall time
 *   - Number of LLM rounds
 *   - Per-round duration (round end - round start)
 *   - Tool calls in each round (name + short args + tool-side duration)
 *   - Token totals in / out
 *
 * Per run (end-of-script summary): a table with wall / rounds / tokens
 * per request so you can spot the slow ones at a glance.
 *
 * Run:
 *   pnpm exec tsx test/tools/slide-generation/runEditingTimings.ts
 *
 * Model defaults to E2E_MODEL (or kimi-k2p5 if unset). Set EDIT_MODEL to
 * override just this script:
 *   EDIT_MODEL=openai/gpt-5.4 pnpm exec tsx test/tools/slide-generation/runEditingTimings.ts
 */

import "dotenv/config";

import { runToolLoop } from "../../../src/lib/chat/toolLoop.js";
import {
  buildSlideSystemPrompt,
  createSlideTools,
} from "../../../src/tools/slides/index.js";
import type { ToolConfig } from "../../../src/lib/chat/useChat/types.js";
import { normalizePath, type AppFileStorage } from "../../../src/tools/appGeneration.js";
import { config, createFileStore, type FileStore } from "./setup.js";

const MODEL = process.env.EDIT_MODEL || config.model;

interface ToolCallTiming {
  name: string;
  argsPreview: string;
  durationMs: number;
}

interface RoundTiming {
  stepIndex: number;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  toolCalls: ToolCallTiming[];
}

interface RequestTiming {
  label: string;
  userText: string;
  wallMs: number;
  rounds: RoundTiming[];
  finalText: string;
  error: string | null;
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

/**
 * Wrap a ToolConfig to capture per-call wall time. Distinct from
 * setup.ts's `wrapTool` so callers that only care about latency don't
 * pay the JSON stringify cost twice.
 */
function wrapToolWithTiming(
  tool: ToolConfig,
  collect: (call: { name: string; argsPreview: string; durationMs: number }) => void
): ToolConfig {
  const original = tool.executor!;
  const name = (tool as { function: { name: string } }).function.name;
  tool.executor = async (args: Record<string, unknown>) => {
    const argsPreview = shortenArgs(args);
    const start = performance.now();
    try {
      const result = await original(args);
      const durationMs = Math.round(performance.now() - start);
      collect({ name, argsPreview, durationMs });
      return typeof result === "string" ? result : JSON.stringify(result);
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      collect({ name, argsPreview: argsPreview + " [THREW]", durationMs });
      throw err;
    }
  };
  return tool;
}

/** Compact args preview — keep it scannable in console output. */
function shortenArgs(args: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(args)) {
    if (k === "slideJsx" || k === "jsx") {
      const s = typeof v === "string" ? v : "";
      parts.push(`${k}=<${s.length} chars>`);
      continue;
    }
    if (k === "operations" && Array.isArray(v)) {
      const ops = v
        .filter((op): op is Record<string, unknown> => !!op && typeof op === "object")
        .map((op) => String(op.action ?? "?"));
      parts.push(`operations=[${ops.join(", ")}]`);
      continue;
    }
    if (typeof v === "string") {
      parts.push(`${k}=${JSON.stringify(v.length > 40 ? v.slice(0, 37) + "..." : v)}`);
      continue;
    }
    parts.push(`${k}=${JSON.stringify(v)}`);
  }
  return parts.join(" ");
}

function extractFinalText(result: Awaited<ReturnType<typeof runToolLoop>>): string {
  if (!result.data) return "";
  const data = result.data as {
    output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (Array.isArray(data.output)) {
    return data.output
      .filter((o) => o.type === "message")
      .flatMap((o) => o.content ?? [])
      .filter((c) => c.type === "output_text")
      .map((c) => c.text ?? "")
      .join("")
      .trim();
  }
  if (Array.isArray(data.choices)) {
    return (data.choices[0]?.message?.content ?? "").trim();
  }
  return "";
}

async function runRequest(
  label: string,
  userText: string,
  store: FileStore
): Promise<RequestTiming> {
  console.log(`\n${"━".repeat(72)}\n  ${label}\n  user> ${userText}\n${"━".repeat(72)}`);
  const callsByRound: ToolCallTiming[][] = [[]];
  let currentRoundCalls = callsByRound[0]!;
  const rounds: RoundTiming[] = [];
  let lastRoundStart = performance.now();
  const storage = createMapStorage(store);
  const slideTools = createSlideTools({
    getConversationId: () => "editing-timings",
    storage,
    displaySlides: async () => ({}),
  });
  const tools = slideTools.map((t) =>
    wrapToolWithTiming(t, (call) => currentRoundCalls.push(call))
  );
  const start = performance.now();
  const result = await runToolLoop({
    messages: [
      {
        role: "system",
        content: [{ type: "text", text: buildSlideSystemPrompt() }],
      },
      { role: "user", content: [{ type: "text", text: userText }] },
    ],
    model: MODEL,
    baseUrl: config.baseUrl,
    headers: { "X-API-Key": config.portalKey },
    apiType: config.apiType,
    tools,
    toolChoice: "auto",
    maxToolRounds: 20,
    onStepFinish: (event) => {
      const now = performance.now();
      rounds.push({
        stepIndex: event.stepIndex,
        durationMs: Math.round(now - lastRoundStart),
        inputTokens: event.usage.inputTokens ?? 0,
        outputTokens: event.usage.outputTokens ?? 0,
        toolCalls: currentRoundCalls,
      });
      lastRoundStart = now;
      // New collection slot for the next round's tool calls.
      callsByRound.push([]);
      currentRoundCalls = callsByRound[callsByRound.length - 1]!;
    },
  });
  const wallMs = Math.round(performance.now() - start);

  // Per-round console dump.
  for (const round of rounds) {
    const dur = (round.durationMs / 1000).toFixed(2);
    const tokens = `in=${round.inputTokens} out=${round.outputTokens}`;
    const tools = round.toolCalls.length
      ? round.toolCalls
          .map((c) => `${c.name}(${c.argsPreview}) ${c.durationMs}ms`)
          .join("\n      ")
      : "(no tool calls — final text turn)";
    console.log(`  round ${round.stepIndex}: ${dur}s · ${tokens}`);
    console.log(`      ${tools}`);
  }
  const finalText = extractFinalText(result);
  console.log(
    `\n  TOTAL: ${(wallMs / 1000).toFixed(1)}s · ${rounds.length} rounds` +
      (result.error ? ` · error: ${result.error}` : "")
  );
  if (finalText) console.log(`  assistant> ${finalText.slice(0, 200)}`);
  return { label, userText, wallMs, rounds, finalText, error: result.error };
}

function printSummary(timings: RequestTiming[]): void {
  console.log(`\n${"═".repeat(72)}\n  SUMMARY (model: ${MODEL})\n${"═".repeat(72)}`);
  console.log(
    `  ${"Request".padEnd(28)} ${"Wall".padStart(7)} ${"Rounds".padStart(7)} ${"In tok".padStart(8)} ${"Out tok".padStart(8)}`
  );
  for (const t of timings) {
    const inTok = t.rounds.reduce((a, r) => a + r.inputTokens, 0);
    const outTok = t.rounds.reduce((a, r) => a + r.outputTokens, 0);
    console.log(
      `  ${t.label.padEnd(28)} ${(t.wallMs / 1000).toFixed(1).padStart(6)}s ${String(
        t.rounds.length
      ).padStart(7)} ${inTok.toLocaleString().padStart(8)} ${outTok.toLocaleString().padStart(8)}`
    );
  }
  const totalWall = timings.reduce((a, t) => a + t.wallMs, 0);
  console.log(`  ${"-".repeat(70)}`);
  console.log(`  ${"all".padEnd(28)} ${(totalWall / 1000).toFixed(1).padStart(6)}s`);
}

async function main(): Promise<void> {
  if (!config.portalKey) {
    console.error("PORTAL_API_KEY is required (set in .env).");
    process.exit(1);
  }
  const store = createFileStore();
  const timings: RequestTiming[] = [];

  // Initial deck generation. Keep it short so the edit cycle isn't
  // dominated by setup time.
  timings.push(
    await runRequest(
      "1. generate deck",
      "Make a 3-slide pitch deck for a boutique coffee subscription called Atlas Roasters. Cover, brand story, and pricing.",
      store
    )
  );

  // A realistic edit sequence — each one is a typical user request you'd
  // make in chat after seeing the initial deck. Designed to exercise
  // different tool-call shapes.
  timings.push(
    await runRequest("2. change accent color", "Change the accent color to a forest green.", store)
  );
  timings.push(
    await runRequest("3. rename brand", "Rename Atlas Roasters to Northern Roastery everywhere in the deck.", store)
  );
  timings.push(
    await runRequest("4. add a slide", "Add a slide about our supply chain, between the brand story and pricing.", store)
  );
  timings.push(
    await runRequest("5. remove a slide", "Remove the pricing slide.", store)
  );
  timings.push(
    await runRequest("6. move element", "On the cover slide, move the hero text down by ~50px.", store)
  );

  printSummary(timings);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
