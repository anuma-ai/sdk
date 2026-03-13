#!/usr/bin/env node
/**
 * Tool loop e2e smoke test
 *
 * Tests runToolLoop against the real Portal API with an IP geolocation
 * tool that calls a public API (no auth required).
 *
 * Usage:
 *   tsx test/tools/toolLoop.ts                          # default test
 *   tsx test/tools/toolLoop.ts --model openai/gpt-4o    # override model
 *   tsx test/tools/toolLoop.ts --completions            # use completions API
 */

import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import type { ToolConfig } from "../../src/lib/chat/useChat/types.js";
import { createIpGeolocationTool } from "../../src/tools/ipGeolocation.js";
import { config, extractText, header, printResult, runTests } from "./setup.js";

let executorCallCount = 0;
let lastExecutorResult: unknown = null;

function buildGeolocateTool(): ToolConfig {
  const tool = createIpGeolocationTool();
  const originalExecutor = tool.executor!;

  tool.executor = async (a: Record<string, unknown>) => {
    executorCallCount++;
    console.log(`  [executor] geolocate_ip called (${executorCallCount}x): ${(a as any).ip}`);
    const result = await originalExecutor(a);
    lastExecutorResult = result;
    return typeof result === "string" ? result : JSON.stringify(result);
  };

  return tool;
}

async function testGeolocate() {
  header("IP geolocation tool");
  executorCallCount = 0;
  lastExecutorResult = null;

  const geolocateTool = buildGeolocateTool();

  const result = await runToolLoop({
    messages: [{ role: "user", content: [{ type: "text", text: "Where is the IP address 8.8.8.8 located?" }] }],
    model: config.model,
    baseUrl: config.baseUrl,
    headers: { "X-API-Key": config.portalKey },
    apiType: config.apiType,
    tools: [geolocateTool],
    toolChoice: "auto",
    maxToolRounds: 3,
    onToolCall: (tc) => console.log("  [toolCall]", tc.function?.name, tc.function?.arguments),
    onServerToolCall: (tc) => console.log("  [serverToolCall]", tc.name, tc.status),
  });

  printResult(result);

  // Assertions
  const errors: string[] = [];

  // 1. No API error
  if (result.error) {
    errors.push(`API returned error: ${result.error}`);
  }

  // 2. Executor was called exactly once
  if (executorCallCount === 0) {
    errors.push("Executor was never called");
  } else if (executorCallCount > 1) {
    errors.push(`Executor called ${executorCallCount} times, expected 1`);
  }

  // 3. Executor returned valid geolocation data
  if (lastExecutorResult && typeof lastExecutorResult === "object") {
    const geo = lastExecutorResult as Record<string, unknown>;
    if (geo.country !== "United States") {
      errors.push(`Expected country "United States", got "${geo.country}"`);
    }
    if (!geo.isp || !(geo.isp as string).toLowerCase().includes("google")) {
      errors.push(`Expected ISP to contain "google", got "${geo.isp}"`);
    }
  } else if (typeof lastExecutorResult === "string" && lastExecutorResult.startsWith("Error")) {
    errors.push(`Executor returned error: ${lastExecutorResult}`);
  }

  // 4. Model response mentions expected location info
  const responseText = extractText(result).toLowerCase();
  if (responseText && !responseText.includes("united states") && !responseText.includes("ashburn")) {
    errors.push("Model response doesn't mention expected location (United States / Ashburn)");
  }

  // Print results
  for (const e of errors) {
    console.log(`  ✗ ${e}`);
  }
  if (errors.length === 0) {
    console.log("  ✓ Executor called exactly once");
    console.log("  ✓ Geolocation data is correct (US / Google)");
    console.log("  ✓ Model response mentions expected location");
  }

  return errors.length === 0;
}

runTests([{ name: "geolocate-ip", run: testGeolocate }]).catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
