import type { LlmapiToolCallEvent } from "../../client";

/**
 * What became of a restaurant booking or cancellation in one turn, read from
 * the server's own tool result rather than from the model's reply.
 */
export type ReservationReceipt = {
  kind: "booking" | "cancel";
  /**
   * `made`: the provider confirmed it. `not_made`: it did not happen.
   * `already_done`: an earlier call in the conversation had already done it.
   * `unknown`: the call reached the provider and its outcome is not known.
   */
  status: "made" | "not_made" | "already_done" | "unknown";
  venueName: string;
  /** As the call sent it, e.g. `2026-10-23`. */
  day: string;
  /** As the call sent it, e.g. `9:00 PM`. */
  time: string;
  partySize?: number;
  reservationId?: string;
  /** Resy page where the user can see the reservation. */
  resyUrl?: string;
  /** The restaurant's own cancellation terms, when the booking result carries them. */
  feeSummary?: string;
  /** The provider's stated reason, when it did not happen. */
  reason?: string;
};

type Action = { kind: ReservationReceipt["kind"]; tool: string; alreadyDone: RegExp };

const ACTIONS: readonly Action[] = [
  {
    kind: "booking",
    tool: "anuma_book_restaurant",
    alreadyDone: /^Tool "[^"]*" failed: ALREADY_BOOKED:/,
  },
  {
    kind: "cancel",
    tool: "anuma_cancel_reservation",
    alreadyDone: /^Tool "[^"]*" failed: ALREADY_CANCELLED:/,
  },
];

/** The portal's notes for a call it refused to run again: not an attempt. */
const NOT_AN_ATTEMPT = /^Tool "[^"]*" (has already been called|was already called)/;

/** The portal's note for a booking whose payment call failed after the gate passed. */
const BOOKING_OUTCOME_UNKNOWN = /^Tool "[^"]*" failed: BOOKING_OUTCOME_UNKNOWN:/;

const CANCEL_OUTCOME_UNKNOWN = "CANCEL_OUTCOME_UNKNOWN";

/**
 * One receipt per kind for the turn's booking and cancel calls, holding the
 * last attempt's outcome. A `made` outcome is never replaced by a later one,
 * so a refused call followed by a successful retry reads as made, and an
 * `unknown` one is replaced only by `made`.
 */
export function extractReservationReceipts(
  toolCallEvents?: LlmapiToolCallEvent[]
): ReservationReceipt[] {
  const latest = new Map<ReservationReceipt["kind"], ReservationReceipt>();
  for (const event of toolCallEvents ?? []) {
    const action = ACTIONS.find((a) => event.name?.endsWith(a.tool));
    const output = event.output ?? "";
    if (!action || !output || NOT_AN_ATTEMPT.test(output)) continue;
    const kept = latest.get(action.kind)?.status;
    if (kept === "made") continue;
    const receipt = toReceipt(action, event.arguments ?? "", output);
    if (kept === "unknown" && receipt.status !== "made") continue;
    latest.set(action.kind, receipt);
  }
  return [...latest.values()];
}

function toReceipt(action: Action, argumentsJson: string, output: string): ReservationReceipt {
  const args = parseObject(argumentsJson);
  const result = parseObject(output);
  return {
    kind: action.kind,
    venueName: text(args.venue_name) ?? "",
    day: text(args.day) ?? "",
    time: text(args.time) ?? "",
    partySize: count(args.party_size),
    reservationId: text(result.reservation_id) ?? text(args.reservation_id),
    resyUrl: text(result.reservations_url),
    feeSummary: text(result.fee_summary),
    ...outcome(action, output, result),
  };
}

function outcome(
  action: Action,
  output: string,
  result: Record<string, unknown>
): Pick<ReservationReceipt, "status" | "reason"> {
  if (action.alreadyDone.test(output)) return { status: "already_done" };
  const reason = text(result.error);
  if (action.kind === "booking") {
    if (BOOKING_OUTCOME_UNKNOWN.test(output)) return { status: "unknown" };
    const held = result.success === true || text(result.reservation_id) !== undefined;
    return held ? { status: "made" } : { status: "not_made", reason };
  }
  if (result.error_code === CANCEL_OUTCOME_UNKNOWN) return { status: "unknown", reason };
  const cancelled = result.success === true && !result.error && !result.error_code;
  return cancelled ? { status: "made" } : { status: "not_made", reason };
}

function parseObject(json: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function text(value: unknown): string | undefined {
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value ? value : undefined;
}

function count(value: unknown): number | undefined {
  const n = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}
