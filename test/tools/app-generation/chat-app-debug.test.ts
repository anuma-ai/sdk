import { afterAll, describe, expect, it } from "vitest";

import { buildAppSystemPrompt } from "../../../src/tools/appGeneration.js";
import {
  closeSharedBrowser,
  config,
  createFileStore,
  type DebugTraceStep,
  dumpFiles,
  extractText,
  type PhaseRecord,
  printResult,
  shortHash,
  summarizePhase,
  timedToolLoop,
  type ToolCallLog,
  wrapTool,
  writeDebugTrace,
  writeIndex,
  writeRunMetrics,
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
      const toolNames = tools.map(
        (t) => (t.function as { name?: string } | undefined)?.name ?? "unknown"
      );
      const conversation: Message[] = [systemMsg(SYSTEM_PROMPT)];
      const steps: DebugTraceStep[] = [];
      const phases: PhaseRecord[] = [];
      const startedAt = new Date().toISOString();
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

        phases.push(
          summarizePhase({
            label: turn.label,
            elapsedMs: result.elapsedMs,
            toolCalls: turnToolCalls,
            files: store,
            errored: result.error !== null,
            usage: result.usage,
          })
        );

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

        writeDebugTrace("chat-app-debug", SYSTEM_PROMPT, steps);

        if (result.error) break;
      }

      writeRunMetrics({
        outputSubdir: "chat-app-debug",
        benchmark: "chat-app-debug",
        promptHash: shortHash(SYSTEM_PROMPT),
        startedAt,
        phases,
      });

      expect(SYSTEM_PROMPT).toContain("window.app.complete");
      expect(steps.every((s) => s.response.error === null)).toBe(true);
      const usesRuntimeAi = [...store.values()].some((content) =>
        content.includes("window.app.complete")
      );
      expect(usesRuntimeAi).toBe(true);
      expect(log.some((c) => c.name === "verify_app")).toBe(true);
    },
    1_200_000
  );
});
