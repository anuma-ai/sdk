/**
 * Precision update tests — verify that targeted change requests
 * only modify the exact lines that need changing.
 *
 * Each test creates an app, then makes a series of small changes,
 * snapshotting and diffing after each step. The goal is to measure
 * how surgical the LLM's updates are.
 *
 * Run: PORTAL_API_KEY=... pnpm vitest run test/tools/app-generation
 */

import { afterAll, describe, expect, it } from "vitest";

import { buildAppSystemPrompt } from "../../../src/tools/appGeneration.js";
import {
  config,
  createFileStore,
  diffSnapshots,
  dumpFiles,
  extractText,
  type FileDiff,
  printDiff,
  printResult,
  snapshot,
  timedToolLoop,
  type ToolCallLog,
  wrapTool,
  writeIndex,
} from "./setup.js";
import { createTestAppTools } from "./tools.js";

const SYSTEM_PROMPT = buildAppSystemPrompt();

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

/** Run one turn of the tool loop and return the result + updated conversation. */
async function runTurn(messages: Message[], tools: any[], maxRounds = 5) {
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
  const responseText = extractText(result) || "Done.";
  return { result, responseText };
}

describe("precision-updates", () => {
  afterAll(() => writeIndex());

  it("change button color — should modify only color-related CSS lines", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestAppTools(store).map((t) => wrapTool(t, log));
    const conversation: Message[] = [systemMsg(SYSTEM_PROMPT)];

    // Step 1: Generate the initial app
    conversation.push(
      userMsg("Build a simple counter app with increment, decrement, and reset buttons.")
    );
    const gen = await runTurn(conversation, tools);
    printResult(gen.result);
    expect(gen.result.error).toBeNull();
    dumpFiles(store, "precision-btn-color/step-1-initial");
    conversation.push(assistantMsg(gen.responseText));
    const snap1 = snapshot(store);
    const logAfterGen = log.length;

    // Step 2: Change ONLY the button color
    conversation.push(userMsg("Make the increment button green and the decrement button red."));
    const update = await runTurn(conversation, tools);
    printResult(update.result);
    expect(update.result.error).toBeNull();
    dumpFiles(store, "precision-btn-color/step-2-colored");
    const snap2 = snapshot(store);

    // Analyze the diff
    const diffs = diffSnapshots(snap1, snap2);
    printDiff("Button color change", diffs);

    // package.json should NOT have changed (if it exists in the diff)
    const pkgDiff = diffs.find((d) => d.path === "package.json");
    if (pkgDiff) {
      expect(pkgDiff.status).toBe("unchanged");
    }

    // Check which tools were used for the update
    const updateCalls = log
      .slice(logAfterGen)
      .filter((l) => l.name === "patch_file" || l.name === "create_file");
    const patchCalls = updateCalls.filter((l) => l.name === "patch_file");
    console.log(
      `  Tools used: ${updateCalls.map((l) => l.name).join(", ")} (${patchCalls.length} patch, ${updateCalls.length - patchCalls.length} create)`
    );

    // At least one file must have changed (modified or fully rewritten)
    const changedFiles = diffs.filter((d) => d.status !== "unchanged");
    expect(changedFiles.length).toBeGreaterThanOrEqual(1);

    // Total lines changed across all files
    const totalChanged = diffs.reduce((sum, d) => sum + d.linesChanged, 0);
    console.log(`  Total lines changed: ${totalChanged}`);

    const jsDiff = diffs.find((d) => d.path === "App.js" || d.path === "App.jsx");
    const cssDiff = diffs.find((d) => d.path === "App.css");
    console.log(
      `  JS: ${jsDiff?.linesChanged ?? 0} lines, CSS: ${cssDiff?.linesChanged ?? 0} lines`
    );

    if (totalChanged > 30) {
      console.warn(
        `  WARNING: ${totalChanged} lines changed for a color tweak — excessive rewrite`
      );
    }
  });

  it("change title text — should modify only the text, not styles or logic", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestAppTools(store).map((t) => wrapTool(t, log));
    const conversation: Message[] = [systemMsg(SYSTEM_PROMPT)];

    // Step 1: Generate
    conversation.push(userMsg("Build a BMI calculator with height and weight inputs."));
    const gen = await runTurn(conversation, tools);
    printResult(gen.result);
    expect(gen.result.error).toBeNull();
    dumpFiles(store, "precision-title/step-1-initial");
    conversation.push(assistantMsg(gen.responseText));
    const snap1 = snapshot(store);

    // Step 2: Change only the title
    conversation.push(userMsg('Change the title from "BMI Calculator" to "Body Mass Index Tool".'));
    const update = await runTurn(conversation, tools);
    printResult(update.result);
    expect(update.result.error).toBeNull();
    dumpFiles(store, "precision-title/step-2-renamed");
    const snap2 = snapshot(store);

    const diffs = diffSnapshots(snap1, snap2);
    printDiff("Title rename", diffs);

    // package.json and App.css should NOT have changed
    const titlePkgDiff = diffs.find((d) => d.path === "package.json");
    if (titlePkgDiff) {
      expect(titlePkgDiff.status).toBe("unchanged");
    }
    const cssDiff = diffs.find((d) => d.path === "App.css");
    if (cssDiff) {
      expect(cssDiff.status).toBe("unchanged");
    }

    // App.js should change but only 1-2 lines (the title string)
    const jsDiff = diffs.find((d) => d.path === "App.js" || d.path === "App.jsx");
    expect(jsDiff?.status).toBe("modified");
    console.log(`  JS lines changed: ${jsDiff?.linesChanged}`);

    if ((jsDiff?.linesChanged ?? 0) > 10) {
      console.warn(
        `  WARNING: ${jsDiff?.linesChanged} lines changed for a title rename — excessive rewrite`
      );
    }
  });

  it("recovers from failed patches using returned file content", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestAppTools(store).map((t) => wrapTool(t, log));
    const conversation: Message[] = [systemMsg(SYSTEM_PROMPT)];

    // Step 1: Generate a simple app
    conversation.push(
      userMsg(
        "Build a tip calculator with bill amount, tip percentage slider, and a calculate button."
      )
    );
    const gen = await runTurn(conversation, tools);
    printResult(gen.result);
    expect(gen.result.error).toBeNull();
    dumpFiles(store, "precision-retry/step-1-initial");
    conversation.push(assistantMsg(gen.responseText));

    const snap1 = snapshot(store);
    const logAfterGen = log.length;

    // Step 2: Ask for a change — the LLM might get the find string slightly wrong
    // on first attempt, requiring a retry with the currentContent returned by patch_file
    conversation.push(
      userMsg(
        'Change the calculate button text from "Calculate" to "Split the Bill" and make it purple.'
      )
    );
    const update = await runTurn(conversation, tools, 8);
    printResult(update.result);
    expect(update.result.error).toBeNull();
    dumpFiles(store, "precision-retry/step-2-updated");

    const snap2 = snapshot(store);
    const diffs = diffSnapshots(snap1, snap2);
    printDiff("Patch retry test", diffs);

    // Check tool call sequence
    const updateLog = log.slice(logAfterGen);
    const patchCalls = updateLog.filter((l) => l.name === "patch_file");
    const failedPatches = patchCalls.filter((l) => {
      const result =
        typeof l.result === "string" ? JSON.parse(l.result) : (l.result as Record<string, unknown>);
      return result.failed > 0;
    });
    const retriedAfterFailure =
      failedPatches.length > 0 && patchCalls.length > failedPatches.length;

    console.log(
      `  patch_file calls: ${patchCalls.length}, failed: ${failedPatches.length}, retried: ${retriedAfterFailure}`
    );

    // The final result should be correct regardless of retries
    const appJs = store.get("App.js") ?? store.get("App.jsx") ?? "";
    const appCss = store.get("App.css") ?? "";

    // The button text should have changed
    const hasNewText = appJs.includes("Split the Bill");
    // The button should be purple (in JS or CSS)
    const hasPurple =
      appCss.includes("purple") ||
      appCss.includes("#8b5cf6") ||
      appCss.includes("#7c3aed") ||
      appCss.includes("#9333ea") ||
      appCss.includes("#6d28d9") ||
      appJs.includes("purple");

    console.log(`  Button text updated: ${hasNewText}, Purple applied: ${hasPurple}`);
    expect(hasNewText).toBe(true);
  });

  it("multi-step changes — each step should be incremental", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestAppTools(store).map((t) => wrapTool(t, log));
    const conversation: Message[] = [systemMsg(SYSTEM_PROMPT)];
    const snapshots: Array<{
      label: string;
      snap: Map<string, string>;
      diffs?: FileDiff[];
    }> = [];

    // Step 1: Generate a todo app
    conversation.push(userMsg("Build a todo list app with add and remove functionality."));
    const gen = await runTurn(conversation, tools);
    expect(gen.result.error).toBeNull();
    dumpFiles(store, "precision-multi/step-1-initial");
    conversation.push(assistantMsg(gen.responseText));
    snapshots.push({ label: "initial", snap: snapshot(store) });

    // Step 2: Change background color
    conversation.push(userMsg("Change the background color to dark navy blue."));
    const s2 = await runTurn(conversation, tools);
    expect(s2.result.error).toBeNull();
    dumpFiles(store, "precision-multi/step-2-bg-color");
    conversation.push(assistantMsg(s2.responseText));
    const diffs2 = diffSnapshots(snapshots[0]!.snap, snapshot(store));
    snapshots.push({
      label: "bg-color",
      snap: snapshot(store),
      diffs: diffs2,
    });
    printDiff("Step 2: bg color", diffs2);

    // Step 3: Add a completed count
    conversation.push(userMsg("Add a counter showing how many tasks are completed."));
    const s3 = await runTurn(conversation, tools);
    expect(s3.result.error).toBeNull();
    dumpFiles(store, "precision-multi/step-3-counter");
    conversation.push(assistantMsg(s3.responseText));
    const diffs3 = diffSnapshots(snapshots[1]!.snap, snapshot(store));
    snapshots.push({
      label: "counter",
      snap: snapshot(store),
      diffs: diffs3,
    });
    printDiff("Step 3: completed counter", diffs3);

    // Step 4: Change font to monospace
    conversation.push(userMsg("Change the font to monospace."));
    const s4 = await runTurn(conversation, tools);
    expect(s4.result.error).toBeNull();
    dumpFiles(store, "precision-multi/step-4-font");
    conversation.push(assistantMsg(s4.responseText));
    const diffs4 = diffSnapshots(snapshots[2]!.snap, snapshot(store));
    snapshots.push({ label: "font", snap: snapshot(store), diffs: diffs4 });
    printDiff("Step 4: monospace font", diffs4);

    // Summary
    console.log("\n  === Precision Summary ===");
    for (const s of snapshots) {
      if (!s.diffs) continue;
      const total = s.diffs.reduce((sum, d) => sum + d.linesChanged, 0);
      const modified = s.diffs.filter((d) => d.status === "modified").map((d) => d.path);
      console.log(`  ${s.label}: ${total} lines changed in [${modified.join(", ")}]`);
    }

    // Each incremental change should modify fewer than 50 lines total.
    // If we see 100+ lines per small tweak, the LLM is doing full rewrites.
    for (const s of snapshots) {
      if (!s.diffs) continue;
      const total = s.diffs.reduce((sum, d) => sum + d.linesChanged, 0);
      if (total > 50) {
        console.warn(`  WARNING: "${s.label}" changed ${total} lines — likely a full rewrite`);
      }
    }
  });
});
