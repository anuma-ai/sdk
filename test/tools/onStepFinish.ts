/**
 * onStepFinish callback test: verifies the callback fires for each tool round.
 *
 * Uses geolocate → timezone chaining so we get at least two rounds,
 * then asserts that onStepFinish was called with correct shape for each.
 */

import { describe, it, expect } from "vitest";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import type { StepFinishEvent } from "../../src/lib/chat/toolLoop.js";
import { createIpGeolocationTool } from "../../src/tools/ipGeolocation.js";
import { createTimezoneTool } from "../../src/tools/timezone.js";
import { config, wrapTool, type ToolCallLog } from "./setup.js";

describe("onStepFinish", () => {
  it("fires once per tool round with correct data", async () => {
    const log: ToolCallLog[] = [];
    const geolocateTool = wrapTool(createIpGeolocationTool(), log);
    const timezoneTool = wrapTool(createTimezoneTool(), log);

    const steps: StepFinishEvent[] = [];

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What is the current time at the location of IP address 8.8.8.8? First look up where it is, then get the current time for that timezone.",
            },
          ],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools: [geolocateTool, timezoneTool],
      toolChoice: "auto",
      maxToolRounds: 5,
      onStepFinish: (event) => {
        steps.push(event);
      },
    });

    expect(result.error).toBeNull();

    // Should have at least 2 steps (geolocate round, timezone round)
    expect(steps.length).toBeGreaterThanOrEqual(2);

    // Every step should have a sequential 1-based index
    for (let i = 0; i < steps.length; i++) {
      expect(steps[i].stepIndex).toBe(i + 1);
    }

    // Every step must have at least one tool call and one tool result
    for (const step of steps) {
      expect(step.toolCalls.length).toBeGreaterThanOrEqual(1);
      expect(step.toolResults.length).toBeGreaterThanOrEqual(1);

      // Each tool call should have a name and arguments string
      for (const tc of step.toolCalls) {
        expect(typeof tc.name).toBe("string");
        expect(tc.name.length).toBeGreaterThan(0);
        expect(typeof tc.arguments).toBe("string");
      }

      // Each tool result should have a name and a defined result
      for (const tr of step.toolResults) {
        expect(typeof tr.name).toBe("string");
        expect(tr.result).toBeDefined();
      }
    }

    // The first step should contain the geolocate tool
    const firstStepToolNames = steps[0].toolCalls.map((tc) => tc.name);
    expect(firstStepToolNames).toContain("geolocate_ip");
  });
});
