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
const ENABLED = process.env.RUN_PHOTO_GALLERY === "1";

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

async function runTurn(messages: Message[], tools: any[], maxRounds = 20) {
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

describe("photo gallery (file upload benchmark)", () => {
  afterAll(async () => {
    writeIndex();
    await closeSharedBrowser();
  });

  it.skipIf(!ENABLED)(
    "builds a photo gallery with file upload, drag-and-drop, and CSS filters",
    { timeout: 900_000 },
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
            "Build a photo gallery app.",
            "Users add images two ways: (1) by clicking an upload button that opens the native file picker accepting multiple images, and (2) by dragging image files anywhere onto a clearly-styled drop zone.",
            "Show all uploaded images in a responsive grid — 3 columns on desktop, 2 on tablet, 1 on mobile. Each thumbnail is clickable.",
            "Clicking a thumbnail opens a lightbox overlay with the full-size image, a close button, and prev/next arrows to navigate the gallery. Esc also closes.",
            "Each thumbnail has a delete (trash icon) button visible on hover that removes it from the gallery.",
            "Persist the gallery across page refresh: store thumbnails as data URLs in localStorage (small ones — show a sensible warning for very large files). Re-render from localStorage on mount.",
          ].join(" ")
        )
      );
      const phase1 = await runTurn(conversation, tools);
      printResult(phase1.result);
      expect(phase1.result.error).toBeNull();
      dumpFiles(store, "photo-gallery/step-1-upload-grid");
      recordPhase(
        "step-1-upload-grid",
        phase1.result.elapsedMs,
        phase1.result.error !== null,
        phase1.result.usage
      );
      conversation.push(assistantMsg(phase1.responseText));

      const phase1Js = getAppJs();
      const phase1Css = getAppCss();

      expect(phase1Js.length).toBeGreaterThanOrEqual(2500);
      expect(phase1Js).toMatch(/type=["']file["']/);
      expect(phase1Js).toMatch(/accept=["'][^"']*image/i);
      expect(phase1Js).toMatch(/onDrop|onDragOver|dataTransfer/);
      expect(phase1Js).toMatch(/createObjectURL|FileReader|readAsDataURL/);
      expect(phase1Js).toMatch(/localStorage/);

      const handlerCount = (phase1Js.match(/createObjectURL\(/g) ?? []).length;
      const fileInputs = (phase1Js.match(/type=["']file["']/g) ?? []).length;
      const dropHandlers = (phase1Js.match(/onDrop\b/g) ?? []).length;

      console.log(
        `\n  Phase 1: App.js=${phase1Js.length}ch, App.css=${phase1Css.length}ch` +
          `\n    file inputs: ${fileInputs}, onDrop handlers: ${dropHandlers}, createObjectURL uses: ${handlerCount}`
      );

      const snap1 = snapshot(store);

      conversation.push(
        userMsg(
          [
            "Add a controls panel with three sliders — brightness, contrast, and saturation — that apply as CSS filters to the currently-viewed image in the lightbox.",
            "Sliders are range inputs from 0 to 200 percent (default 100). Show the current value next to each label.",
            "Add a 'Reset' button that returns all three to 100.",
            "The filter state is per-image — it persists with the gallery in localStorage.",
          ].join(" ")
        )
      );
      const phase2 = await runTurn(conversation, tools);
      printResult(phase2.result);
      expect(phase2.result.error).toBeNull();
      dumpFiles(store, "photo-gallery/step-2-css-filters");
      recordPhase(
        "step-2-css-filters",
        phase2.result.elapsedMs,
        phase2.result.error !== null,
        phase2.result.usage
      );
      conversation.push(assistantMsg(phase2.responseText));

      const phase2Js = getAppJs();
      const phase2Css = getAppCss();

      expect(phase2Js).toMatch(/brightness/i);
      expect(phase2Js).toMatch(/contrast/i);
      expect(phase2Js).toMatch(/saturate|saturation/i);
      expect(`${phase2Js}\n${phase2Css}`).toMatch(/filter:|filter\s*[:=]\s*['"`]/);
      expect(phase2Js).toMatch(/type=["']range["']/);

      const diff2 = diffSnapshots(snap1, snapshot(store));
      printDiff("Phase 2: CSS filters", diff2);
      console.log(
        `  Phase 2: App.js=${phase2Js.length}ch (+${phase2Js.length - phase1Js.length}), App.css=${phase2Css.length}ch (+${phase2Css.length - phase1Css.length})`
      );

      writeRunMetrics({
        outputSubdir: "photo-gallery",
        benchmark: "photo-gallery",
        promptHash,
        startedAt: runStartedAt,
        phases,
      });
    }
  );
});
