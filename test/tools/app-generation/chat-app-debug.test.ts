/**
 * End-to-end debug trace for app generation.
 *
 * Builds an AI chat app, then makes a style change and a functionality change,
 * and records EVERYTHING for each turn so you can see exactly how app-gen
 * flows and pinpoint where it breaks:
 *
 *   - `.output/chat-app-debug/system-prompt.txt`  — the system prompt sent each
 *     turn (confirm the App Builder guidance + window.app.complete contract).
 *   - `.output/chat-app-debug/trace.json`         — per turn: user prompt,
 *     conversation shape, every tool call with its args (the generated code /
 *     patches) + result, response text, timing, errors, file snapshot.
 *   - `.output/chat-app-debug/step-<label>/`       — the app files + a runnable
 *     index.html at each step (final and intermediary), via dumpFiles.
 *   - `.runs/<timestamp>-<model>.jsonl`            — per-step tool calls + token
 *     usage (the shared recorder, always on).
 *
 * Opt-in (long, hits the LLM):
 *   PORTAL_API_KEY=... RUN_CHAT_APP_DEBUG=1 \
 *     pnpm vitest run --config vitest.e2e.config.mts \
 *     test/tools/app-generation/chat-app-debug.test.ts
 *
 * Slow on the default dev model — each turn is multiple model round-trips plus
 * a Playwright verify. The trace is written after every turn, so even if a
 * later turn hits the timeout you still get a complete record of the turns that
 * finished. For a fast full run, set E2E_MODEL to a quicker model.
 */

import { afterAll, describe, expect, it } from "vitest";

import { buildAppSystemPrompt } from "../../../src/tools/appGeneration.js";
import {
  closeSharedBrowser,
  config,
  createFileStore,
  type DebugTraceStep,
  dumpFiles,
  extractText,
  printResult,
  timedToolLoop,
  type ToolCallLog,
  wrapTool,
  writeDebugTrace,
  writeIndex,
} from "./setup.js";
import { createTestAppTools } from "./tools.js";

const ENABLED = process.env.RUN_CHAT_APP_DEBUG === "1";
const SYSTEM_PROMPT = buildAppSystemPrompt();

type Message = { role: string; content: Array<{ type: string; text: string }> };
const systemMsg = (text: string): Message => ({
  role: "system",
  content: [{ type: "text", text }],
});
const userMsg = (text: string): Message => ({ role: "user", content: [{ type: "text", text }] });
const assistantMsg = (text: string): Message => ({
  role: "assistant",
  content: [{ type: "text", text }],
});

// 9 rounds: the prompt's full workflow on a substantial turn is
// (list_files / read_file re-orient) → create_file → critique_design →
// patch_file → audit_design → patch_file → verify_app. At 6 the model
// exhausts the budget on quality patches and never reaches verify_app
// (observed: 0 verify calls across 3 turns, every turn at exactly 6/6).
async function runTurn(messages: Message[], tools: unknown[], maxRounds = 9) {
  const result = await timedToolLoop({
    messages,
    model: config.model,
    baseUrl: config.baseUrl,
    headers: { "X-API-Key": config.portalKey },
    apiType: config.apiType,
    tools: tools as Parameters<typeof timedToolLoop>[0]["tools"],
    toolChoice: "auto",
    maxToolRounds: maxRounds,
  });
  return { result, responseText: extractText(result) || "Done." };
}

const TURNS = [
  {
    label: "1-generate",
    prompt:
      "Build a chat app: a scrollable message thread (my messages right, assistant left), a composer pinned to the bottom, and a typing indicator while a reply loads. The assistant's replies MUST come from a real window.app.complete(prompt) call — pass the running conversation as context each turn. Disable send while waiting, handle failures gracefully, and persist the thread to localStorage.",
  },
  {
    label: "2-style",
    prompt:
      "Switch it to a dark theme with a green accent — keep the layout and behavior, just restyle.",
  },
  {
    label: "3-feature",
    prompt:
      "Add a 'Clear chat' button in the header that empties the thread, and show a small timestamp under each message.",
  },
] as const;

describe("chat-app-debug", () => {
  afterAll(async () => {
    writeIndex();
    await closeSharedBrowser();
  });

  it.skipIf(!ENABLED)(
    "generate AI chat app -> style change -> functionality change, with a full trace",
    async () => {
      const store = createFileStore();
      const log: ToolCallLog[] = [];
      const tools = createTestAppTools(store).map((t) => wrapTool(t, log));
      const toolNames = tools.map((t) => t.function?.name ?? "unknown");
      const conversation: Message[] = [systemMsg(SYSTEM_PROMPT)];
      const steps: DebugTraceStep[] = [];
      let logStart = 0;

      for (let i = 0; i < TURNS.length; i++) {
        const turn = TURNS[i];
        conversation.push(userMsg(turn.prompt));

        const { result, responseText } = await runTurn(conversation, tools);
        printResult(result);

        const outputDir = `chat-app-debug/step-${turn.label}`;
        dumpFiles(store, outputDir);

        const turnToolCalls = log.slice(logStart);
        logStart = log.length;

        steps.push({
          step: i + 1,
          label: turn.label,
          userPrompt: turn.prompt,
          request: {
            messageRoles: conversation.map((m) => m.role),
            messageCount: conversation.length,
            toolsAvailable: toolNames,
          },
          response: {
            text: responseText,
            elapsedMs: result.elapsedMs,
            error: result.error ?? null,
            toolCallCount: turnToolCalls.length,
          },
          toolCalls: turnToolCalls.map((c) => ({ name: c.name, args: c.args, result: c.result })),
          files: Object.fromEntries(store),
          outputDir,
        });

        conversation.push(assistantMsg(responseText));

        // Write the trace after every turn so a later hang or timeout still
        // leaves a complete record of the turns that finished.
        writeDebugTrace("chat-app-debug", SYSTEM_PROMPT, steps);

        // A failed turn poisons the rest of the edit chain — stop here; the
        // trace above already captured it.
        if (result.error) break;
      }

      // The system prompt the model received must carry the runtime-AI contract.
      expect(SYSTEM_PROMPT).toContain("window.app.complete");
      // Every turn should complete without an API/tool-loop error.
      expect(steps.every((s) => s.response.error === null)).toBe(true);
      // The generated app should actually use the runtime-AI call (it's a chat app).
      const usesRuntimeAi = [...store.values()].some((content) =>
        content.includes("window.app.complete")
      );
      expect(usesRuntimeAi).toBe(true);
      // The runtime verification must actually happen: the prompt's final step
      // is "call verify_app before declaring done", and a too-small round
      // budget starves it silently — the Playwright verifier sits unused and
      // nothing checks the app mounts. Guard against that regressing.
      expect(log.some((c) => c.name === "verify_app")).toBe(true);
    },
    1_200_000
  );
});
