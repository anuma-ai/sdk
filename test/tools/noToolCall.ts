/**
 * E2E test: verify tools are not called for unrelated prompts
 *
 * Registers all client-side display tools and sends a prompt that
 * should not trigger any of them.
 */

import { describe, it, expect } from "vitest";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createChartTool } from "../../src/tools/chart.js";
import { createPhoneCallOfferTool } from "../../src/tools/phoneCallOffer.js";
import { createIpGeolocationTool } from "../../src/tools/ipGeolocation.js";
import { createTimezoneTool } from "../../src/tools/timezone.js";
import { config, printResult, wrapTool, type ToolCallLog } from "./setup.js";

const uiToolOpts = {
  getContext: () => null,
  getLastMessageId: () => undefined,
};

describe("no-tool-call", () => {
  it("does not call any tools for an unrelated question", async () => {
    const log: ToolCallLog[] = [];
    const tools = [
      wrapTool(createChartTool(uiToolOpts), log),
      wrapTool(createPhoneCallOfferTool(uiToolOpts), log),
      wrapTool(createIpGeolocationTool(), log),
      wrapTool(createTimezoneTool(), log),
    ];

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "What is the capital of France?" }],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 3,
    });

    printResult(result);

    expect(result.error).toBeNull();
    expect(log).toHaveLength(0);
  });
});
