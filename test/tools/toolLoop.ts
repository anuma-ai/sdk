#!/usr/bin/env node
/**
 * Runs all tool loop e2e tests.
 *
 * Usage:
 *   tsx test/tools/toolLoop.ts                          # default
 *   tsx test/tools/toolLoop.ts --model openai/gpt-4o    # override model
 *   tsx test/tools/toolLoop.ts --completions            # use completions API
 *
 * Run individual tests:
 *   tsx test/tools/geolocate.ts
 *   tsx test/tools/chaining.ts
 */

import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createIpGeolocationTool } from "../../src/tools/ipGeolocation.js";
import { createTimezoneTool } from "../../src/tools/timezone.js";
import {
  assert, config, extractText, header, printAssertions, printResult, runTests, wrapTool,
  type ToolCallLog,
} from "./setup.js";

// ── Test: single tool call ───────────────────────────────────────────────────

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

// ── Test: multi-turn tool chaining ───────────────────────────────────────────

async function testChaining() {
  header("Multi-turn chaining: geolocate → timezone");
  const log: ToolCallLog[] = [];
  const geolocateTool = wrapTool(createIpGeolocationTool(), log);
  const timezoneTool = wrapTool(createTimezoneTool(), log);

  const result = await runToolLoop({
    messages: [{
      role: "user",
      content: [{ type: "text", text: "What is the current time at the location of IP address 8.8.8.8? First look up where it is, then get the current time for that timezone." }],
    }],
    model: config.model,
    baseUrl: config.baseUrl,
    headers: { "X-API-Key": config.portalKey },
    apiType: config.apiType,
    tools: [geolocateTool, timezoneTool],
    toolChoice: "auto",
    maxToolRounds: 5,
    onToolCall: (tc) => console.log("  [toolCall]", tc.function?.name, tc.function?.arguments),
    onServerToolCall: (tc) => console.log("  [serverToolCall]", tc.name, tc.status),
  });

  printResult(result);

  const errors: string[] = [];

  assert(errors, !result.error, `API returned error: ${result.error}`);

  const geolocateCalls = log.filter((l) => l.name === "geolocate_ip");
  const timezoneCalls = log.filter((l) => l.name === "get_current_time");

  assert(errors, geolocateCalls.length >= 1, `geolocate_ip was never called`);
  assert(errors, timezoneCalls.length >= 1, `get_current_time was never called`);

  // geolocate should appear before any timezone call
  if (geolocateCalls.length >= 1 && timezoneCalls.length >= 1) {
    const firstGeoIdx = log.indexOf(geolocateCalls[0]);
    const firstTzIdx = log.indexOf(timezoneCalls[0]);
    assert(errors, firstGeoIdx < firstTzIdx, `Expected geolocate_ip before get_current_time`);
  }

  // The last timezone call should have a valid IANA timezone and a successful result
  if (timezoneCalls.length >= 1) {
    const lastTzCall = timezoneCalls[timezoneCalls.length - 1];
    const tz = lastTzCall.args.timezone as string;
    assert(errors, tz?.includes("/"), `Expected IANA timezone (e.g. America/New_York), got "${tz}"`);

    const tzResult = lastTzCall.result as Record<string, unknown>;
    assert(
      errors,
      typeof tzResult === "object" && !!tzResult.datetime,
      `Timezone result should contain datetime, got: ${JSON.stringify(tzResult)}`,
    );
  }

  printAssertions(errors, [
    "Both tools were called",
    "geolocate_ip called before get_current_time",
    "Timezone tool received valid IANA timezone from geolocate result",
    "Timezone result contains datetime",
  ]);

  return errors.length === 0;
}

// ── Run all ──────────────────────────────────────────────────────────────────

runTests([
  { name: "geolocate-ip", run: testGeolocate },
  { name: "tool-chaining", run: testChaining },
]).catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
