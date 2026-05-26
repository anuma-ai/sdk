/**
 * Edit-flow probe: instruments a deck-edit cycle to see where the time goes.
 *
 * Generates a deck first (fast, batched), then runs a representative edit
 * ("rename X to Y" — exercises read_slides + patch_slides). For the edit
 * phase we capture per-round payload bytes (via onRequest) AND per-round
 * wall time (via onStepFinish), so we can tell whether the slowness is
 * "many rounds", "big payloads per round", "one slow round of model
 * thinking", or some combination.
 */

import { describe, expect, it } from "vitest";

import { buildSlideSystemPrompt } from "../../../src/tools/slides/index.js";
import type { RequestEvent, StepFinishEvent } from "../../../src/lib/chat/toolLoop.js";
import {
  config,
  createFileStore,
  dumpFiles,
  extractText,
  printResult,
  timedToolLoop,
  type ToolCallLog,
  wrapTool,
} from "./setup.js";
import { createTestSlideTools } from "./tools.js";

const SYSTEM_PROMPT = buildSlideSystemPrompt();

type Message = {
  role: string;
  content: Array<{ type: string; text: string }>;
};

function makeMessages(userText: string, systemPrompt?: string): Message[] {
  const msgs: Message[] = [];
  if (systemPrompt) {
    msgs.push({ role: "system", content: [{ type: "text", text: systemPrompt }] });
  }
  msgs.push({ role: "user", content: [{ type: "text", text: userText }] });
  return msgs;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

describe("slide edit probe", () => {
  it("measures payload + per-round time for an edit on an existing deck", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestSlideTools(store).map((t) => wrapTool(t, log));

    // Phase 1 — generate the initial deck (not the focus; just need realistic state).
    const genResult = await timedToolLoop({
      messages: makeMessages(
        "Create a 5-slide deck introducing a new productivity app called FocusFlow.",
        SYSTEM_PROMPT
      ),
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 15,
    });
    expect(genResult.error).toBeNull();
    dumpFiles(store, "focusflow-edit-probe-gen");

    const initialJsxBytes = (store.get("slides.jsx") ?? "").length;
    const callsAfterGen = log.length;

    // Phase 2 — edit. This is the slow phase we want to understand.
    const editMessages: Message[] = [
      ...makeMessages(
        "Create a 5-slide deck introducing a new productivity app called FocusFlow.",
        SYSTEM_PROMPT
      ),
      {
        role: "assistant",
        content: [{ type: "text", text: extractText(genResult) || "Done." }],
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: 'Rename the product from "FocusFlow" to "Momentum" throughout the deck.',
          },
        ],
      },
    ];

    const requests: Array<RequestEvent & { wallStart: number }> = [];
    const steps: Array<StepFinishEvent & { wallEnd: number }> = [];

    const editStart = performance.now();
    const editResult = await timedToolLoop({
      messages: editMessages,
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 15,
      onRequest: (event) => {
        requests.push({ ...event, wallStart: performance.now() });
      },
      onStepFinish: (event) => {
        steps.push({ ...event, wallEnd: performance.now() });
      },
    });
    const editElapsed = performance.now() - editStart;
    printResult(editResult);
    dumpFiles(store, "focusflow-edit-probe-renamed");
    expect(editResult.error).toBeNull();

    const editCalls = log.slice(callsAfterGen);

    // Per-round wall time: time from the round's request dispatch to the
    // next round's request dispatch (or to overall end for the final round).
    const roundEndTimes = requests
      .slice(1)
      .map((r) => r.wallStart)
      .concat(editStart + editElapsed);

    console.log("\n  Edit flow per-round breakdown:");
    console.log(
      "  round | msgs |  tools |        body |    messages |       tools |   wall time | tool calls"
    );
    console.log(
      "  ------+------+--------+-------------+-------------+-------------+-------------+-----------"
    );
    for (let i = 0; i < requests.length; i++) {
      const r = requests[i];
      const wallMs = roundEndTimes[i] - r.wallStart;
      const callsThisRound = steps[i]?.toolCalls.map((tc) => tc.name).join(", ") ?? "(final)";
      const round = String(r.round).padStart(5);
      const msgs = String(r.messageCount).padStart(4);
      const toolsN = String(r.toolCount).padStart(6);
      const body = formatBytes(r.bodyBytes).padStart(11);
      const msgsB = formatBytes(r.messagesBytes).padStart(11);
      const toolsB = formatBytes(r.toolsBytes).padStart(11);
      const wall = formatMs(wallMs).padStart(11);
      console.log(
        `  ${round} | ${msgs} | ${toolsN} | ${body} | ${msgsB} | ${toolsB} | ${wall} | ${callsThisRound}`
      );
    }

    const totalBytes = requests.reduce((s, r) => s + r.bodyBytes, 0);
    console.log(`\n  Initial deck (slides.jsx):  ${formatBytes(initialJsxBytes)}`);
    console.log(`  Edit rounds:                ${requests.length}`);
    console.log(`  Edit total wall time:       ${formatMs(editElapsed)}`);
    console.log(`  Edit total bytes sent:      ${formatBytes(totalBytes)}`);
    console.log(
      `  Tool calls during edit:     ${editCalls.map((c) => c.name).join(" → ") || "(none)"}`
    );
  });
});
