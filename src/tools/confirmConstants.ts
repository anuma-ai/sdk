/**
 * Confirm tool constants — deliberately dependency-free.
 *
 * Split out of `confirm.ts` so the tool NAME can be referenced from
 * node/React-Native-safe modules (e.g. the client-tool selector in
 * `../lib/tools/clientToolSelection`) without depending on what `confirm.ts`
 * and `uiInteraction.ts` import. Keep this file import-free.
 */

/** Tool name surfaced to the LLM. */
export const CONFIRM_TOOL_NAME = "prompt_user_confirm";

/** What a restaurant confirm card must list, and the call its approval authorises. */
type ConfirmRequirement = {
  /** The tool the approval authorises. */
  tool: string;
  /** Reported in the confirm result until that tool has run. */
  status: "confirmed_not_booked" | "confirmed_not_cancelled";
  /** Parameter names the card must carry, each with a non-blank value. */
  fields: readonly string[];
};

const BOOK_RESTAURANT: ConfirmRequirement = {
  tool: "AnumaPaymentsMCP-anuma_book_restaurant",
  status: "confirmed_not_booked",
  fields: ["venue_id", "config_id", "party_size", "day", "venue_name", "time"],
};

const CANCEL_RESERVATION: ConfirmRequirement = {
  tool: "AnumaPaymentsMCP-anuma_cancel_reservation",
  status: "confirmed_not_cancelled",
  fields: [
    "reservation_id",
    "venue_name",
    "day",
    "time",
    "party_size",
    "fee_applies",
    "fee_amount",
  ],
};

/**
 * Restaurant confirm-card actions (lowercase), keyed by every spelling the
 * portal accepts — the same keys as `CONFIRMED_ACTION_TOOL_SETS`.
 *
 * The field lists are a hand copy of ai-portal's gate:
 * `confirmedBookingFields` and `confirmedCancelFields` in
 * `internal/llmgateway/agentres.go` (:204 and :454). Change both together.
 */
export const CONFIRM_REQUIRED_FIELDS: ReadonlyMap<string, ConfirmRequirement> = new Map([
  ["book_restaurant", BOOK_RESTAURANT],
  ["anuma_book_restaurant", BOOK_RESTAURANT],
  ["anumapaymentsmcp-anuma_book_restaurant", BOOK_RESTAURANT],
  ["cancel_reservation", CANCEL_RESERVATION],
  ["anuma_cancel_reservation", CANCEL_RESERVATION],
  ["anumapaymentsmcp-anuma_cancel_reservation", CANCEL_RESERVATION],
]);

/** The requirement for a card's action, matched case-insensitively. */
export function confirmRequirement(action: unknown): ConfirmRequirement | undefined {
  if (typeof action !== "string") return undefined;
  return CONFIRM_REQUIRED_FIELDS.get(action.trim().toLowerCase());
}

/**
 * The required fields a card for `action` does not carry with a non-blank
 * value. Empty for an action with no requirement.
 */
export function missingConfirmFields(action: unknown, parameters: unknown): string[] {
  const requirement = confirmRequirement(action);
  if (!requirement) return [];
  const shown = new Set<string>();
  for (const parameter of Array.isArray(parameters) ? parameters : []) {
    const { name, value } = (parameter ?? {}) as { name?: unknown; value?: unknown };
    if (typeof name === "string" && typeof value === "string" && value.trim()) shown.add(name);
  }
  return requirement.fields.filter((field) => !shown.has(field));
}
