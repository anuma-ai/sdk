/**
 * Kanban project board — sophisticated build + iterate.
 *
 * Five-phase stress test that pushes app-gen well past the todo-list
 * baseline: build a real project tracker, then iteratively layer on
 * features the way an engineer using Claude Code would (due dates →
 * filters → multi-board → custom columns).
 *
 * Each phase dumps the working app to test/tools/app-generation/.output/
 * kanban/step-N/index.html for manual DnD / interaction testing in a
 * browser. Assertions are deliberately loose — verifying that the
 * feature *shape* exists in the generated code, not the exact
 * identifier names the model chose.
 *
 * OPT-IN: this test is skipped by default because it takes ~10-15 minutes
 * (5 sequential model rounds, each generating non-trivial code) and
 * exposes model-behavior issues that are orthogonal to the tool work
 * (e.g. the model preferring wholesale create_file rewrites over patches
 * in extended sessions). Set RUN_KANBAN=1 to opt in.
 *
 * Run: PORTAL_API_KEY=... RUN_KANBAN=1 pnpm vitest run test/tools/app-generation/kanban.test.ts
 */

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
const ENABLED = process.env.RUN_KANBAN === "1";

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

async function runTurn(messages: Message[], tools: any[], maxRounds = 30) {
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

describe("kanban project board (sophisticated build + iterate)", () => {
  afterAll(async () => {
    writeIndex();
    await closeSharedBrowser();
  });

  it.skipIf(!ENABLED)(
    "builds and iteratively enhances a kanban board across five phases",
    { timeout: 1_500_000 },
    async () => {
      const store = createFileStore();
      const log: ToolCallLog[] = [];
      const tools = createTestAppTools(store).map((t) => wrapTool(t, log));
      const conversation: Message[] = [systemMsg(SYSTEM_PROMPT)];
      const phases: PhaseRecord[] = [];
      const runStartedAt = new Date().toISOString();
      const promptHash = shortHash(SYSTEM_PROMPT);
      let phaseLogStart = 0;

      function recordPhase(label: string, elapsedMs: number, errored: boolean): void {
        phases.push(
          summarizePhase({
            label,
            elapsedMs,
            toolCalls: log.slice(phaseLogStart),
            files: store,
            errored,
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

      // ── Phase 1: initial generation ────────────────────────────────────────
      conversation.push(
        userMsg(
          [
            "Build a kanban project tracker with three columns labeled “To Do”, “In Progress”, and “Done”.",
            "Each card has a title, a longer description, and a colored tag (examples: bug, feature, design, chore).",
            "Users can add a card via a small form at the top of each column, edit a card's title or description inline by clicking it, and delete a card with an icon button on hover.",
            "Implement drag-and-drop using native HTML5 (draggable + onDragStart + onDragOver + onDrop) so cards can be moved between columns.",
            "Modern, polished design: card shadows, rounded corners, smooth hover/transition states, accessible focus rings, mobile-friendly layout.",
          ].join(" ")
        )
      );
      const phase1 = await runTurn(conversation, tools);
      printResult(phase1.result);
      expect(phase1.result.error).toBeNull();
      dumpFiles(store, "kanban/step-1-initial");
      recordPhase("step-1-initial", phase1.result.elapsedMs, phase1.result.error !== null);
      conversation.push(assistantMsg(phase1.responseText));

      const phase1Js = getAppJs();
      const phase1Css = getAppCss();
      expect(phase1Js.length).toBeGreaterThanOrEqual(2500); // non-trivial scope
      expect(phase1Css.length).toBeGreaterThanOrEqual(500);
      // All three column concepts present — match on whole words within
      // the file (the model may split "In Progress" across JSX
      // attributes like {title}<em>{em}</em> for stylistic reasons, so
      // we look for "Progress" anywhere, not the contiguous "In Progress").
      expect(phase1Js).toMatch(/\bTo\b/);
      expect(phase1Js).toMatch(/Progress/);
      expect(phase1Js).toMatch(/Done/);
      // Drag-and-drop primitives present (any of the standard handlers).
      expect(phase1Js).toMatch(/draggable|onDragStart|onDragOver|onDrop/);

      // ── Soft design-quality signals (log-only) ─────────────────────
      // The DESIGN DIRECTION section of the system prompt should produce
      // observable artifacts: design tokens declared, Google Fonts loaded,
      // an aesthetic stated in the assistant's text, custom CSS sized
      // appropriately. None of these fail the test on their own — they're
      // diagnostic signals we use to measure how the prompt is shaping
      // the output.
      const cssVarMatches = phase1Css.match(/--[a-z][a-z0-9-]*\s*:/gi) ?? [];
      const usesGoogleFonts = /fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(
        `${phase1Js}\n${phase1Css}`
      );
      const usesModernCss =
        /color-mix\(|oklch\(|oklab\(|conic-gradient\(|backdrop-filter|@container|feTurbulence/.test(
          phase1Css
        );
      const responseLower = phase1.responseText.toLowerCase();
      const aestheticHints = [
        "editorial",
        "modernist",
        "retro",
        "brutalist",
        "nordic",
        "terminal",
        "arcade",
        "sketch",
        "magazine",
        "minimal",
        "playful",
        "warm",
        "cold",
      ];
      const namedAesthetic = aestheticHints.some((h) => responseLower.includes(h));
      const hasPersistence = /localStorage/.test(phase1Js);
      console.log(
        `  Phase 1 design signals:` +
          `\n    aesthetic named in response: ${namedAesthetic ? "YES" : "no"}` +
          `\n    design tokens (--var) in App.css: ${cssVarMatches.length}` +
          `\n    Google Fonts loaded: ${usesGoogleFonts ? "YES" : "no"}` +
          `\n    modern CSS (color-mix/oklch/conic/etc): ${usesModernCss ? "YES" : "no"}` +
          `\n    localStorage persistence: ${hasPersistence ? "YES" : "no"}`
      );

      const snap1 = snapshot(store);
      console.log(
        `\n  Phase 1 (initial): App.js=${phase1Js.length}ch, App.css=${phase1Css.length}ch`
      );

      // ── Phase 2: due dates + overdue highlight ─────────────────────────────
      conversation.push(
        userMsg(
          [
            "Add a due date to each card.",
            "Show the due date below the description in a smaller, muted font.",
            "If a card's due date is today, color the date text amber.",
            "If a card is overdue (due date in the past) AND not in the Done column, give the entire card a red border and a subtle red background tint.",
            'Include a date picker (input type="date") in the add-card form and the inline edit UI.',
          ].join(" ")
        )
      );
      const phase2 = await runTurn(conversation, tools);
      printResult(phase2.result);
      expect(phase2.result.error).toBeNull();
      dumpFiles(store, "kanban/step-2-due-dates");
      recordPhase("step-2-due-dates", phase2.result.elapsedMs, phase2.result.error !== null);
      conversation.push(assistantMsg(phase2.responseText));

      const phase2Js = getAppJs();
      const phase2Css = getAppCss();
      expect(phase2Js).toMatch(/due\s*[Dd]ate|dueDate|deadline/);
      expect(phase2Js).toMatch(/type=["']date["']/);
      // Overdue styling — model can express this in CSS or inline style or
      // a JS branch. Match on the concept in either file.
      expect(`${phase2Js}\n${phase2Css}`).toMatch(/overdue|past[-_ ]?due|isOverdue/i);

      const diff2 = diffSnapshots(snap1, snapshot(store));
      printDiff("Phase 2: due dates", diff2);
      const snap2 = snapshot(store);
      console.log(
        `  Phase 2 (due dates): App.js=${phase2Js.length}ch (+${phase2Js.length - phase1Js.length}), App.css=${phase2Css.length}ch (+${phase2Css.length - phase1Css.length})`
      );

      // ── Phase 3: tag filtering with chips ──────────────────────────────────
      conversation.push(
        userMsg(
          [
            "Add a filter bar at the top of the board.",
            "Show every unique tag as a small clickable chip.",
            "Clicking a chip toggles it on/off; when one or more chips are active, only cards carrying at least one of those tags appear in the columns.",
            'When any filter is active, show a small "Clear filters" button next to the chip row.',
            "Persist the active filters in component state (no localStorage needed).",
          ].join(" ")
        )
      );
      const phase3 = await runTurn(conversation, tools);
      printResult(phase3.result);
      expect(phase3.result.error).toBeNull();
      dumpFiles(store, "kanban/step-3-tag-filters");
      recordPhase("step-3-tag-filters", phase3.result.elapsedMs, phase3.result.error !== null);
      conversation.push(assistantMsg(phase3.responseText));

      const phase3Js = getAppJs();
      const phase3Css = getAppCss();
      expect(phase3Js).toMatch(/filter|activeTags|selectedTags/i);
      // Clear-filters affordance present.
      expect(phase3Js).toMatch(/clear[\s_-]?filter|reset[\s_-]?filter/i);

      const diff3 = diffSnapshots(snap2, snapshot(store));
      printDiff("Phase 3: tag filters", diff3);
      const snap3 = snapshot(store);
      console.log(
        `  Phase 3 (tag filters): App.js=${phase3Js.length}ch (+${phase3Js.length - phase2Js.length}), App.css=${phase3Css.length}ch (+${phase3Css.length - phase2Css.length})`
      );

      // ── Phase 4: multi-board sidebar ───────────────────────────────────────
      conversation.push(
        userMsg(
          [
            "Add support for multiple boards.",
            "Add a sidebar on the left listing all boards.",
            'Seed two default boards: "Web Redesign" and "API v2". Each board has its own independent cards.',
            "Clicking a board in the sidebar switches the main view to that board's cards.",
            'Add a "+ New Board" button at the bottom of the sidebar that prompts for a name and creates an empty board.',
            "Highlight the currently selected board in the sidebar.",
          ].join(" ")
        )
      );
      const phase4 = await runTurn(conversation, tools);
      printResult(phase4.result);
      expect(phase4.result.error).toBeNull();
      dumpFiles(store, "kanban/step-4-multi-board");
      recordPhase("step-4-multi-board", phase4.result.elapsedMs, phase4.result.error !== null);
      conversation.push(assistantMsg(phase4.responseText));

      const phase4Js = getAppJs();
      const phase4Css = getAppCss();
      // Multi-board concept must show up substantively in the code.
      const boardMatches = phase4Js.match(/board/gi) ?? [];
      expect(boardMatches.length).toBeGreaterThanOrEqual(8);
      // Seeded board names.
      expect(phase4Js).toMatch(/Web ?Redesign/);
      expect(phase4Js).toMatch(/API ?v2/i);
      // Sidebar structural element.
      expect(`${phase4Js}\n${phase4Css}`).toMatch(/sidebar|aside/i);

      const diff4 = diffSnapshots(snap3, snapshot(store));
      printDiff("Phase 4: multi-board", diff4);
      const snap4 = snapshot(store);
      console.log(
        `  Phase 4 (multi-board): App.js=${phase4Js.length}ch (+${phase4Js.length - phase3Js.length}), App.css=${phase4Css.length}ch (+${phase4Css.length - phase3Css.length})`
      );

      // ── Phase 5: insert a new column ───────────────────────────────────────
      conversation.push(
        userMsg(
          [
            'Add a new "Blocked" column between "In Progress" and "Done".',
            "Give it a visually distinct background — a subtle amber tint — so blocked work is obvious at a glance.",
            "Cards drag in and out of Blocked like any other column.",
          ].join(" ")
        )
      );
      const phase5 = await runTurn(conversation, tools);
      printResult(phase5.result);
      expect(phase5.result.error).toBeNull();
      dumpFiles(store, "kanban/step-5-blocked-column");
      recordPhase("step-5-blocked-column", phase5.result.elapsedMs, phase5.result.error !== null);
      conversation.push(assistantMsg(phase5.responseText));

      const phase5Js = getAppJs();
      const phase5Css = getAppCss();
      expect(phase5Js).toMatch(/Blocked/);
      // The model should still know about every column it has built up.
      expect(phase5Js).toMatch(/\bTo\b/);
      expect(phase5Js).toMatch(/Progress/);
      expect(phase5Js).toMatch(/Done/);

      const diff5 = diffSnapshots(snap4, snapshot(store));
      printDiff("Phase 5: blocked column", diff5);
      console.log(
        `  Phase 5 (blocked column): App.js=${phase5Js.length}ch (+${phase5Js.length - phase4Js.length}), App.css=${phase5Css.length}ch (+${phase5Css.length - phase4Css.length})`
      );

      // ── Summary + persistence ──────────────────────────────────────────────
      writeRunMetrics({
        outputSubdir: "kanban",
        benchmark: "kanban",
        promptHash,
        startedAt: runStartedAt,
        phases,
      });
    }
  );
});
