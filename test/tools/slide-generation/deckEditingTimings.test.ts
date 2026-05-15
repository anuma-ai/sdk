/**
 * Diagnostic e2e: builds a small deck then performs several edits in
 * sequence, logging exactly which tool calls fire and how long each
 * one takes. Designed to make it obvious why slide edits feel slow —
 * the bottleneck is usually `read_slides` returning the full deck JSX
 * plus 2-3 LLM rounds per edit, each paying TTFT + generation latency.
 *
 * Per request the test logs:
 *   • wall time (request start → final assistant text)
 *   • round count, input/output tokens
 *   • every tool call with name, duration, truncated args, result size
 *
 * Run via the e2e config:
 *   pnpm exec vitest run -c vitest.e2e.config.mts \
 *     test/tools/slide-generation/deckEditingTimings.test.ts
 *
 * Override the model via env:
 *   E2E_MODEL="openai/gpt-5.4" pnpm exec vitest run -c vitest.e2e.config.mts \
 *     test/tools/slide-generation/deckEditingTimings.test.ts
 */

import { describe, expect, it } from "vitest";

import { runToolLoop } from "../../../src/lib/chat/toolLoop.js";
import type { ToolConfig } from "../../../src/lib/chat/useChat/types.js";
import { buildSlideSystemPrompt } from "../../../src/tools/slides/index.js";
import { createTestSlideTools } from "./tools.js";
import { config, createFileStore } from "./setup.js";

type Message = {
  role: string;
  content: Array<{ type: string; text: string }>;
};

/** A single tool-call invocation captured with timing + payload metadata. */
interface CallLog {
  name: string;
  durationMs: number;
  argsBrief: string;
  argsBytes: number;
  resultBytes: number;
  error: boolean;
}

/** Wrap a tool to record per-call duration, arg size, and result size. */
function wrapTimedTool(tool: ToolConfig, log: CallLog[]): ToolConfig {
  const original = tool.executor!;
  const name = (tool as { function: { name: string } }).function.name;
  tool.executor = async (a: Record<string, unknown>) => {
    const start = performance.now();
    const argsStr = JSON.stringify(a);
    const argsBytes = Buffer.byteLength(argsStr, "utf-8");
    let error = false;
    let result: unknown;
    try {
      result = await original(a);
    } catch (e) {
      error = true;
      result = e instanceof Error ? e.message : String(e);
    }
    const durationMs = Math.round(performance.now() - start);
    const resultStr = typeof result === "string" ? result : JSON.stringify(result);
    const resultBytes = Buffer.byteLength(resultStr, "utf-8");
    log.push({
      name,
      durationMs,
      argsBrief: briefArgs(name, a),
      argsBytes,
      resultBytes,
      error,
    });
    return resultStr;
  };
  return tool;
}

/** Compact one-line summary of what a tool call is doing. */
function briefArgs(name: string, args: Record<string, unknown>): string {
  if (name === "plan_deck") {
    return `slideCount=${args.slideCount} fontPreset=${args.fontPreset} palette=${args.paletteName} layouts=${Array.isArray(args.layouts) ? args.layouts.length : "?"}`;
  }
  if (name === "add_slide") {
    const jsx = typeof args.slideJsx === "string" ? args.slideJsx : "";
    return `slide=${args.slideIndex} layout=${args.layout} jsx=${jsx.length}B`;
  }
  if (name === "patch_slides") {
    const ops = Array.isArray(args.operations) ? args.operations : [];
    const actions = ops
      .map((o) => (o as { action?: string }).action ?? "?")
      .join(",");
    return `ops=${ops.length} [${actions}]`;
  }
  if (name === "read_slides") {
    return `(no args)`;
  }
  return JSON.stringify(args).slice(0, 80);
}

/** Snapshot of one user-message round-trip. */
interface RequestSnapshot {
  label: string;
  wallMs: number;
  rounds: number;
  inputTokens: number;
  outputTokens: number;
  calls: CallLog[];
  error: string | null;
}

const SYSTEM_PROMPT = buildSlideSystemPrompt();

function makeMessages(userText: string): Message[] {
  return [
    { role: "system", content: [{ type: "text", text: SYSTEM_PROMPT }] },
    { role: "user", content: [{ type: "text", text: userText }] },
  ];
}

async function runRequest(
  label: string,
  userText: string,
  store: ReturnType<typeof createFileStore>
): Promise<RequestSnapshot> {
  console.log(`\n══════════ ${label} ══════════`);
  console.log(`  > ${userText}`);
  const calls: CallLog[] = [];
  const tools = createTestSlideTools(store).map((t) => wrapTimedTool(t, calls));
  let inputTokens = 0;
  let outputTokens = 0;
  let rounds = 0;
  const start = performance.now();
  const result = await runToolLoop({
    messages: makeMessages(userText),
    model: config.model,
    baseUrl: config.baseUrl,
    headers: { "X-API-Key": config.portalKey },
    apiType: config.apiType,
    tools,
    toolChoice: "auto",
    maxToolRounds: 20,
    onStepFinish: (event) => {
      rounds++;
      inputTokens += event.usage.inputTokens ?? 0;
      outputTokens += event.usage.outputTokens ?? 0;
      console.log(
        `  • round ${event.stepIndex}: in=${event.usage.inputTokens ?? "?"} out=${event.usage.outputTokens ?? "?"} calls=[${event.toolCalls.map((c) => c.name).join(", ") || "—"}]`
      );
    },
  });
  const wallMs = Math.round(performance.now() - start);
  console.log(
    `  ⏱  ${(wallMs / 1000).toFixed(1)}s · ${rounds} round(s) · in=${inputTokens} out=${outputTokens}` +
      (result.error ? ` · ERROR ${result.error}` : "")
  );
  for (const c of calls) {
    const errMark = c.error ? " ✗" : "";
    console.log(
      `    [${(c.durationMs).toString().padStart(5, " ")}ms] ${c.name}${errMark}  args=${c.argsBytes}B result=${c.resultBytes}B  ${c.argsBrief}`
    );
  }
  return {
    label,
    wallMs,
    rounds,
    inputTokens,
    outputTokens,
    calls,
    error: result.error,
  };
}

function printSummary(snapshots: RequestSnapshot[]): void {
  console.log(`\n══════════ SUMMARY ══════════`);
  const totalMs = snapshots.reduce((a, s) => a + s.wallMs, 0);
  const totalIn = snapshots.reduce((a, s) => a + s.inputTokens, 0);
  const totalOut = snapshots.reduce((a, s) => a + s.outputTokens, 0);
  console.log(
    `  Total: ${(totalMs / 1000).toFixed(1)}s · in=${totalIn} out=${totalOut} (model=${config.model})`
  );
  console.log();
  const header = "  " +
    "label".padEnd(28) +
    "wall".padStart(8) +
    "  rounds".padStart(9) +
    "  in".padStart(8) +
    " out".padStart(7) +
    "  tools";
  console.log(header);
  console.log("  " + "─".repeat(header.length - 2));
  for (const s of snapshots) {
    const tools = s.calls.map((c) => `${c.name}(${c.durationMs}ms)`).join(", ");
    console.log(
      `  ${s.label.padEnd(28)}` +
        `${(s.wallMs / 1000).toFixed(1)}s`.padStart(8) +
        `${s.rounds}`.padStart(9) +
        `${s.inputTokens}`.padStart(8) +
        `${s.outputTokens}`.padStart(7) +
        `  ${tools}`
    );
  }
}

describe("deck-editing timings", () => {
  it(
    "logs request and tool-call timings for a build + 4 edits sequence",
    { timeout: 900_000 },
    async () => {
      const store = createFileStore();
      const snapshots: RequestSnapshot[] = [];

      snapshots.push(
        await runRequest(
          "BUILD: 3-slide cover/problem/ask",
          "Make a 3-slide pitch deck for Hearth, a meal-kit subscription for weeknight family dinners. Cover, problem, and the ask. Keep it short.",
          store
        )
      );

      snapshots.push(
        await runRequest(
          "EDIT 1: change accent color",
          "Change the accent color to a deep green.",
          store
        )
      );

      snapshots.push(
        await runRequest(
          "EDIT 2: rename the cover headline",
          "Change the cover headline to 'Dinner, sorted.'",
          store
        )
      );

      snapshots.push(
        await runRequest(
          "EDIT 3: add a pricing slide",
          "Add a new slide about pricing right after the cover. Three tiers: weekly $89, biweekly $99, monthly $109.",
          store
        )
      );

      snapshots.push(
        await runRequest(
          "EDIT 4: remove the problem slide",
          "Remove the problem slide.",
          store
        )
      );

      printSummary(snapshots);

      // Sanity: the build must have produced a deck. Edits are diagnostic
      // — they may sometimes fail upstream, and we still want the timing
      // log surfaced rather than the test bailing early.
      const built = snapshots[0]!;
      expect(built.error, "build request must succeed").toBeNull();
      expect(store.has("slides.jsx")).toBe(true);
    }
  );
});
