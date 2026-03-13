#!/usr/bin/env node
/**
 * Multi-turn tool chaining test: geolocate → timezone
 *
 * Verifies that runToolLoop correctly handles multiple tool rounds where
 * the model uses the result of one tool call to inform the next.
 *
 * Usage: tsx test/tools/chaining.ts
 */

import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createIpGeolocationTool } from "../../src/tools/ipGeolocation.js";
import { createTimezoneTool } from "../../src/tools/timezone.js";
import {
  assert, config, header, printAssertions, printResult, runTests, wrapTool,
  type ToolCallLog,
} from "./setup.js";

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

runTests([{ name: "tool-chaining", run: testChaining }]).catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
