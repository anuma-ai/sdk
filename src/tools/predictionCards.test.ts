import { describe, expect, it, vi } from "vitest";

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import {
  createPredictionHoldersTool,
  createPredictionMarketTool,
  formatCents,
  formatChance,
  holderBars,
  isPolymarketUrl,
} from "./predictionCards";
import type { UIInteractionContext } from "./uiInteraction";

const MARKET_ARGS_ERROR =
  "display_prediction_market needs title, outcome and url as text and probability as a number from 0 to 1, copied from the market_detail or search result.";
const HOLDERS_ARGS_ERROR =
  "display_prediction_holders needs title and url as text and outcomes copied from the top_holders result: each with outcome, price (0 to 1), top_value_usd, and optional holders of name, amount and value_usd.";
const OUTCOME_COUNT_ERROR = "Pass 1 to 5 outcomes; for an event, the top 5 by odds.";
const HOLDER_COUNT_ERROR = "Pass at most 10 holders per outcome.";

function build(create: typeof createPredictionMarketTool) {
  const createDisplayInteraction = vi.fn();
  const tool = create({
    getContext: () => ({ createDisplayInteraction }) as unknown as UIInteractionContext,
  });
  return { tool, createDisplayInteraction };
}

function run(tool: ToolConfig, args: Record<string, unknown>) {
  return tool.executor!(args);
}

describe("holderBars", () => {
  it("splits the market and the top wallets over the shown outcomes", () => {
    const split = holderBars(
      [
        { outcome: "Yes", price: 0.085, top_value_usd: 331_500 },
        { outcome: "No", price: 0.915, top_value_usd: 1_775_100 },
      ],
      true
    );
    expect(split?.partial).toBe(false);
    expect(split?.overlapping).toBe(false);
    expect(split?.bars.map((bar) => bar.market)).toEqual([0.085, 0.915]);
    expect(split?.bars[0]?.wallets).toBeCloseTo(0.15736, 5);
    expect(split?.bars[1]?.wallets).toBeCloseTo(0.84264, 5);
  });

  it("rescales an event whose shown prices sum to 0.6, and flags it as partial", () => {
    const split = holderBars(
      [
        { outcome: "A", price: 0.3, top_value_usd: 400_000 },
        { outcome: "B", price: 0.12, top_value_usd: 300_000 },
        { outcome: "C", price: 0.09, top_value_usd: 150_000 },
        { outcome: "D", price: 0.06, top_value_usd: 100_000 },
        { outcome: "E", price: 0.03, top_value_usd: 50_000 },
      ],
      true
    );
    expect(split?.partial).toBe(true);
    const market = split!.bars.map((bar) => bar.market);
    [0.5, 0.2, 0.15, 0.1, 0.05].forEach((share, i) => expect(market[i]).toBeCloseTo(share, 10));
    expect(split!.bars.map((bar) => bar.wallets)).toEqual([0.4, 0.3, 0.15, 0.1, 0.05]);
  });

  it("is not partial at a price total of 0.98", () => {
    const split = holderBars(
      [
        { outcome: "Yes", price: 0.49, top_value_usd: 1 },
        { outcome: "No", price: 0.49, top_value_usd: 1 },
      ],
      true
    );
    expect(split?.partial).toBe(false);
  });

  it("keeps overlapping outcomes at their own prices, never partial", () => {
    const split = holderBars(
      [
        { outcome: "June 2027", price: 0.98, top_value_usd: 500_000 },
        { outcome: "March 2027", price: 0.9695, top_value_usd: 200_000 },
        { outcome: "Dec 2026", price: 0.962, top_value_usd: 150_000 },
        { outcome: "Sept 2026", price: 0.9585, top_value_usd: 100_000 },
        { outcome: "June 2026", price: 0.945, top_value_usd: 50_000 },
      ],
      false
    );
    expect(split?.bars.map((bar) => bar.market)).toEqual([0.98, 0.9695, 0.962, 0.9585, 0.945]);
    expect(split?.bars.map((bar) => bar.wallets)).toEqual([0.5, 0.2, 0.15, 0.1, 0.05]);
    expect(split?.partial).toBe(false);
    expect(split?.overlapping).toBe(true);
  });

  it("is never partial when the outcomes overlap, even below 0.98", () => {
    const split = holderBars(
      [
        { outcome: "A", price: 0.3, top_value_usd: 1 },
        { outcome: "B", price: 0.1, top_value_usd: 1 },
      ],
      false
    );
    expect(split?.partial).toBe(false);
  });

  it("has no bars when the top wallets hold nothing", () => {
    expect(
      holderBars(
        [
          { outcome: "Yes", price: 0.4, top_value_usd: 0 },
          { outcome: "No", price: 0.6, top_value_usd: 0 },
        ],
        true
      )
    ).toBeNull();
  });

  it("has no bars when every price is zero", () => {
    expect(holderBars([{ outcome: "Yes", price: 0, top_value_usd: 10 }], true)).toBeNull();
  });
});

describe("isPolymarketUrl", () => {
  it.each([
    ["https://polymarket.com/event/x", true],
    ["https://www.polymarket.com/event/x", true],
    ["http://polymarket.com/event/x", false],
    ["https://polymarket.com.evil.io/event/x", false],
    ["https://notpolymarket.com/event/x", false],
    ["javascript:alert(1)", false],
    ["not a url", false],
  ])("%s → %s", (url, expected) => {
    expect(isPolymarketUrl(url)).toBe(expected);
  });
});

describe("formatChance and formatCents", () => {
  it.each([
    [0.085, "9%"],
    [0.005, "<1%"],
    [0.995, ">99%"],
    [0.99, "99%"],
    [0.87, "87%"],
    [0, "0%"],
    [1, "100%"],
  ])("shows a prediction price of %s as a %s chance", (price, chance) => {
    expect(formatChance(price, "en-US")).toBe(chance);
  });

  it.each([
    [0.085, "8.5¢"],
    [0.09, "9¢"],
    [0.0005, "<0.1¢"],
    [0, "0¢"],
  ])("shows a contract price of %s as %s", (price, cents) => {
    expect(formatCents(price, "en-US")).toBe(cents);
  });

  it("formats chance and cents with the requested locale", () => {
    expect(formatChance(0.87, "de")).toBe("87 %");
    expect(formatCents(0.085, "de")).toBe("8,5¢");
    expect(formatCents(0.0005, "de")).toBe("<0,1¢");
  });

  it.each([
    [0.87, "%87"],
    [0.005, "<%1"],
    [0.995, ">%99"],
  ])("puts the percent sign where Turkish expects it for %s", (price, chance) => {
    expect(formatChance(price, "tr")).toBe(chance);
  });
});

describe("createPredictionMarketTool", () => {
  const valid = {
    title: "Will it rain?",
    outcome: "Yes",
    probability: 0.42,
    url: "https://polymarket.com/event/rain",
  };

  it("sends the model the schema it was written with", () => {
    const { tool } = build(createPredictionMarketTool);
    expect(tool.function).toEqual({
      name: "display_prediction_market",
      description:
        "Show one prediction market's current odds as a card: the chance of one outcome, its 24-hour move, volume, end date and a link to the market. Use it when the user asks for the odds or chance of a single market. Copy every value from the PredictionsMCP market_detail or search result.",
      arguments: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The market's question, as the tool returned it.",
          },
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
          volume_24h_usd: {
            type: "number",
            description: "Volume traded in the last 24 hours, USD.",
          },
          end_date: { type: "string", description: "When the market ends, as an ISO date." },
          url: { type: "string", description: "The market's Polymarket URL." },
        },
        required: ["title", "outcome", "probability", "url"],
      },
    });
  });

  it("renders the card as prediction_market with the card data", async () => {
    const { tool, createDisplayInteraction } = build(createPredictionMarketTool);
    await expect(run(tool, valid)).resolves.toEqual(valid);
    expect(createDisplayInteraction).toHaveBeenCalledTimes(1);
    expect(createDisplayInteraction.mock.calls[0]?.[1]).toBe("prediction_market");
    expect(createDisplayInteraction.mock.calls[0]?.[3]).toEqual(valid);
  });

  it("keeps the optional fields it can read", async () => {
    const { tool } = build(createPredictionMarketTool);
    const full = {
      ...valid,
      one_day_price_change: -1,
      volume_usd: 0,
      volume_24h_usd: 1200.5,
      end_date: "2026-12-31",
    };
    await expect(run(tool, full)).resolves.toEqual(full);
  });

  it("drops optional fields it cannot read", async () => {
    const { tool } = build(createPredictionMarketTool);
    await expect(
      run(tool, {
        ...valid,
        one_day_price_change: 1.5,
        volume_usd: -1,
        volume_24h_usd: Number.POSITIVE_INFINITY,
        end_date: "  ",
        extra: "ignored",
      })
    ).resolves.toEqual(valid);
    await expect(
      run(tool, { ...valid, one_day_price_change: "0.1", volume_usd: "5", end_date: 7 })
    ).resolves.toEqual(valid);
  });

  it.each([
    ["no title", { ...valid, title: undefined }],
    ["a blank outcome", { ...valid, outcome: "   " }],
    ["a url that is not text", { ...valid, url: 42 }],
    ["a probability above 1", { ...valid, probability: 1.5 }],
    ["a probability below 0", { ...valid, probability: -0.1 }],
    ["a probability that is NaN", { ...valid, probability: Number.NaN }],
    ["a probability given as text", { ...valid, probability: "0.42" }],
  ])("returns the argument error for %s", async (_label, args) => {
    const { tool, createDisplayInteraction } = build(createPredictionMarketTool);
    await expect(run(tool, args)).resolves.toEqual({ error: MARKET_ARGS_ERROR });
    expect(createDisplayInteraction.mock.calls[0]?.[1]).toBe("prediction_market");
  });
});

describe("createPredictionHoldersTool", () => {
  const holder = { name: "whale", amount: 1000, value_usd: 420 };
  const yes = { outcome: "Yes", price: 0.42, top_value_usd: 420, holders: [holder] };
  const no = { outcome: "No", price: 0.58, top_value_usd: 300 };
  const valid = {
    title: "Will it rain?",
    url: "https://polymarket.com/event/rain",
    outcomes: [yes, no],
  };
  const outcomesOf = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ outcome: `O${i}`, price: 0.1, top_value_usd: 1 }));
  const holdersOf = (count: number) => Array.from({ length: count }, () => holder);

  it("sends the model the schema it was written with", () => {
    const { tool } = build(createPredictionHoldersTool);
    expect(tool.function).toEqual({
      name: "display_prediction_holders",
      description:
        "Show who holds a prediction market as a card: for each outcome, the market's odds next to the top wallets' split of dollar value, then the top holders. Use it when the user asks who the biggest holders are or where the big money sits. Copy the outcomes from the PredictionsMCP top_holders result exactly, never computing a value. For an event, pass the top 5 outcomes by odds, Yes side only, each labelled with its name from market_detail outcomes[].name.",
      arguments: {
        type: "object",
        properties: {
          title: { type: "string", description: "The market's or event's question." },
          url: { type: "string", description: "The market's Polymarket URL." },
          outcomes: {
            type: "array",
            minItems: 1,
            maxItems: 5,
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
                  maxItems: 10,
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
    });
  });

  it("renders the card as prediction_holders with the card data", async () => {
    const { tool, createDisplayInteraction } = build(createPredictionHoldersTool);
    await expect(run(tool, valid)).resolves.toEqual(valid);
    expect(createDisplayInteraction).toHaveBeenCalledTimes(1);
    expect(createDisplayInteraction.mock.calls[0]?.[1]).toBe("prediction_holders");
    expect(createDisplayInteraction.mock.calls[0]?.[3]).toEqual(valid);
  });

  it("reads only the known fields of each outcome and holder", async () => {
    const { tool } = build(createPredictionHoldersTool);
    await expect(
      run(tool, {
        ...valid,
        outcomes: [{ ...yes, extra: 1, holders: [{ ...holder, wallet: "0x1" }] }, no],
      })
    ).resolves.toEqual(valid);
  });

  it.each([true, false])("copies mutually_exclusive when it is %s", async (flag) => {
    const { tool } = build(createPredictionHoldersTool);
    await expect(run(tool, { ...valid, mutually_exclusive: flag })).resolves.toEqual({
      ...valid,
      mutually_exclusive: flag,
    });
  });

  it("drops mutually_exclusive when it is not a boolean", async () => {
    const { tool } = build(createPredictionHoldersTool);
    await expect(run(tool, { ...valid, mutually_exclusive: "true" })).resolves.toEqual(valid);
  });

  it("accepts 5 outcomes and 10 holders", async () => {
    const { tool } = build(createPredictionHoldersTool);
    const outcomes = outcomesOf(5);
    outcomes[0] = { ...outcomes[0]!, holders: holdersOf(10) } as (typeof outcomes)[number];
    await expect(run(tool, { ...valid, outcomes })).resolves.toEqual({ ...valid, outcomes });
  });

  it.each([0, 6])("returns the outcome count error for %s outcomes", async (count) => {
    const { tool } = build(createPredictionHoldersTool);
    await expect(run(tool, { ...valid, outcomes: outcomesOf(count) })).resolves.toEqual({
      error: OUTCOME_COUNT_ERROR,
    });
  });

  it("returns the holder count error for 11 holders", async () => {
    const { tool } = build(createPredictionHoldersTool);
    await expect(
      run(tool, { ...valid, outcomes: [{ ...yes, holders: holdersOf(11) }] })
    ).resolves.toEqual({ error: HOLDER_COUNT_ERROR });
  });

  it.each([
    ["no title", { ...valid, title: "" }],
    ["a url that is not text", { ...valid, url: null }],
    ["outcomes that are not a list", { ...valid, outcomes: "Yes" }],
    ["an outcome that is null", { ...valid, outcomes: [null] }],
    ["an outcome with no label", { ...valid, outcomes: [{ ...no, outcome: " " }] }],
    ["an outcome price above 1", { ...valid, outcomes: [{ ...no, price: 1.01 }] }],
    ["a negative top value", { ...valid, outcomes: [{ ...no, top_value_usd: -1 }] }],
    ["holders that are not a list", { ...valid, outcomes: [{ ...yes, holders: holder }] }],
    [
      "a holder with no name",
      { ...valid, outcomes: [{ ...yes, holders: [{ ...holder, name: "" }] }] },
    ],
    [
      "a holder with a negative amount",
      { ...valid, outcomes: [{ ...yes, holders: [{ ...holder, amount: -1 }] }] },
    ],
    [
      "a holder value given as text",
      { ...valid, outcomes: [{ ...yes, holders: [{ ...holder, value_usd: "420" }] }] },
    ],
  ])("returns the argument error for %s", async (_label, args) => {
    const { tool, createDisplayInteraction } = build(createPredictionHoldersTool);
    await expect(run(tool, args)).resolves.toEqual({ error: HOLDERS_ARGS_ERROR });
    expect(createDisplayInteraction.mock.calls[0]?.[1]).toBe("prediction_holders");
  });
});
