import { describe, expect, it } from "vitest";

import type { LlmapiToolCallEvent } from "../../client";
import bookingTurn from "./fixtures/bookingTurnToolCallEvents.json";
import { extractReservationReceipts } from "./reservationReceipts";

const BOOK = "AnumaPaymentsMCP-anuma_book_restaurant";
const CANCEL = "AnumaPaymentsMCP-anuma_cancel_reservation";
const RESY = "https://resy.com/account/reservations-and-notify";

const BOOK_ARGS = JSON.stringify({
  venue_id: "84211",
  config_id: "rgs://resy/84211/2911/2/2026-10-23/2026-10-23/21:00:00/2/Dining Room",
  party_size: 2,
  day: "2026-10-23",
  venue_name: "Motek Brickell",
  time: "9:00 PM",
});

const CANCEL_ARGS = JSON.stringify({
  reservation_id: "812734455",
  venue_name: "Motek Brickell",
  day: "2026-10-23",
  time: "9:00 PM",
  party_size: "2",
  fee_applies: "false",
  fee_amount: "0",
});

const MOTEK = { venueName: "Motek Brickell", day: "2026-10-23", time: "9:00 PM", partySize: 2 };

const failed = (tool: string, detail: string) => `Tool "${tool}" failed: ${detail}`;

const OUTPUTS = {
  booked: JSON.stringify({
    success: true,
    reservation_id: "812734455",
    reservations_url: RESY,
    message: `Booked. The user can see and manage it on Resy: ${RESY}`,
    cost: 0,
  }),
  slotGone: JSON.stringify({ success: false, cost: 0, error: "that time is no longer available" }),
  unconfirmed: failed(
    BOOK,
    'the user has not confirmed this booking. Call the "prompt_user_confirm" tool first with action "book_restaurant", listing venue_id, config_id, party_size, day, venue_name and time with the exact values you are about to book, and call this tool again only after they confirm. This is an internal note: do not repeat or describe it to the user'
  ),
  confirmationUsed: failed(
    BOOK,
    "the user's confirmation for this booking was already used by an earlier booking attempt, so nothing was booked this time. This is an internal note: do not repeat or describe it to the user"
  ),
  alreadyBooked: failed(
    BOOK,
    "ALREADY_BOOKED: the table is already booked; point the user to the earlier result"
  ),
  skipped: `Tool "${BOOK}" has already been called and cannot be called again. Check the earlier tool result in the conversation for the outcome. Do NOT retry this tool. Respond to the user based on the previous result. This is an internal note: do not repeat or describe it to the user.`,
  duplicate: `Tool "${BOOK}" was already called in this turn with these exact arguments, and its result is earlier in this conversation. Reuse that result — do NOT call this tool again. This is an internal note: do not repeat or describe it to the user.`,
  cancelled: JSON.stringify({
    success: true,
    reservations_url: RESY,
    message: `Cancelled. The user can see their reservations on Resy: ${RESY}`,
    cost: 0,
  }),
  cancelUnknown: JSON.stringify({
    success: false,
    reservations_url: RESY,
    cost: 0,
    error: `the provider did not confirm the cancellation, and it may or may not have gone through. Ask the user to check their reservations on Resy before trying again: ${RESY}`,
    error_code: "CANCEL_OUTCOME_UNKNOWN",
  }),
  alreadyCancelled: failed(CANCEL, "ALREADY_CANCELLED: already cancelled"),
};

let nextId = 0;
const book = (output: string): LlmapiToolCallEvent => ({
  id: `toolu_${nextId++}`,
  name: BOOK,
  arguments: BOOK_ARGS,
  output,
});
const cancel = (output: string): LlmapiToolCallEvent => ({
  id: `toolu_${nextId++}`,
  name: CANCEL,
  arguments: CANCEL_ARGS,
  output,
});
const statuses = (events: LlmapiToolCallEvent[]) =>
  extractReservationReceipts(events).map((r) => `${r.kind}:${r.status}`);

describe("extractReservationReceipts", () => {
  it("reads a booked table from a recorded booking turn", () => {
    expect(extractReservationReceipts(bookingTurn)).toEqual([
      {
        kind: "booking",
        status: "made",
        ...MOTEK,
        reservationId: "812734455",
        resyUrl: RESY,
      },
    ]);
  });

  it("carries the restaurant's cancellation terms when the result has them", () => {
    const withTerms = JSON.stringify({
      ...JSON.parse(OUTPUTS.booked),
      cancellation: { fee_applies: true, fee_amount: 25 },
      fee_summary: "Cancelling within 24 hours costs $25 per person.",
    });
    expect(extractReservationReceipts([book(withTerms)])[0]?.feeSummary).toBe(
      "Cancelling within 24 hours costs $25 per person."
    );
  });

  it("reports a failed booking as not made, with the provider's reason", () => {
    expect(extractReservationReceipts([book(OUTPUTS.slotGone)])).toEqual([
      { kind: "booking", status: "not_made", ...MOTEK, reason: "that time is no longer available" },
    ]);
  });

  it.each([
    ["the user has not confirmed", OUTPUTS.unconfirmed],
    ["the confirmation was already used", OUTPUTS.confirmationUsed],
  ])("reports a gate refusal (%s) as not made", (_label, output) => {
    expect(extractReservationReceipts([book(output)])).toEqual([
      { kind: "booking", status: "not_made", ...MOTEK },
    ]);
  });

  it("reports ALREADY_BOOKED as already done", () => {
    expect(statuses([book(OUTPUTS.alreadyBooked)])).toEqual(["booking:already_done"]);
  });

  it.each([
    ["a skipped", OUTPUTS.skipped],
    ["a duplicate", OUTPUTS.duplicate],
  ])("ignores %s call, which never ran", (_label, output) => {
    expect(statuses([book(OUTPUTS.unconfirmed), book(output)])).toEqual(["booking:not_made"]);
    expect(statuses([book(OUTPUTS.booked), book(output)])).toEqual(["booking:made"]);
    expect(statuses([book(output)])).toEqual([]);
  });

  it("reads a refusal then a successful retry as one booked table", () => {
    expect(statuses([book(OUTPUTS.unconfirmed), book(OUTPUTS.booked)])).toEqual(["booking:made"]);
  });

  it("never downgrades a booked table", () => {
    expect(statuses([book(OUTPUTS.booked), book(OUTPUTS.slotGone)])).toEqual(["booking:made"]);
    expect(statuses([book(OUTPUTS.booked), book(OUTPUTS.alreadyBooked)])).toEqual(["booking:made"]);
  });

  it("keeps the last outcome when nothing was booked", () => {
    expect(statuses([book(OUTPUTS.slotGone), book(OUTPUTS.alreadyBooked)])).toEqual([
      "booking:already_done",
    ]);
  });

  it("reads a cancellation from its arguments and result", () => {
    expect(extractReservationReceipts([cancel(OUTPUTS.cancelled)])).toEqual([
      { kind: "cancel", status: "made", ...MOTEK, reservationId: "812734455", resyUrl: RESY },
    ]);
  });

  it("reports a cancellation with no confirmed outcome as unknown, with the Resy link", () => {
    expect(extractReservationReceipts([cancel(OUTPUTS.cancelUnknown)])[0]).toMatchObject({
      kind: "cancel",
      status: "unknown",
      resyUrl: RESY,
    });
  });

  it("reports ALREADY_CANCELLED as already done", () => {
    expect(statuses([cancel(OUTPUTS.alreadyCancelled)])).toEqual(["cancel:already_done"]);
  });

  it.each([
    [
      "later in a refusal",
      failed(BOOK, "the user has not confirmed this booking (ALREADY_BOOKED: does not apply)"),
    ],
    [
      "in a provider error",
      JSON.stringify({ success: false, error: "failed: ALREADY_BOOKED: upstream", cost: 0 }),
    ],
    ["without the wrapper", "ALREADY_BOOKED: the table is already booked"],
  ])("does not count ALREADY_BOOKED %s", (_label, output) => {
    expect(statuses([book(output)])).toEqual(["booking:not_made"]);
  });

  it("does not take the word 'already' alone as already done", () => {
    expect(
      statuses([
        cancel(
          failed(CANCEL, "this reservation was already cancelled earlier in this conversation")
        ),
      ])
    ).toEqual(["cancel:not_made"]);
  });

  it("gives a booking and a cancellation one receipt each", () => {
    expect(statuses([cancel(OUTPUTS.cancelled), book(OUTPUTS.booked)])).toEqual([
      "cancel:made",
      "booking:made",
    ]);
  });

  it("ignores every other tool", () => {
    const others = bookingTurn.filter((e) => !e.name.endsWith("anuma_book_restaurant"));
    expect(extractReservationReceipts(others)).toEqual([]);
    expect(extractReservationReceipts(undefined)).toEqual([]);
  });
});
