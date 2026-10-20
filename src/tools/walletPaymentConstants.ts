/** Name of the client tool that shows the wallet picker card for a flight payment. */
export const SELECT_PAYMENT_WALLET_TOOL_NAME = "select_payment_wallet";

/** Name of the client tool that collects passengers and pays a booking from the chosen wallet. */
export const WALLET_PAYMENT_TOOL_NAME = "prompt_wallet_payment";

/** Name of the built-in tool set holding the flight booking server tools. */
export const FLIGHT_BOOK_TOOL_SET = "flight-book";

/** Server tools a confirmed wallet choice narrows the turn to. */
export const FLIGHT_SERVER_TOOL_NAMES = [
  "AnumaPaymentsMCP-anuma_search_flights",
  "AnumaPaymentsMCP-anuma_flight_offer_details",
  "AnumaPaymentsMCP-anuma_create_flight_intent",
  "AnumaPaymentsMCP-anuma_get_flight_booking",
] as const;
