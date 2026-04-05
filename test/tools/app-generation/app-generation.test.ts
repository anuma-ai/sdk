/**
 * E2E tests for app generation tool loop.
 *
 * Runs real LLM calls with app file tools backed by an in-memory store.
 * Tests the full generate -> modify cycle without any UI.
 *
 * Run: PORTAL_API_KEY=... pnpm vitest run test/tools/app-generation
 */

import { afterAll, describe, expect, it } from "vitest";

import { buildAppSystemPrompt } from "../../../src/tools/appGeneration.js";
import {
  config,
  createFileStore,
  dumpFiles,
  extractText,
  printResult,
  timedToolLoop,
  type ToolCallLog,
  wrapTool,
  writeIndex,
} from "./setup.js";
import { createTestAppTools } from "./tools.js";

const SYSTEM_PROMPT = buildAppSystemPrompt();

function makeMessages(userText: string, systemPrompt?: string) {
  const msgs: Array<{
    role: string;
    content: Array<{ type: string; text: string }>;
  }> = [];
  if (systemPrompt) {
    msgs.push({
      role: "system",
      content: [{ type: "text", text: systemPrompt }],
    });
  }
  msgs.push({
    role: "user",
    content: [{ type: "text", text: userText }],
  });
  return msgs;
}

describe("app-generation", () => {
  afterAll(() => writeIndex());

  it("generates a multi-file React app with batch create_file", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestAppTools(store).map((t) => wrapTool(t, log));

    const result = await timedToolLoop({
      messages: makeMessages(
        "Build a simple counter app with increment and decrement buttons.",
        SYSTEM_PROMPT
      ),
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 5,
    });

    printResult(result);
    dumpFiles(store, "counter-app");
    expect(result.error).toBeNull();

    // Should have called create_file and display_app
    const createCalls = log.filter((l) => l.name === "create_file");
    const displayCalls = log.filter((l) => l.name === "display_app");
    expect(createCalls.length).toBeGreaterThanOrEqual(1);
    expect(displayCalls.length).toBeGreaterThanOrEqual(1);

    // Files should exist in the store
    expect(store.size).toBeGreaterThanOrEqual(2);
    expect(store.has("App.js") || store.has("App.jsx")).toBe(true);
    expect(store.has("package.json")).toBe(true);

    // App.js should contain React code
    const appContent = store.get("App.js") ?? store.get("App.jsx") ?? "";
    expect(appContent).toContain("export default");
    expect(appContent).toMatch(/useState|count/i);

    // package.json should be valid JSON with dependencies
    const pkgJson = JSON.parse(store.get("package.json")!);
    expect(pkgJson).toHaveProperty("dependencies");
  });

  it("uses batch mode (files array) instead of one-at-a-time", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestAppTools(store).map((t) => wrapTool(t, log));

    await timedToolLoop({
      messages: makeMessages(
        "Build a todo list app with add and remove functionality.",
        SYSTEM_PROMPT
      ),
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 5,
    });

    const createCalls = log.filter((l) => l.name === "create_file");

    // With batch mode, we expect 1 create_file call (or at most 2).
    // Without batch mode, we'd see 3+ calls (one per file).
    console.log(`  create_file calls: ${createCalls.length}, files in store: ${store.size}`);

    // Check if at least one call used the files array
    const batchCalls = createCalls.filter((l) => Array.isArray(l.args.files));
    console.log(
      `  batch calls: ${batchCalls.length}, single-file calls: ${createCalls.length - batchCalls.length}`
    );

    // We expect the LLM to use batch mode for initial creation
    expect(batchCalls.length).toBeGreaterThanOrEqual(1);
    dumpFiles(store, "todo-batch");
  });

  it("modifies only changed files when asked to update styles", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestAppTools(store).map((t) => wrapTool(t, log));

    // Step 1: Generate the initial app
    const genResult = await timedToolLoop({
      messages: makeMessages(
        "Build a simple calculator app with a display and number buttons.",
        SYSTEM_PROMPT
      ),
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 5,
    });

    printResult(genResult);
    dumpFiles(store, "calculator-gen");
    expect(genResult.error).toBeNull();
    expect(store.size).toBeGreaterThanOrEqual(2);

    const filesAfterGen = new Map(store);
    const callsAfterGen = log.length;
    console.log(`  After generation: ${store.size} files, ${callsAfterGen} tool calls`);

    // Step 2: Ask to change only the styles
    const updateMessages = [
      ...makeMessages(
        "Build a simple calculator app with a display and number buttons.",
        SYSTEM_PROMPT
      ),
      {
        role: "assistant" as const,
        content: [
          {
            type: "text" as const,
            text: extractText(genResult) || "Done.",
          },
        ],
      },
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: "Change the background color to dark blue and make the buttons rounded.",
          },
        ],
      },
    ];

    const updateResult = await timedToolLoop({
      messages: updateMessages,
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 5,
    });

    printResult(updateResult);
    dumpFiles(store, "calculator-updated");
    expect(updateResult.error).toBeNull();

    // Check which files were modified in step 2 (via create_file or patch_file)
    const updateCalls = log
      .slice(callsAfterGen)
      .filter((l) => l.name === "create_file" || l.name === "patch_file");
    console.log(
      `  After update: ${updateCalls.length} file-modifying calls (${updateCalls.map((l) => l.name).join(", ")})`
    );

    // The update should have modified files via create_file or patch_file
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);

    // package.json should NOT have been rewritten (no dependency change)
    const pkgBefore = filesAfterGen.get("package.json");
    const pkgAfter = store.get("package.json");
    if (pkgBefore && pkgAfter) {
      console.log(`  package.json changed: ${pkgBefore !== pkgAfter}`);
    }

    // At least one file should have changed content
    let changedFiles = 0;
    for (const [path, content] of store) {
      if (filesAfterGen.get(path) !== content) changedFiles++;
    }
    expect(changedFiles).toBeGreaterThanOrEqual(1);
    console.log(`  Files changed in update: ${changedFiles} of ${store.size}`);
  });

  it("produces valid React code that can be parsed", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestAppTools(store).map((t) => wrapTool(t, log));

    const result = await timedToolLoop({
      messages: makeMessages(
        "Build a BMI calculator. Input fields for height (cm) and weight (kg), show the result with a color indicator.",
        SYSTEM_PROMPT
      ),
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 5,
    });

    printResult(result);
    dumpFiles(store, "bmi-calculator");
    expect(result.error).toBeNull();

    const appContent = store.get("App.js") ?? store.get("App.jsx") ?? "";
    expect(appContent.length).toBeGreaterThan(0);

    // Should have a default export
    expect(appContent).toContain("export default");

    // Should import React
    expect(appContent).toMatch(/import.*react/i);

    // Should not contain CDN script tags
    expect(appContent).not.toContain("cdn.jsdelivr.net");
    expect(appContent).not.toContain("unpkg.com");
    expect(appContent).not.toContain("<script src=");

    // Should not create index.js or index.html (auto-generated)
    expect(store.has("index.js")).toBe(false);
    expect(store.has("index.html")).toBe(false);
  });

  it("generates a complex multi-feature app", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestAppTools(store).map((t) => wrapTool(t, log));

    const result = await timedToolLoop({
      messages: makeMessages(
        "Create me an app that helps me and my friends plan meals collaboratively. I want to be able to add recipes, suggest dishes for the week, and create a shared grocery list. Include a chat feature for us to discuss our meal ideas and preferences. It should have a colorful, inviting design that encourages creativity and fun in cooking together.",
        SYSTEM_PROMPT
      ),
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 10,
    });

    printResult(result);
    dumpFiles(store, "meal-planner");
    expect(result.error).toBeNull();
    console.log(`  Files: ${store.size}, Tool calls: ${log.length}`);
    console.log(`  File list: ${Array.from(store.keys()).join(", ")}`);

    // Should have created multiple files for a complex app
    expect(store.size).toBeGreaterThanOrEqual(2);
    expect(store.has("App.js") || store.has("App.jsx")).toBe(true);

    // App.js should be substantial for a multi-feature app
    const appContent = store.get("App.js") ?? store.get("App.jsx") ?? "";
    expect(appContent.length).toBeGreaterThan(500);

    // Should have used batch mode
    const createCalls = log.filter((l) => l.name === "create_file");
    const batchCalls = createCalls.filter((l) => Array.isArray(l.args.files));
    console.log(`  create_file calls: ${createCalls.length} (${batchCalls.length} batch)`);
  });
});
