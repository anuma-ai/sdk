/**
 * Single tool call test: IP geolocation
 *
 * Verifies that runToolLoop correctly executes a single client-side tool
 * and the model produces a valid response from the tool result.
 */

import { describe, it, expect } from "vitest";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createIpGeolocationTool } from "../../src/tools/ipGeolocation.js";
import { config, extractText, printResult, wrapTool, type ToolCallLog } from "./setup.js";

describe("geolocate-ip", () => {
  it("calls the tool once and returns correct geolocation data", async () => {
    const log: ToolCallLog[] = [];
    const geolocateTool = wrapTool(createIpGeolocationTool(), log);

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "Where is the IP address 8.8.8.8 located?" }],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools: [geolocateTool],
      toolChoice: "auto",
      maxToolRounds: 3,
    });

    printResult(result);

    expect(result.error).toBeNull();
    expect(log).toHaveLength(1);

    const geo = log[0].result as Record<string, unknown>;
    expect(geo.country).toBe("United States");
    expect((geo.isp as string).toLowerCase()).toContain("google");

    const responseText = extractText(result).toLowerCase();
    expect(responseText.includes("united states") || responseText.includes("ashburn")).toBe(true);
  });
});
