import { describe, expect, it, vi } from "vitest";

import { createPhoneCallOfferTool } from "./phoneCallOffer";

describe("createPhoneCallOfferTool", () => {
  it("returns a validated phone call offer result", async () => {
    const createDisplayInteraction = vi.fn();
    const tool = createPhoneCallOfferTool({
      getContext: () => ({
        createInteraction: vi.fn(),
        createDisplayInteraction,
      }),
      getLastMessageId: () => "assistant-1",
    });

    const result = await tool.executor?.({
      recipientName: "Acme Bistro",
      phoneNumber: "(720) 822-8269",
      objective: "Confirm whether the mushroom risotto is gluten free",
      suggestedQuestions: ["Is the dish prepared in a shared pan?"],
      contextSummary: "The menu labels the risotto as vegetarian but not gluten free.",
    });

    expect(result).toEqual({
      recipientName: "Acme Bistro",
      phoneNumber: "(720) 822-8269",
      objective: "Confirm whether the mushroom risotto is gluten free",
      suggestedQuestions: ["Is the dish prepared in a shared pan?"],
      contextSummary: "The menu labels the risotto as vegetarian but not gluten free.",
    });
    expect(tool.autoExecute).toBe(true);
    expect(tool.skipContinuation).toBe(true);
    expect(createDisplayInteraction).toHaveBeenCalledTimes(1);
    expect(createDisplayInteraction.mock.calls[0]?.[1]).toBe("phone_call_offer");
    expect(createDisplayInteraction.mock.calls[0]?.[4]).toBe(1);
  });

  it("rejects invalid phone numbers", async () => {
    const tool = createPhoneCallOfferTool({
      getContext: () => null,
    });

    const result = await tool.executor?.({
      recipientName: "Acme Bistro",
      phoneNumber: "not-a-number",
      objective: "Check tonight's wait time",
    });

    expect(result).toEqual({
      error: "Invalid phone number for phone call offer: not-a-number",
    });
  });

  it("rejects phone numbers the backend will not normalize", async () => {
    const tool = createPhoneCallOfferTool({
      getContext: () => null,
    });

    const result = await tool.executor?.({
      recipientName: "Acme Bistro",
      phoneNumber: "555-1234",
      objective: "Check tonight's wait time",
    });

    expect(result).toEqual({
      error: "Invalid phone number for phone call offer: 555-1234",
    });
  });

  it("rejects more than three suggested questions", async () => {
    const tool = createPhoneCallOfferTool({
      getContext: () => null,
    });

    const result = await tool.executor?.({
      recipientName: "Acme Bistro",
      phoneNumber: "+17208228269",
      objective: "Make a reservation",
      suggestedQuestions: ["1", "2", "3", "4"],
    });

    expect(result).toEqual({
      error: "Phone call offers support at most 3 suggested questions",
    });
  });
});
