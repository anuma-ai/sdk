/**
 * Multi-turn tool chaining test: geolocate → timezone
 *
 * Verifies that runToolLoop correctly handles multiple tool rounds where
 * the model uses the result of one tool call to inform the next.
 */

import { describe, it, expect } from "vitest";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createIpGeolocationTool } from "../../src/tools/ipGeolocation.js";
import { createTimezoneTool } from "../../src/tools/timezone.js";
import { config, printResult, wrapTool, type ToolCallLog } from "./setup.js";

describe("tool-chaining", () => {
  it("chains geolocate → timezone and returns valid results", async () => {
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
    });

    printResult(result);

    expect(result.error).toBeNull();

    const geolocateCalls = log.filter((l) => l.name === "geolocate_ip");
    const timezoneCalls = log.filter((l) => l.name === "get_current_time");

    expect(geolocateCalls.length).toBeGreaterThanOrEqual(1);
    expect(timezoneCalls.length).toBeGreaterThanOrEqual(1);

    // geolocate should appear before any timezone call
    const firstGeoIdx = log.indexOf(geolocateCalls[0]);
    const firstTzIdx = log.indexOf(timezoneCalls[0]);
    expect(firstGeoIdx).toBeLessThan(firstTzIdx);

    // The last timezone call should have a valid IANA timezone and a successful result
    const lastTzCall = timezoneCalls[timezoneCalls.length - 1];
    const tz = lastTzCall.args.timezone as string;
    expect(tz).toContain("/");

    const tzResult = lastTzCall.result as Record<string, unknown>;
    expect(tzResult).toHaveProperty("datetime");
  });
});
