import { describe, expect, it } from "vitest";

import type { DisplayChartResult } from "./chart";
import { createChartTool } from "./chart";

const tool = createChartTool({ getContext: () => null });

function run(args: Record<string, unknown>) {
  return tool.executor!(args) as Promise<DisplayChartResult>;
}

describe("display_chart tool", () => {
  it("coerces formatted numeric strings to numbers", async () => {
    const result = await run({
      chartType: "line",
      data: [
        { day: "Mon", price: "$65,000", volume: "1,234.5", change: "12%" },
        { day: "Tue", price: 66000, volume: "-$2.5", change: " -3.4 % " },
      ],
      dataKeys: ["price", "volume", "change"],
      xAxisKey: "day",
    });

    expect(result).toEqual({
      chartType: "line",
      title: undefined,
      data: [
        { day: "Mon", price: 65000, volume: 1234.5, change: 12 },
        { day: "Tue", price: 66000, volume: -2.5, change: -3.4 },
      ],
      dataKeys: ["price", "volume", "change"],
      xAxisKey: "day",
      colors: undefined,
    });
  });

  it("rejects numbers that overflow to Infinity", async () => {
    const result = await run({
      chartType: "bar",
      data: [{ day: "Mon", value: "1e309" }],
      dataKeys: ["value"],
      xAxisKey: "day",
    });

    expect(result).toHaveProperty("error");
  });

  it("rejects a decimal comma instead of reading it as thousands", async () => {
    const result = await run({
      chartType: "bar",
      data: [
        { day: "Mon", value: "1,5" },
        { day: "Tue", value: "12,345,678.9" },
      ],
      dataKeys: ["value"],
      xAxisKey: "day",
    });

    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain('"1,5"');
  });

  it("passes through a known value format and currency code", async () => {
    const result = await run({
      chartType: "line",
      data: [{ day: "Mon", close: 140 }],
      dataKeys: ["close"],
      xAxisKey: "day",
      valueFormat: "currency",
      currency: " eur ",
    });

    expect(result).toMatchObject({ valueFormat: "currency", currency: "EUR" });
  });

  it("drops an unknown value format or malformed currency", async () => {
    const result = await run({
      chartType: "line",
      data: [{ day: "Mon", close: 140 }],
      dataKeys: ["close"],
      xAxisKey: "day",
      valueFormat: "dollars",
      currency: "US Dollar",
    });

    expect(result).toMatchObject({ valueFormat: undefined, currency: undefined });
  });

  it("rejects a series with a non-numeric value", async () => {
    const result = await run({
      chartType: "bar",
      data: [
        { q: "Q1", revenue: 10 },
        { q: "Q2", revenue: "about ten" },
      ],
      dataKeys: ["revenue"],
      xAxisKey: "q",
    });

    expect(result).toEqual({ error: expect.stringContaining('Series "revenue"') });
    expect((result as { error: string }).error).toContain("data[1]");
  });

  it("rejects a dataKey that has no values in data", async () => {
    const result = await run({
      chartType: "bar",
      data: [{ q: "Q1", revenue: 10 }],
      dataKeys: ["profit"],
      xAxisKey: "q",
    });

    expect(result).toEqual({
      error: expect.stringContaining('Series "profit" has no numeric values'),
    });
  });

  it("tells the model not to chart price history without a sourced dataset", () => {
    expect((tool.function as { description: string }).description).toContain(
      "Do not chart price or market history (crypto, stocks, market caps) unless those values came from a tool result or a cited source"
    );
  });
});
