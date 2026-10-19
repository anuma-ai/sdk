import type { ToolConfig } from "../lib/chat/useChat/types.js";
import type { CreateUIToolsOptions } from "./uiInteraction";
import { createInteractiveTool } from "./uiInteraction";
import {
  SELECT_PAYMENT_WALLET_TOOL_NAME,
  WALLET_PAYMENT_TOOL_NAME,
} from "./walletPaymentConstants";

/** A wallet the user can pay from, as the wallet picker card shows it. */
export type PaymentWallet = {
  address: string;
  chainType: "solana";
  label?: string;
  walletName?: string;
  usdcBalance?: string;
  builtIn?: boolean;
};

/** What the wallet picker returns to the model. */
export type SelectPaymentWalletResult =
  | { confirmed: true; offer_id: string; funding_wallet: string }
  | { confirmed: false }
  | { cancelled: true };

/** One passenger as the payment card collects it. */
export type WalletPaymentPassenger = Record<string, unknown>;

/** What the caller's `pay` function receives once the user has filled in the payment card. */
export type WalletPaymentRequest = {
  provider: string;
  reference: string;
  passengers: WalletPaymentPassenger[];
};

/** What the caller's `pay` function resolves with. */
export type WalletPaymentOutcome =
  | { paid: true; provider: string; reference: string; status: string }
  | { paid: false; error_code: string; retryable: boolean };

/** What the payment tool returns to the model. */
export type WalletPaymentResult = WalletPaymentOutcome | { cancelled: true };

/** Options for {@link createSelectPaymentWalletTool}. */
export type CreateSelectPaymentWalletToolOptions = CreateUIToolsOptions & {
  listWallets: () => Promise<PaymentWallet[]>;
};

/** Options for {@link createWalletPaymentTool}. */
export type CreateWalletPaymentToolOptions = CreateUIToolsOptions & {
  pay: (request: WalletPaymentRequest) => Promise<WalletPaymentOutcome>;
};

const CANCELLED = { cancelled: true } as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function hasPassengers(value: unknown): value is { passengers: WalletPaymentPassenger[] } {
  return Array.isArray((value as { passengers?: unknown } | null | undefined)?.passengers);
}

/**
 * Create the select_payment_wallet tool, which shows the user's wallets for a flight offer and returns the one they chose.
 *
 * @example
 * ```typescript
 * import { createSelectPaymentWalletTool } from "@anuma/sdk/tools";
 *
 * const selectWalletTool = createSelectPaymentWalletTool({
 *   getContext: () => uiInteraction,
 *   getLastMessageId: () => lastMsgId,
 *   listWallets: async () => wallets,
 * });
 * ```
 */
export function createSelectPaymentWalletTool(
  options: CreateSelectPaymentWalletToolOptions
): ToolConfig {
  const tool = createInteractiveTool(options, {
    name: SELECT_PAYMENT_WALLET_TOOL_NAME,
    description:
      "Show the user a card with the flight offer and their wallets, and let them pick the wallet to pay from. Call it after anuma_flight_offer_details, with the exact offer id, price and currency from that result. Returns the chosen wallet, or that the user declined.",
    parameters: {
      type: "object",
      properties: {
        offer_id: {
          type: "string",
          description: "The offer id from anuma_flight_offer_details",
        },
        summary: {
          type: "string",
          description: "Route, dates and fare of the offer, as shown to the user",
        },
        amount: {
          type: "string",
          description: "Total price of the offer, e.g. '412.50'",
        },
        currency: {
          type: "string",
          description: "Currency of the price, e.g. 'USD'",
        },
      },
      required: ["offer_id", "amount", "currency"],
    },
    interactionType: "select_payment_wallet",
    validate: (args) => isNonEmptyString(args.offer_id),
    mapArgs: ({ offer_id, summary, amount, currency, wallets }) => ({
      offer_id,
      summary,
      amount,
      currency,
      wallets,
    }),
    mapResult: (result, args): SelectPaymentWalletResult => {
      if (result?.confirmed === true && isNonEmptyString(result.funding_wallet)) {
        return {
          confirmed: true,
          offer_id: args.offer_id as string,
          funding_wallet: result.funding_wallet,
        };
      }
      if (result?.confirmed === false) return { confirmed: false };
      return CANCELLED;
    },
  });
  const showCard = tool.executor;
  return {
    ...tool,
    executor: async (args: Record<string, unknown>, signal?: AbortSignal) => {
      if (!isNonEmptyString(args.offer_id)) return CANCELLED;
      let wallets: PaymentWallet[];
      try {
        wallets = await options.listWallets();
      } catch {
        return CANCELLED;
      }
      return showCard?.({ ...args, wallets }, signal);
    },
  };
}

/**
 * Create the prompt_wallet_payment tool, which collects the passengers on a card and then pays the booking through the caller's `pay` function.
 *
 * @example
 * ```typescript
 * import { createWalletPaymentTool } from "@anuma/sdk/tools";
 *
 * const paymentTool = createWalletPaymentTool({
 *   getContext: () => uiInteraction,
 *   getLastMessageId: () => lastMsgId,
 *   pay: (request) => payFromWallet(request),
 * });
 * ```
 */
export function createWalletPaymentTool(options: CreateWalletPaymentToolOptions): ToolConfig {
  const tool = createInteractiveTool(options, {
    name: WALLET_PAYMENT_TOOL_NAME,
    description:
      "Show the user a card to enter the passengers, then pay the flight booking from the wallet they chose. Call it after anuma_create_flight_intent, with the provider and reference from that result. Returns whether the payment went through.",
    parameters: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description: "The payment provider from anuma_create_flight_intent",
        },
        reference: {
          type: "string",
          description: "The payment reference from anuma_create_flight_intent",
        },
        passenger_count: {
          type: "integer",
          minimum: 1,
          description: "How many passengers the booking is for",
        },
      },
      required: ["provider", "reference", "passenger_count"],
    },
    interactionType: "prompt_wallet_payment",
    validate: (args) =>
      isNonEmptyString(args.provider) &&
      isNonEmptyString(args.reference) &&
      Number.isInteger(args.passenger_count) &&
      (args.passenger_count as number) >= 1,
    mapArgs: ({ provider, reference, passenger_count }) => ({
      provider,
      reference,
      passenger_count,
    }),
    mapResult: (result) => (hasPassengers(result) ? { passengers: result.passengers } : CANCELLED),
  });
  const showCard = tool.executor;
  return {
    ...tool,
    executor: async (
      args: Record<string, unknown>,
      signal?: AbortSignal
    ): Promise<WalletPaymentResult> => {
      const answer = await showCard?.(args, signal);
      if (!hasPassengers(answer) || signal?.aborted) return CANCELLED;
      const provider = args.provider as string;
      const reference = args.reference as string;
      let outcome: WalletPaymentOutcome;
      try {
        outcome = await options.pay({ provider, reference, passengers: answer.passengers });
      } catch {
        return { paid: false, error_code: "payment_failed", retryable: false };
      }
      if (outcome.paid) {
        return {
          paid: true,
          provider: outcome.provider,
          reference: outcome.reference,
          status: outcome.status,
        };
      }
      return { paid: false, error_code: outcome.error_code, retryable: outcome.retryable };
    },
  };
}
