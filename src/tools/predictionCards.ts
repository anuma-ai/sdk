import type { ToolConfig } from "../lib/chat/useChat/types.js";
import type { CreateUIToolsOptions } from "./uiInteraction";
import { createDisplayTool } from "./uiInteraction";

const MAX_HOLDER_OUTCOMES = 5;
const MAX_HOLDERS_PER_OUTCOME = 10;

const WHOLE_EVENT_MIN_PRICE_TOTAL = 0.98;

export interface PredictionMarketCardData {
  title: string;
  outcome: string;
  probability: number;
  one_day_price_change?: number;
  volume_usd?: number;
  volume_24h_usd?: number;
  end_date?: string;
  url: string;
}

export interface PredictionHolder {
  name: string;
  amount: number;
  value_usd: number;
}

export interface PredictionOutcomeHolders {
  outcome: string;
  price: number;
  top_value_usd: number;
  holders?: PredictionHolder[];
}

export interface PredictionHoldersCardData {
  title: string;
  url: string;
  outcomes: PredictionOutcomeHolders[];
  mutually_exclusive?: boolean;
}

export interface HolderBar {
  outcome: string;
  market: number;
  wallets: number;
}

/** Null when either total is zero: there is nothing to split. */
export function holderBars(
  outcomes: readonly PredictionOutcomeHolders[],
  mutuallyExclusive: boolean | undefined
): { bars: HolderBar[]; partial: boolean; overlapping: boolean } | null {
  const priceTotal = outcomes.reduce((sum, o) => sum + o.price, 0);
  const valueTotal = outcomes.reduce((sum, o) => sum + o.top_value_usd, 0);
  if (priceTotal <= 0 || valueTotal <= 0) return null;
  const priceBase = mutuallyExclusive === true ? priceTotal : 1;
  return {
    bars: outcomes.map((o) => ({
      outcome: o.outcome,
      market: o.price / priceBase,
      wallets: o.top_value_usd / valueTotal,
    })),
    partial: mutuallyExclusive === true && priceTotal < WHOLE_EVENT_MIN_PRICE_TOTAL,
    overlapping: mutuallyExclusive === false,
  };
}

export function isPolymarketUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === "https:" &&
      (hostname === "polymarket.com" || hostname.endsWith(".polymarket.com"))
    );
  } catch {
    return false;
  }
}

export function formatChance(price: number, locale: string): string {
  if (price > 0 && price < 0.01) return `<${wholePercent(0.01, locale)}`;
  if (price > 0.99 && price < 1) return `>${wholePercent(0.99, locale)}`;
  return wholePercent(Math.round(price * 100) / 100, locale);
}

function wholePercent(fraction: number, locale: string): string {
  return fraction.toLocaleString(locale, { style: "percent", maximumFractionDigits: 0 });
}

export function formatCents(price: number, locale: string): string {
  if (price > 0 && price < 0.001) return `<${(0.1).toLocaleString(locale)}¢`;
  return `${(price * 100).toLocaleString(locale, { maximumFractionDigits: 1 })}¢`;
}

type Args = Record<string, unknown>;

const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const fraction = (value: unknown): value is number => finite(value) && value >= 0 && value <= 1;

const nonNegative = (value: unknown): value is number => finite(value) && value >= 0;

const MARKET_ARGS_ERROR =
  "display_prediction_market needs title, outcome and url as text and probability as a number from 0 to 1, copied from the market_detail or search result.";

function readMarket(args: Args): PredictionMarketCardData | null {
  const { title, outcome, probability, url } = args;
  if (!text(title) || !text(outcome) || !text(url) || !fraction(probability)) return null;
  const card: PredictionMarketCardData = { title, outcome, probability, url };
  if (finite(args.one_day_price_change) && Math.abs(args.one_day_price_change) <= 1) {
    card.one_day_price_change = args.one_day_price_change;
  }
  if (nonNegative(args.volume_usd)) card.volume_usd = args.volume_usd;
  if (nonNegative(args.volume_24h_usd)) card.volume_24h_usd = args.volume_24h_usd;
  if (text(args.end_date)) card.end_date = args.end_date;
  return card;
}

/** Create the display_prediction_market tool, which renders one market's odds as a card. */
export function createPredictionMarketTool(options: CreateUIToolsOptions): ToolConfig {
  return createDisplayTool(options, {
    name: "display_prediction_market",
    description:
      "Show one prediction market's current odds as a card: the chance of one outcome, its 24-hour move, volume, end date and a link to the market. Use it when the user asks for the odds or chance of a single market. Copy every value from the PredictionsMCP market_detail or search result.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "The market's question, as the tool returned it." },
        outcome: {
          type: "string",
          description: 'The outcome the odds are for, e.g. "Yes" or a candidate name.',
        },
        probability: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "That outcome's current price from 0 to 1, which is its chance.",
        },
        one_day_price_change: {
          type: "number",
          description:
            "The price's change over the last 24 hours, as a fraction (-0.04 = 4 points down).",
        },
        volume_usd: { type: "number", description: "All-time traded volume in USD." },
        volume_24h_usd: { type: "number", description: "Volume traded in the last 24 hours, USD." },
        end_date: { type: "string", description: "When the market ends, as an ISO date." },
        url: { type: "string", description: "The market's Polymarket URL." },
      },
      required: ["title", "outcome", "probability", "url"],
    },
    displayType: "prediction_market",
    execute: (args: Args) => readMarket(args) ?? { error: MARKET_ARGS_ERROR },
  });
}

const HOLDERS_ARGS_ERROR =
  "display_prediction_holders needs title and url as text and outcomes copied from the top_holders result: each with outcome, price (0 to 1), top_value_usd, and optional holders of name, amount and value_usd.";

function readHolder(raw: unknown): PredictionHolder | null {
  const { name, amount, value_usd } = (raw ?? {}) as Args;
  if (!text(name) || !nonNegative(amount) || !nonNegative(value_usd)) return null;
  return { name, amount, value_usd };
}

function readOutcome(raw: unknown): PredictionOutcomeHolders | string {
  const { outcome, price, top_value_usd, holders } = (raw ?? {}) as Args;
  if (!text(outcome) || !fraction(price) || !nonNegative(top_value_usd)) return HOLDERS_ARGS_ERROR;
  if (holders === undefined) return { outcome, price, top_value_usd };
  if (!Array.isArray(holders)) return HOLDERS_ARGS_ERROR;
  if (holders.length > MAX_HOLDERS_PER_OUTCOME) {
    return `Pass at most ${MAX_HOLDERS_PER_OUTCOME} holders per outcome.`;
  }
  const read = holders.map(readHolder);
  if (read.some((holder) => holder === null)) return HOLDERS_ARGS_ERROR;
  return { outcome, price, top_value_usd, holders: read as PredictionHolder[] };
}

function readHolders(args: Args): PredictionHoldersCardData | { error: string } {
  const { title, url, outcomes, mutually_exclusive } = args;
  if (!text(title) || !text(url) || !Array.isArray(outcomes)) return { error: HOLDERS_ARGS_ERROR };
  if (outcomes.length < 1 || outcomes.length > MAX_HOLDER_OUTCOMES) {
    return {
      error: `Pass 1 to ${MAX_HOLDER_OUTCOMES} outcomes; for an event, the top ${MAX_HOLDER_OUTCOMES} by odds.`,
    };
  }
  const read = outcomes.map(readOutcome);
  const problem = read.find((outcome) => typeof outcome === "string");
  if (problem) return { error: problem };
  const card: PredictionHoldersCardData = {
    title,
    url,
    outcomes: read as PredictionOutcomeHolders[],
  };
  if (typeof mutually_exclusive === "boolean") card.mutually_exclusive = mutually_exclusive;
  return card;
}

/** Create the display_prediction_holders tool, which renders a market's top holders as a card. */
export function createPredictionHoldersTool(options: CreateUIToolsOptions): ToolConfig {
  return createDisplayTool(options, {
    name: "display_prediction_holders",
    description:
      "Show who holds a prediction market as a card: for each outcome, the market's odds next to the top wallets' split of dollar value, then the top holders. Use it when the user asks who the biggest holders are or where the big money sits. Copy the outcomes from the PredictionsMCP top_holders result exactly, never computing a value. For an event, pass the top 5 outcomes by odds, Yes side only, each labelled with its name from market_detail outcomes[].name.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "The market's or event's question." },
        url: { type: "string", description: "The market's Polymarket URL." },
        outcomes: {
          type: "array",
          minItems: 1,
          maxItems: MAX_HOLDER_OUTCOMES,
          description: "The outcomes to compare, in the order the tool returned them.",
          items: {
            type: "object",
            properties: {
              outcome: { type: "string", description: "The outcome label." },
              price: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "The outcome's current price from 0 to 1, which is its chance.",
              },
              top_value_usd: {
                type: "number",
                description: "The dollar value held by this outcome's listed holders.",
              },
              holders: {
                type: "array",
                maxItems: MAX_HOLDERS_PER_OUTCOME,
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "The holder's name as returned." },
                    amount: { type: "number", description: "Shares held." },
                    value_usd: {
                      type: "number",
                      description: "The holding's value in USD at today's price.",
                    },
                  },
                  required: ["name", "amount", "value_usd"],
                },
              },
            },
            required: ["outcome", "price", "top_value_usd"],
          },
        },
        mutually_exclusive: {
          type: "boolean",
          description:
            "True when the outcomes rule each other out: one market's own outcomes (Yes/No, or two teams), or an event whose market_detail answer has mutually_exclusive: true. False when market_detail says false (overlapping dates or price thresholds).",
        },
      },
      required: ["title", "url", "outcomes"],
    },
    displayType: "prediction_holders",
    execute: readHolders,
  });
}
