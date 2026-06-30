import { describe, expect, it, vi } from "vitest";

import { createConnectorOfferTool } from "./connectorOffer";

describe("createConnectorOfferTool", () => {
  it("registers as display_connector with skipContinuation and requires connectorId", () => {
    const tool = createConnectorOfferTool({ getContext: () => null });
    expect(tool.function.name).toBe("display_connector");
    expect(tool.skipContinuation).toBe(true);
    const params = tool.function.arguments as { required?: string[] };
    expect(params.required).toContain("connectorId");
  });

  it("returns the connector id and reason and records a display interaction", async () => {
    const createDisplayInteraction = vi.fn();
    const tool = createConnectorOfferTool({
      getContext: () => ({
        createInteraction: vi.fn(),
        createDisplayInteraction,
      }),
      getLastMessageId: () => "assistant-1",
    });

    const result = await tool.executor?.({
      connectorId: "notion",
      reason: "Pull the meeting notes from your Notion workspace",
    });

    expect(result).toEqual({
      connectorId: "notion",
      reason: "Pull the meeting notes from your Notion workspace",
    });
    expect(createDisplayInteraction).toHaveBeenCalledTimes(1);
    expect(createDisplayInteraction.mock.calls[0]?.[1]).toBe("connector");
    expect(createDisplayInteraction.mock.calls[0]?.[4]).toBe(1);
  });

  it("omits reason when not provided", async () => {
    const tool = createConnectorOfferTool({ getContext: () => null });

    const result = await tool.executor?.({ connectorId: "gmail" });

    expect(result).toEqual({ connectorId: "gmail" });
  });

  it("returns an error when connectorId is missing", async () => {
    const tool = createConnectorOfferTool({ getContext: () => null });

    const result = await tool.executor?.({ reason: "no id here" });

    expect(result).toEqual({ error: "Missing connector id for connector offer" });
  });
});
