import { describe, expect, it, vi } from "vitest";

import { CONFIRMED_ACTION_TOOL_SETS } from "../lib/tools/serverTools";
import type { ConfirmParameter } from "./confirm";
import { createConfirmTool } from "./confirm";
import { CONFIRM_REQUIRED_FIELDS } from "./confirmConstants";
import type { UIInteractionContext } from "./uiInteraction";

const RESERVATION: ConfirmParameter[] = [
  { name: "venue_id", label: "Restaurant id", value: "84211" },
  { name: "config_id", label: "Slot", value: "rgs://resy/84211/2911/2/2026-09-25/19:30/4" },
  { name: "party_size", label: "Party size", value: "4" },
  { name: "day", label: "Date", value: "2026-09-25" },
  { name: "venue_name", label: "Restaurant", value: "Zuni Café" },
  { name: "time", label: "Time", value: "19:30" },
];

const CANCELLATION: ConfirmParameter[] = [
  { name: "reservation_id", label: "Reservation", value: "812734455" },
  { name: "venue_name", label: "Restaurant", value: "Zuni Café" },
  { name: "day", label: "Date", value: "2026-09-25" },
  { name: "time", label: "Time", value: "19:30" },
  { name: "party_size", label: "Party size", value: "4" },
  { name: "fee_applies", label: "Fee applies", value: "false" },
  { name: "fee_amount", label: "Fee", value: "0" },
];

const CANCEL_ARGS = {
  title: "Cancel your reservation",
  action: "cancel_reservation",
  parameters: CANCELLATION,
};

const without = (parameters: ConfirmParameter[], name: string) =>
  parameters.filter((p) => p.name !== name);

const BOOKING_ARGS = {
  title: "Confirm your reservation",
  action: "book_restaurant",
  parameters: RESERVATION,
};

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
    expect(tool.executorTimeout).toBe(Infinity);
    const params = (tool.function as { arguments: { required?: string[] } }).arguments;
    expect(params.required).toEqual(["title", "action", "parameters"]);
  });

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

  it("cancels the pending prompt when the run is aborted", async () => {
    const { context, createInteraction, settle } = pendingContext();
    const cancelInteraction = vi.fn((_id: string) => settle().fail(new Error("cancelled")));
    const tool = createConfirmTool({ getContext: () => ({ ...context, cancelInteraction }) });
    const controller = new AbortController();

    const pending = tool.executor!(BOOKING_ARGS, controller.signal);
    controller.abort();

    await expect(pending).resolves.toEqual({ cancelled: true });
    expect(cancelInteraction).toHaveBeenCalledWith(createInteraction.mock.calls[0][0]);
  });

  describe("restaurant cards", () => {
    it("refuses a booking card missing config_id, naming it, and shows nothing", async () => {
      const { context, createInteraction } = pendingContext();
      const tool = createConfirmTool({ getContext: () => context });

      const result = await tool.executor?.({
        ...BOOKING_ARGS,
        parameters: without(RESERVATION, "config_id"),
      });

      expect(result).toEqual({
        error:
          "card is missing config_id; look them up and call prompt_user_confirm again with every field",
      });
      expect(createInteraction).not.toHaveBeenCalled();
    });

    it("names every missing field and treats a blank value as missing", async () => {
      const { context, createInteraction } = pendingContext();
      const tool = createConfirmTool({ getContext: () => context });

      const result = (await tool.executor?.({
        ...BOOKING_ARGS,
        action: "AnumaPaymentsMCP-anuma_book_restaurant",
        parameters: [
          ...without(without(RESERVATION, "venue_id"), "time"),
          { name: "time", label: "Time", value: "  " },
        ],
      })) as { error: string };

      expect(result.error).toMatch(/^card is missing venue_id, time;/);
      expect(createInteraction).not.toHaveBeenCalled();
    });

    it("opens a cancel card that lists all seven fields", async () => {
      const { context, createInteraction, settle } = pendingContext();
      const tool = createConfirmTool({ getContext: () => context });

      const pending = tool.executor?.(CANCEL_ARGS);
      settle().answer({ confirmed: true });
      await pending;

      expect(createInteraction).toHaveBeenCalledTimes(1);
    });

    it("refuses a cancel card without the fee", async () => {
      const { context, createInteraction } = pendingContext();
      const tool = createConfirmTool({ getContext: () => context });

      const result = (await tool.executor?.({
        ...CANCEL_ARGS,
        parameters: without(CANCELLATION, "fee_amount"),
      })) as { error: string };

      expect(result.error).toMatch(/^card is missing fee_amount;/);
      expect(createInteraction).not.toHaveBeenCalled();
    });

    it("leaves other actions' cards alone", async () => {
      const { context, createInteraction, settle } = pendingContext();
      const tool = createConfirmTool({ getContext: () => context });

      const pending = tool.executor?.({
        title: "Place the order?",
        action: "place_order",
        parameters: [{ name: "item", label: "Item", value: "Pad thai" }],
      });
      settle().answer({ confirmed: true });
      const result = (await pending) as Record<string, unknown>;

      expect(createInteraction).toHaveBeenCalledTimes(1);
      expect(result.status).toBeUndefined();
      expect(result.next_step).toBeUndefined();
    });

    it.each([
      [BOOKING_ARGS, "confirmed_not_booked", "AnumaPaymentsMCP-anuma_book_restaurant"],
      [CANCEL_ARGS, "confirmed_not_cancelled", "AnumaPaymentsMCP-anuma_cancel_reservation"],
    ])("says an approved %j has not happened yet", async (args, status, tool) => {
      const { context, settle } = pendingContext();
      const confirm = createConfirmTool({ getContext: () => context });

      const pending = confirm.executor?.(args);
      settle().answer({ confirmed: true });

      expect(await pending).toMatchObject({
        confirmed: true,
        status,
        next_step: `call ${tool} now with these exact values`,
      });
    });

    it("adds no status to a declined booking", async () => {
      const { context, settle } = pendingContext();
      const tool = createConfirmTool({ getContext: () => context });

      const pending = tool.executor?.(BOOKING_ARGS);
      settle().answer({ confirmed: false });
      const result = (await pending) as Record<string, unknown>;

      expect(result.status).toBeUndefined();
      expect(result.next_step).toBeUndefined();
    });

    it("covers every action spelling the narrowing knows", () => {
      expect([...CONFIRM_REQUIRED_FIELDS.keys()].sort()).toEqual(
        [...CONFIRMED_ACTION_TOOL_SETS.keys()].sort()
      );
    });
  });
});
