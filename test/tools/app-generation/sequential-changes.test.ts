import { afterAll, describe, expect, it } from "vitest";

import { buildAppFileManifest, buildAppSystemPrompt } from "../../../src/tools/appGeneration.js";
import {
  closeSharedBrowser,
  config,
  createFileStore,
  dumpFiles,
  extractText,
  type PhaseRecord,
  shortHash,
  summarizePhase,
  timedToolLoop,
  type ToolCallLog,
  wrapTool,
  writeIndex,
  writeRunMetrics,
} from "./setup.js";
import { createMapStorage, createTestAppTools, TEST_CONVERSATION_ID } from "./tools.js";

const ENABLED = process.env.RUN_SEQUENTIAL_CHANGES === "1";
const TURNS = Math.max(4, Number(process.env.SEQUENTIAL_TURNS) || 10);
const MODE = process.env.SEQUENTIAL_MODE === "accumulate" ? "accumulate" : "envelope";
const SYSTEM_PROMPT = buildAppSystemPrompt();
const MODEL_SLUG = config.model
  .split("/")
  .pop()!
  .replace(/[^a-zA-Z0-9.-]+/g, "_");
const OUTPUT_SUBDIR = `sequential-changes/${MODEL_SLUG}-${MODE}`;

const TEXT_WINDOW_PAIRS = 4;

const MAX_TURN_TOKENS = 150_000;

const ABS_TURN_INPUT_CAP = 200_000;

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

const BUILD_PROMPT =
  "Build a small todo list app: a text input with an Add button, the list below with a delete button per item, and a count of open items in the header. Minimal but styled.";

function changePrompt(i: number): string {
  const accents = ["teal", "crimson", "indigo", "amber", "violet", "forest green"];
  const templates = [
    () => `Rename the header title to "My Tasks v${i}".`,
    () => `Change the accent color to ${accents[i % accents.length]}.`,
    () => `Set the footer note to "Revision ${i}" (add a small footer if there isn't one).`,
    () => `Make the Add button label say "Add #${i}".`,
    () => `Change the empty-state message to "Nothing here yet (v${i})".`,
  ];
  return templates[i % templates.length]!();
}

describe("sequential-changes", () => {
  afterAll(async () => {
    writeIndex();
    await closeSharedBrowser();
  });

  it.skipIf(!ENABLED)(
    `${TURNS} sequential change requests (${MODE}) keep per-turn input tokens flat`,
    async () => {
      const store = createFileStore();
      const storage = createMapStorage(store);
      const log: ToolCallLog[] = [];
      const tools = createTestAppTools(store).map((t) => wrapTool(t, log));
      const phases: PhaseRecord[] = [];
      const startedAt = new Date().toISOString();
      const textPairs: Array<{ user: string; assistant: string }> = [];
      let logStart = 0;

      for (let i = 1; i <= TURNS; i++) {
        const prompt = i === 1 ? BUILD_PROMPT : changePrompt(i);

        let messages: Message[];
        if (MODE === "envelope") {
          const manifest = await buildAppFileManifest({
            storage,
            conversationId: TEST_CONVERSATION_ID,
          });
          messages = [
            systemMsg(SYSTEM_PROMPT),
            systemMsg(manifest),
            ...textPairs
              .slice(-TEXT_WINDOW_PAIRS)
              .flatMap((p) => [userMsg(p.user), assistantMsg(p.assistant)]),
            userMsg(prompt),
          ];
        } else {
          messages = [
            systemMsg(SYSTEM_PROMPT),
            ...textPairs.flatMap((p) => [userMsg(p.user), assistantMsg(p.assistant)]),
            userMsg(prompt),
          ];
        }

        const result = await timedToolLoop({
          messages,
          model: config.model,
          baseUrl: config.baseUrl,
          headers: { "X-API-Key": config.portalKey },
          apiType: config.apiType,
          tools: tools as Parameters<typeof timedToolLoop>[0]["tools"],
          toolChoice: "auto",
          maxToolRounds: 9,
          maxTurnTokens: MAX_TURN_TOKENS,
        });
        const responseText = extractText(result) || "Done.";

        const turnToolCalls = log.slice(logStart);
        logStart = log.length;
        phases.push(
          summarizePhase({
            label: `turn-${String(i).padStart(3, "0")}`,
            elapsedMs: result.elapsedMs,
            toolCalls: turnToolCalls,
            files: store,
            errored: result.error !== null,
            usage: result.usage,
          })
        );
        console.log(
          `  turn ${i}/${TURNS}: in=${result.usage.inputTokens} out=${result.usage.outputTokens} ` +
            `calls=${turnToolCalls.length} "${prompt.slice(0, 48)}"`
        );

        expect(result.error).toBeNull();

        textPairs.push({ user: prompt, assistant: responseText });
      }

      dumpFiles(store, `${OUTPUT_SUBDIR}/final`);
      writeRunMetrics({
        outputSubdir: OUTPUT_SUBDIR,
        benchmark: "sequential-changes",
        scenario: `${MODEL_SLUG}-${MODE}`,
        promptHash: shortHash(SYSTEM_PROMPT),
        startedAt,
        phases,
      });

      if (MODE !== "envelope") return;

      const changeInputs = phases.slice(1).map((p) => p.inputTokens ?? 0);
      for (const [idx, tokens] of changeInputs.entries()) {
        expect(tokens, `turn ${idx + 2} input tokens`).toBeLessThanOrEqual(ABS_TURN_INPUT_CAP);
      }
      if (changeInputs.length >= 6) {
        const avg = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
        const early = avg(changeInputs.slice(0, 3));
        const late = avg(changeInputs.slice(-3));
        console.log(
          `  flatness: early-3 avg=${Math.round(early)} late-3 avg=${Math.round(late)} ` +
            `ratio=${(late / early).toFixed(2)}`
        );
        expect(late).toBeLessThanOrEqual(early * 2);
      }
    },
    3_600_000
  );
});
