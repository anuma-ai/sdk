/**
 * Sequential-changes benchmark: proves per-turn token cost stays flat
 * across a long run of small change requests.
 *
 * Exercises the *turn envelope* pattern (see `buildAppFileManifest`): each
 * change request is a self-contained episode — system prompt + a manifest
 * of the current files + a small window of recent text exchanges + the new
 * request. No tool traffic crosses turns, so the context the model sees at
 * request 50 has the same shape and size as at request 5; per-turn cost is
 * a function of app size, never of turn index. The anti-pattern this
 * guards against: hosts that resend prior turns' tool messages, where
 * per-turn cost grows linearly with N and the session total goes quadratic.
 *
 * Assertions:
 *   - every change turn completes without a tool-loop error
 *   - flatness: the average input tokens of the LAST 3 change turns must
 *     stay within 2× the average of the FIRST 3 (a quadratic regression
 *     would blow far past that by turn 10)
 *   - sanity ceiling: no single change turn exceeds ABS_TURN_INPUT_CAP
 *
 * Metrics land in `.output/sequential-changes/metrics.json` (+ history),
 * so `pnpm e2e:compare sequential-changes` diffs runs — per-phase
 * inputTokens IS the tokens-per-turn chart.
 *
 * Opt-in (long, hits the LLM):
 *   PORTAL_API_KEY=... RUN_SEQUENTIAL_CHANGES=1 \
 *     pnpm vitest run --config vitest.e2e.config.mts \
 *     test/tools/app-generation/sequential-changes.test.ts
 *
 * SEQUENTIAL_TURNS=<n> overrides the turn count (default 10; try 100 with
 * a fast E2E_MODEL for the long-haul version).
 */

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
const SYSTEM_PROMPT = buildAppSystemPrompt();

/** Text pairs kept verbatim in the envelope. Older turns are dropped —
 *  the files carry the durable state, not the conversation. */
const TEXT_WINDOW_PAIRS = 4;

/** Belt on top of the envelope: even a chatty model can't blow past this
 *  in a single turn — runToolLoop forces a text wrap-up at the budget. */
const MAX_TURN_TOKENS = 150_000;

/** Generous sanity ceiling per change turn (input tokens). The envelope
 *  keeps real turns far below this; the cap exists to catch a structural
 *  regression, not to police model variance. */
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

/** Deterministic small change request for turn i (2-based) — parameterized
 *  by index so any turn count yields a unique, always-valid edit. */
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
    `${TURNS} sequential change requests keep per-turn input tokens flat`,
    async () => {
      const store = createFileStore();
      const storage = createMapStorage(store);
      const log: ToolCallLog[] = [];
      const tools = createTestAppTools(store).map((t) => wrapTool(t, log));
      const phases: PhaseRecord[] = [];
      const startedAt = new Date().toISOString();
      const recentPairs: Array<{ user: string; assistant: string }> = [];
      let logStart = 0;

      for (let i = 1; i <= TURNS; i++) {
        const prompt = i === 1 ? BUILD_PROMPT : changePrompt(i);

        // The envelope: rebuilt from scratch every turn. No tool messages,
        // no unbounded history — manifest + text window + the new request.
        const manifest = await buildAppFileManifest({
          storage,
          conversationId: TEST_CONVERSATION_ID,
        });
        const messages: Message[] = [
          systemMsg(SYSTEM_PROMPT),
          systemMsg(manifest),
          ...recentPairs.flatMap((p) => [userMsg(p.user), assistantMsg(p.assistant)]),
          userMsg(prompt),
        ];

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

        recentPairs.push({ user: prompt, assistant: responseText });
        if (recentPairs.length > TEXT_WINDOW_PAIRS) recentPairs.shift();
      }

      dumpFiles(store, "sequential-changes/final");
      writeRunMetrics({
        outputSubdir: "sequential-changes",
        benchmark: "sequential-changes",
        promptHash: shortHash(SYSTEM_PROMPT),
        startedAt,
        phases,
      });

      // The flatness proof. Change turns only — the initial build has a
      // different shape (no manifest content, big create_file output).
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
        // Quadratic growth would put the late average at ~Nx the early one
        // by turn 10; the envelope keeps the ratio near 1. 2x absorbs model
        // variance (round-count differences) without masking a regression.
        expect(late).toBeLessThanOrEqual(early * 2);
      }
    },
    3_600_000
  );
});
