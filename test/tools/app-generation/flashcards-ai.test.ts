import { afterAll, describe, expect, it } from "vitest";

import { buildAppSystemPrompt } from "../../../src/tools/appGeneration.js";
import {
  config,
  createFileStore,
  diffSnapshots,
  dumpFiles,
  extractText,
  type PhaseRecord,
  printDiff,
  printResult,
  shortHash,
  snapshot,
  summarizePhase,
  timedToolLoop,
  type ToolCallLog,
  wrapTool,
  writeIndex,
  closeSharedBrowser,
  writeRunMetrics,
} from "./setup.js";
import { createTestAppTools } from "./tools.js";

const SYSTEM_PROMPT = buildAppSystemPrompt();
const ENABLED = process.env.RUN_FLASHCARDS_AI === "1";

type Message = {
  role: string;
  content: Array<{ type: string; text: string }>;
};

function systemMsg(text: string): Message {
  return { role: "system", content: [{ type: "text", text }] };
}
function userMsg(text: string): Message {
  return { role: "user", content: [{ type: "text", text }] };
}
function assistantMsg(text: string): Message {
  return { role: "assistant", content: [{ type: "text", text }] };
}

async function runTurn(messages: Message[], tools: any[], maxRounds = 8) {
  const result = await timedToolLoop({
    messages,
    model: config.model,
    baseUrl: config.baseUrl,
    headers: { "X-API-Key": config.portalKey },
    apiType: config.apiType,
    tools,
    toolChoice: "auto",
    maxToolRounds: maxRounds,
  });
  return { result, responseText: extractText(result) || "Done." };
}

describe("AI flashcard tutor (window.app.complete benchmark)", () => {
  afterAll(async () => {
    writeIndex();
    await closeSharedBrowser();
  });

  it.skipIf(!ENABLED)(
    "builds a flashcard app that uses window.app.complete for grading and content generation",
    { timeout: 600_000 },
    async () => {
      const store = createFileStore();
      const log: ToolCallLog[] = [];
      const tools = createTestAppTools(store).map((t) => wrapTool(t, log));
      const conversation: Message[] = [systemMsg(SYSTEM_PROMPT)];
      const phases: PhaseRecord[] = [];
      const runStartedAt = new Date().toISOString();
      const promptHash = shortHash(SYSTEM_PROMPT);
      let phaseLogStart = 0;
      function recordPhase(
        label: string,
        elapsedMs: number,
        errored: boolean,
        usage?: { inputTokens: number; outputTokens: number }
      ): void {
        phases.push(
          summarizePhase({
            label,
            elapsedMs,
            toolCalls: log.slice(phaseLogStart),
            files: store,
            errored,
            usage,
          })
        );
        phaseLogStart = log.length;
      }

      function getAppJs(): string {
        return store.get("App.js") ?? store.get("App.jsx") ?? "";
      }
      function getAppCss(): string {
        return store.get("App.css") ?? "";
      }

      conversation.push(
        userMsg(
          [
            "Build a flashcard learning app where an AI tutor grades the user's free-form answers.",
            'Seed it with 5 cards on the Roman Empire (e.g. "Who was the first Roman emperor?", "What year did Rome fall?", "Name a famous Roman aqueduct").',
            "For each card: show the question, accept a typed answer, and when the user submits, call the AI to evaluate the answer (correct / partially correct / wrong) and explain.",
            "Show a clear loading state while the AI is thinking.",
            "Track score across the session and persist progress so a refresh doesn't reset.",
            "Polish: card flip animation on submit, keyboard support (Enter to submit), clean typography.",
          ].join(" ")
        )
      );
      const phase1 = await runTurn(conversation, tools);
      printResult(phase1.result);
      expect(phase1.result.error).toBeNull();
      dumpFiles(store, "flashcards-ai/step-1-graded-tutor");
      recordPhase(
        "step-1-graded-tutor",
        phase1.result.elapsedMs,
        phase1.result.error !== null,
        phase1.result.usage
      );
      conversation.push(assistantMsg(phase1.responseText));

      const phase1Js = getAppJs();
      const phase1Css = getAppCss();

      expect(phase1Js.length).toBeGreaterThanOrEqual(2000);
      expect(phase1Js).toMatch(/window\.app\.complete/);
      expect(phase1Js).toMatch(/loading|isLoading|pending/i);
      expect(phase1Js).toMatch(/localStorage/);

      const completeCalls = (phase1Js.match(/window\.app\.complete\(/g) ?? []).length;
      console.log(
        `\n  Phase 1: App.js=${phase1Js.length}ch, App.css=${phase1Css.length}ch, window.app.complete call sites: ${completeCalls}`
      );

      const snap1 = snapshot(store);

      conversation.push(
        userMsg(
          [
            'Add a "Generate new deck" feature.',
            'User enters a topic (e.g. "Python list comprehensions" or "French Revolution") and a desired card count (3-10).',
            "Call the AI to generate that many flashcards on the topic. Parse the response into structured cards (question + expected answer hint).",
            "Show a clear loading state while generating; let the user retry on error.",
            "After generation, the new deck replaces or extends the current set — model's choice, but explain in a one-line confirmation message.",
          ].join(" ")
        )
      );
      const phase2 = await runTurn(conversation, tools);
      printResult(phase2.result);
      expect(phase2.result.error).toBeNull();
      dumpFiles(store, "flashcards-ai/step-2-ai-generation");
      recordPhase(
        "step-2-ai-generation",
        phase2.result.elapsedMs,
        phase2.result.error !== null,
        phase2.result.usage
      );
      conversation.push(assistantMsg(phase2.responseText));

      const phase2Js = getAppJs();

      const completeCalls2 = (phase2Js.match(/window\.app\.complete\(/g) ?? []).length;
      expect(completeCalls2).toBeGreaterThan(completeCalls);

      const diff2 = diffSnapshots(snap1, snapshot(store));
      printDiff("Phase 2: AI deck generation", diff2);
      console.log(
        `  Phase 2: App.js=${phase2Js.length}ch (+${phase2Js.length - phase1Js.length}), window.app.complete call sites: ${completeCalls2}`
      );

      console.log(`  window.app.complete usage: ${completeCalls} → ${completeCalls2} call sites`);
      writeRunMetrics({
        outputSubdir: "flashcards-ai",
        benchmark: "flashcards-ai",
        promptHash,
        startedAt: runStartedAt,
        phases,
      });
    }
  );
});
