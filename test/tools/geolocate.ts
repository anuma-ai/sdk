#!/usr/bin/env node
/**
 * Single tool call test: IP geolocation
 *
 * Verifies that runToolLoop correctly executes a single client-side tool
 * and the model produces a valid response from the tool result.
 *
 * Usage: tsx test/tools/geolocate.ts
 */

import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createIpGeolocationTool } from "../../src/tools/ipGeolocation.js";
import {
  assert, config, extractText, header, printAssertions, printResult, runTests, wrapTool,
  type ToolCallLog,
} from "./setup.js";

async function testGeolocate() {
  header("Single tool call: IP geolocation");
  const log: ToolCallLog[] = [];
  const geolocateTool = wrapTool(createIpGeolocationTool(), log);

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

  const errors: string[] = [];

  assert(errors, !result.error, `API returned error: ${result.error}`);
  assert(errors, log.length === 1, `Executor called ${log.length} times, expected 1`);

  if (log.length >= 1) {
    const geo = log[0].result as Record<string, unknown>;
    assert(errors, geo.country === "United States", `Expected country "United States", got "${geo.country}"`);
    assert(errors, !!(geo.isp as string)?.toLowerCase().includes("google"), `Expected ISP to contain "google", got "${geo.isp}"`);
  }

  const responseText = extractText(result).toLowerCase();
  assert(
    errors,
    !responseText || responseText.includes("united states") || responseText.includes("ashburn"),
    "Model response doesn't mention expected location (United States / Ashburn)",
  );

  printAssertions(errors, [
    "Executor called exactly once",
    "Geolocation data is correct (US / Google)",
    "Model response mentions expected location",
  ]);

  return errors.length === 0;
}

runTests([{ name: "geolocate-ip", run: testGeolocate }]).catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
