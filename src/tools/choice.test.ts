import { describe, expect, it, vi } from "vitest";

import { CHOICE_TOOL_NAME, createChoiceTool } from "./choice";
import type { UIInteractionContext } from "./uiInteraction";

const SLOTS = {
  title: "Pick a time",
  options: [
    { value: "cfg-1900", label: "7:00 PM · Dining Room" },
    { value: "cfg-2100", label: "9:00 PM · Patio" },
  ],
};

describe("createChoiceTool", () => {
  it("registers under CHOICE_TOOL_NAME", () => {
    const tool = createChoiceTool({ getContext: () => null });

    expect(CHOICE_TOOL_NAME).toBe("prompt_user_choice");
    expect((tool.function as { name: string }).name).toBe(CHOICE_TOOL_NAME);
  });

  it("returns the picked option's value to the model", async () => {
    const createInteraction = vi.fn((_id: string, _type: string, _data: unknown) =>
      Promise.resolve<unknown>({ value: "cfg-2100" })
    );
    const context: UIInteractionContext = {
      createInteraction,
      createDisplayInteraction: vi.fn(),
    };
    const tool = createChoiceTool({ getContext: () => context });

    const result = await tool.executor?.(SLOTS);

    expect(createInteraction.mock.calls[0]?.[1]).toBe("choice");
    expect(result).toMatchObject({ value: "cfg-2100", _meta: { options: SLOTS.options } });
  });
});
