/**
 * E2E test: display_chart tool
 *
 * Verifies that the model calls display_chart with valid chart data
 * and the tool executor returns the expected result structure.
 */

import { describe, it, expect } from "vitest";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createChartTool } from "../../src/tools/chart.js";
import { config, extractText, printResult, wrapTool, type ToolCallLog } from "./setup.js";
import type { DisplayChartResult } from "../../src/tools/chart.js";

const chartToolOpts = {
  getContext: () => null,
  getLastMessageId: () => undefined,
};

describe("display_chart", () => {
  it("renders a bar chart from explicit data", async () => {
    const log: ToolCallLog[] = [];
    const tool = wrapTool(createChartTool(chartToolOpts), log);

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Show me a bar chart of quarterly revenue: Q1 $10M, Q2 $15M, Q3 $12M, Q4 $20M. Use the display_chart tool.",
            },
          ],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools: [tool],
      toolChoice: "auto",
      maxToolRounds: 3,
    });

    printResult(result);

    expect(result.error).toBeNull();
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].name).toBe("display_chart");

    const raw = log[0].result;
    const chart = (typeof raw === "string" ? JSON.parse(raw) : raw) as DisplayChartResult;
    expect("error" in chart).toBe(false);

    if (!("error" in chart)) {
      expect(chart.chartType).toBe("bar");
      expect(chart.data.length).toBe(4);
      expect(chart.dataKeys.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("renders a pie chart", async () => {
    const log: ToolCallLog[] = [];
    const tool = wrapTool(createChartTool(chartToolOpts), log);

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Create a pie chart showing market share: Chrome 65%, Safari 18%, Firefox 10%, Other 7%. Use the display_chart tool.",
            },
          ],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools: [tool],
      toolChoice: "auto",
      maxToolRounds: 3,
    });

    printResult(result);

    expect(result.error).toBeNull();
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].name).toBe("display_chart");

    const raw = log[0].result;
    const chart = (typeof raw === "string" ? JSON.parse(raw) : raw) as DisplayChartResult;
    expect("error" in chart).toBe(false);

    if (!("error" in chart)) {
      expect(chart.chartType).toBe("pie");
      expect(chart.data.length).toBe(4);
      expect(chart.dataKeys.length).toBeGreaterThanOrEqual(1);
    }
  });

});
