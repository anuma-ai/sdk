import { describe, expect, it } from "vitest";

import { buildChartModel, chartCellText, type ChartSpec } from "./chartModel";

const MINUS = String.fromCharCode(0x2212);
const EN_DASH = String.fromCharCode(0x2013);

const SOL: ChartSpec = {
  chartType: "line",
  title: "SOL daily closes (USD)",
  data: [
    { day: "Mon", close: 139.2 },
    { day: "Tue", close: 141.5 },
    { day: "Wed", close: 140.8 },
    { day: "Thu", close: 144.1 },
    { day: "Fri", close: 143.6 },
  ],
  dataKeys: ["close"],
  xAxisKey: "day",
  valueFormat: "currency",
  currency: "USD",
};

describe("buildChartModel", () => {
  it("fits trend-chart ticks to the data on round steps", () => {
    const model = buildChartModel(SOL);

    expect(model.yTicks).toEqual([138, 140, 142, 144, 146]);
    expect(model.yDomain).toEqual([138, 146]);
    expect(model.yTicks!.map(model.formatters.tick)).toEqual([
      "$138",
      "$140",
      "$142",
      "$144",
      "$146",
    ]);
  });

  it("leaves bar charts on the renderer's zero-based axis", () => {
    const model = buildChartModel({ ...SOL, chartType: "bar" });

    expect(model.yTicks).toBeUndefined();
    expect(model.yDomain).toBeUndefined();
    expect(model.trend).toBeUndefined();
  });

  it("summarizes a single trend series with value, signed change and compared range", () => {
    expect(buildChartModel(SOL).trend).toEqual({
      value: "$143.60",
      change: "+$4.40 (+3.16%)",
      direction: "up",
      range: `Mon ${EN_DASH} Fri`,
    });

    const falling = buildChartModel({
      ...SOL,
      data: [
        { day: "Mon" },
        { day: "Tue", close: 150 },
        { day: "Wed", close: 135 },
        { day: "Thu" },
      ],
    });
    expect(falling.trend).toEqual({
      value: "$135.00",
      change: `${MINUS}$15.00 (${MINUS}10%)`,
      direction: "down",
      range: `Tue ${EN_DASH} Wed`,
    });
  });

  it("falls back to the series label as the title when a trend headline shows", () => {
    expect(buildChartModel({ ...SOL, title: undefined }).title).toBe("Close");
    expect(buildChartModel({ ...SOL, chartType: "bar", title: undefined }).title).toBeUndefined();
  });

  it("formats percent series with small values and point changes intact", () => {
    const model = buildChartModel({
      chartType: "line",
      data: [
        { t: "a", rate: 0.001 },
        { t: "b", rate: 0.003 },
      ],
      dataKeys: ["rate"],
      xAxisKey: "t",
      valueFormat: "percent",
    });

    expect(model.trend?.value).toBe("0.003%");
    expect(model.trend?.change).toBe("+0.002 pts");
  });

  it("keeps tick labels distinct on tight ranges and terminates on unsteppable values", () => {
    const tight = buildChartModel({
      chartType: "line",
      data: [
        { t: "a", v: 1000000900 },
        { t: "b", v: 1000001100 },
      ],
      dataKeys: ["v"],
      xAxisKey: "t",
    });
    const labels = tight.yTicks!.map(tight.formatters.tick);
    expect(new Set(labels).size).toBe(labels.length);

    const huge = buildChartModel({
      chartType: "line",
      data: [
        { t: "a", v: 10000000000000000 },
        { t: "b", v: 10000000000000002 },
      ],
      dataKeys: ["v"],
      xAxisKey: "t",
    });
    expect((huge.yTicks ?? []).length).toBeLessThanOrEqual(9);
  });

  it("dots and straight segments for short series, monotone curves for long ones", () => {
    expect(buildChartModel(SOL)).toMatchObject({ showDots: true, curve: "linear" });

    const long = buildChartModel({
      ...SOL,
      data: Array.from({ length: 30 }, (_, i) => ({ day: `D${i}`, close: 100 + i })),
    });
    expect(long).toMatchObject({ showDots: false, curve: "monotone" });
  });

  it("totals the first series for pie charts and keys its labels by name", () => {
    const model = buildChartModel({
      chartType: "pie",
      data: [
        { asset: "BTC", value: 42000, extra: 1 },
        { asset: "ETH", value: 18000, extra: 1 },
      ],
      dataKeys: ["value", "extra"],
      xAxisKey: "asset",
      valueFormat: "currency",
    });

    expect(model.plottedKeys).toEqual(["value"]);
    expect(model.labelKey).toBe("asset");
    expect(model.formatters.value(model.total)).toBe("$60,000.00");
  });

  it("flags negative values so renderers can square bar ends", () => {
    const model = buildChartModel({
      chartType: "bar",
      data: [
        { d: "Tue", change: 1.07 },
        { d: "Wed", change: -0.64 },
      ],
      dataKeys: ["change"],
      xAxisKey: "d",
    });

    expect(model.hasNegative).toBe(true);
  });
});

describe("chartCellText", () => {
  it("renders primitives and blanks anything else", () => {
    expect(chartCellText("Mon")).toBe("Mon");
    expect(chartCellText(0)).toBe("0");
    expect(chartCellText({ text: "Mon" })).toBe("");
    expect(chartCellText(undefined)).toBe("");
  });
});
