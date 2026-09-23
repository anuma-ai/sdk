import { describe, expect, it, vi } from "vitest";

import type { ConfirmParameter } from "./confirm";
import { createConfirmTool } from "./confirm";
import type { UIInteractionContext } from "./uiInteraction";

const RESERVATION: ConfirmParameter[] = [
  { name: "venue", label: "Restaurant", value: "Zuni Café" },
  { name: "date", label: "Date", value: "2026-09-25" },
  { name: "time", label: "Time", value: "19:30" },
  { name: "party_size", label: "Party size", value: "4" },
];

const BOOKING_ARGS = {
  title: "Confirm your reservation",
  action: "book_restaurant",
  parameters: RESERVATION,
};

/**
 * A context whose interaction stays pending until the test answers it, the way
 * a real card does. `answer` resolves the promise the executor is blocked on;
 * `fail` rejects it, which is what a timeout, a cancel or a conversation switch
 * all look like from inside the tool.
 */
function pendingContext() {
  let settle!: { answer: (result: unknown) => void; fail: (error: Error) => void };
  const createInteraction = vi.fn(
    (_id: string, _type: string, _data: unknown) =>
      new Promise<unknown>((resolve, reject) => {
        settle = { answer: resolve, fail: reject };
      })
  );

  const context: UIInteractionContext = {
    createInteraction,
    createDisplayInteraction: vi.fn(),
  };

  return { context, createInteraction, settle: () => settle };
}

describe("createConfirmTool", () => {
  it("registers as prompt_user_confirm and never times its executor out", () => {
    const tool = createConfirmTool({ getContext: () => null });

    expect((tool.function as { name: string }).name).toBe("prompt_user_confirm");
    // A confirmation waits on a human. The default 30s executor timeout would
    // resolve it as unanswered while the user is still reading the card.
    expect(tool.executorTimeout).toBe(Infinity);
    const params = (tool.function as { arguments: { required?: string[] } }).arguments;
    expect(params.required).toEqual(["title", "action", "parameters"]);
  });

  // The host renders its own button labels. A model-written label could put
  // "Cancel" on the button that confirms, so the schema must not offer one.
  it("does not let the model write the button labels", () => {
    const tool = createConfirmTool({ getContext: () => null });

    const params = (tool.function as { arguments: { properties: Record<string, unknown> } })
      .arguments;
    expect(Object.keys(params.properties)).toEqual([
      "title",
      "description",
      "action",
      "parameters",
    ]);
  });

  it("blocks until the user answers", async () => {
    const { context, settle } = pendingContext();
    const tool = createConfirmTool({ getContext: () => context, getLastMessageId: () => "msg-1" });

    let settled = false;
    const pending = Promise.resolve(tool.executor?.(BOOKING_ARGS)).then((result) => {
      settled = true;
      return result;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    settle().answer({ confirmed: true });
    await pending;
    expect(settled).toBe(true);
  });

  it("opens a confirm interaction anchored to the last message", async () => {
    const { context, createInteraction, settle } = pendingContext();
    const tool = createConfirmTool({
      getContext: () => context,
      getLastMessageId: () => "assistant-7",
    });

    const pending = tool.executor?.(BOOKING_ARGS);
    settle().answer({ confirmed: true });
    await pending;

    expect(createInteraction.mock.calls[0]?.[1]).toBe("confirm");
    expect(createInteraction.mock.calls[0]?.[2]).toMatchObject({
      ...BOOKING_ARGS,
      afterMessageId: "assistant-7",
    });
  });

  // The portal refuses the booking tool unless a confirmation with matching
  // parameters is in the turn. A boolean alone would not survive that check,
  // because the model writes the booking arguments too.
  it("carries the confirmed parameters back verbatim, not just a boolean", async () => {
    const { context, settle } = pendingContext();
    const tool = createConfirmTool({ getContext: () => context });

    const pending = tool.executor?.(BOOKING_ARGS);
    settle().answer({ confirmed: true });

    const result = (await pending) as Record<string, unknown>;
    expect(result.confirmed).toBe(true);
    expect(result.action).toBe("book_restaurant");
    expect(result.parameters).toEqual(RESERVATION);
    expect(Date.parse(result.answeredAt as string)).not.toBeNaN();
  });

  // A decline is an answer, so it keeps the same shape — the portal and the
  // model both read `confirmed`, and neither has to treat it as a failure.
  it("reports a decline as an answer, with the parameters still attached", async () => {
    const { context, settle } = pendingContext();
    const tool = createConfirmTool({ getContext: () => context });

    const pending = tool.executor?.(BOOKING_ARGS);
    settle().answer({ confirmed: false });

    const result = (await pending) as Record<string, unknown>;
    expect(result).toMatchObject({
      confirmed: false,
      action: "book_restaurant",
      parameters: RESERVATION,
    });
    expect(result.cancelled).toBeUndefined();
  });

  // Only an explicit boolean is an answer. A card that resolves with a string,
  // a missing field or an unrelated shape made no decision, so it must read as
  // nobody answering — neither as permission nor as the user saying no.
  it.each([
    ["the string 'true'", { confirmed: "true" }],
    ["a truthy string", { confirmed: "yes" }],
    ["a truthy number", { confirmed: 1 }],
    ["no decision at all", {}],
    ["a differently named field", { accepted: true }],
  ])("treats %s as cancelled, not as an answer", async (_name, answer) => {
    const { context, settle } = pendingContext();
    const tool = createConfirmTool({ getContext: () => context });

    const pending = tool.executor?.(BOOKING_ARGS);
    settle().answer(answer);

    expect(await pending).toEqual({ cancelled: true });
  });

  // The third outcome: nobody answered. Distinguishable from a decline, which
  // is the point — the model must not tell the user they said no.
  it("reports a timeout as cancelled, not as a decline", async () => {
    const { context, settle } = pendingContext();
    const tool = createConfirmTool({ getContext: () => context });

    const pending = tool.executor?.(BOOKING_ARGS);
    settle().fail(new Error("Interaction timeout"));

    const result = (await pending) as Record<string, unknown>;
    expect(result).toEqual({ cancelled: true });
    expect(result.confirmed).toBeUndefined();
  });

  it("cancels when no UI is mounted, rather than assuming agreement", async () => {
    const tool = createConfirmTool({ getContext: () => null });

    await expect(tool.executor?.(BOOKING_ARGS)).resolves.toEqual({ cancelled: true });
  });

  // Arguments the user could not judge, or the portal could not compare, never
  // reach the card at all.
  it.each([
    ["no parameters", { ...BOOKING_ARGS, parameters: [] }],
    ["no action", { title: "Confirm", parameters: RESERVATION }],
    ["no title", { action: "book_restaurant", parameters: RESERVATION }],
    [
      "a non-string value",
      { ...BOOKING_ARGS, parameters: [{ name: "party_size", label: "Party size", value: 4 }] },
    ],
    [
      "an unlabelled parameter",
      { ...BOOKING_ARGS, parameters: [{ name: "party_size", value: "4" }] },
    ],
  ])("refuses to show a card with %s", async (_name, args) => {
    const { context, createInteraction } = pendingContext();
    const tool = createConfirmTool({ getContext: () => context });

    await expect(tool.executor?.(args)).resolves.toEqual({ cancelled: true });
    expect(createInteraction).not.toHaveBeenCalled();
  });
});
