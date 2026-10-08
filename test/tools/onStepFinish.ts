import { describe, it, expect } from "vitest";
import { runToolLoop } from "./setup.js";
import type { StepFinishEvent } from "../../src/lib/chat/toolLoop.js";
import { createIpGeolocationTool } from "./stubs/ipGeolocation.js";
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

    expect(steps.length).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < steps.length; i++) {
      expect(steps[i].stepIndex).toBe(i + 1);
    }

    for (const step of steps) {
      expect(step.toolCalls.length).toBeGreaterThanOrEqual(1);
      expect(step.toolResults.length).toBeGreaterThanOrEqual(1);

      for (const tc of step.toolCalls) {
        expect(typeof tc.name).toBe("string");
        expect(tc.name.length).toBeGreaterThan(0);
        expect(typeof tc.arguments).toBe("string");
      }

      for (const tr of step.toolResults) {
        expect(typeof tr.name).toBe("string");
        expect(tr.result).toBeDefined();
      }
    }

    const firstStepToolNames = steps[0].toolCalls.map((tc) => tc.name);
    expect(firstStepToolNames).toContain("geolocate_ip");
  });
});
