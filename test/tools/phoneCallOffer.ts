/**
 * E2E test: display_phone_call_offer tool
 *
 * Verifies that the model calls display_phone_call_offer with valid
 * recipient info, phone number, and objective.
 */

import { describe, it, expect } from "vitest";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createPhoneCallOfferTool } from "../../src/tools/phoneCallOffer.js";
import { config, printResult, wrapTool, type ToolCallLog } from "./setup.js";
import type { DisplayPhoneCallOfferResult } from "../../src/tools/phoneCallOffer.js";

const toolOpts = {
  getContext: () => null,
  getLastMessageId: () => undefined,
};

describe("display_phone_call_offer", () => {
  it("offers a phone call with valid recipient and objective", async () => {
    const log: ToolCallLog[] = [];
    const tool = wrapTool(createPhoneCallOfferTool(toolOpts), log);

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "I want to book a table at Luigi's Italian Restaurant tonight for 4 people. Their number is +1 212 555 0199. Can you call them to check availability?",
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
    expect(log[0].name).toBe("display_phone_call_offer");

    const raw = log[0].result;
    const offer = (typeof raw === "string" ? JSON.parse(raw) : raw) as DisplayPhoneCallOfferResult;
    expect("error" in offer).toBe(false);

    if (!("error" in offer)) {
      expect(offer.recipientName.toLowerCase()).toContain("luigi");
      expect(offer.phoneNumber.replace(/\D/g, "")).toMatch(/1?\d{10,}/);
      expect(offer.objective).toBeTruthy();
    }
  });
});
