import type { ChartDataPoint, ChartValueFormat, DisplayChartResult } from "./chart";

export type ChartSpec = Exclude<DisplayChartResult, { error: string }>;

export type ChartFormatters = {
  tick: (value: number) => string;
  value: (value: number) => string;
  change: (difference: number) => string;
};

export type ChartTrendDirection = "up" | "down" | "flat";

export type ChartTrend = {
  value: string;
  change: string;
  direction: ChartTrendDirection;
  range?: string;
};

export type ChartModel = {
  isTrendChart: boolean;
  plottedKeys: string[];
  seriesLabels: Record<string, string>;
  labelKey?: string;
  values: number[];
  yTicks?: number[];
  yDomain?: [number, number];
  formatters: ChartFormatters;
  trend?: ChartTrend;
  title?: string;
  showDots: boolean;
  endIndexes: Record<string, number>;
  curve: "linear" | "monotone";
  hasNegative: boolean;
  longestTickLength: number;
  total: number;
};

const DOT_LIMIT = 12;
const MAX_TICKS = 8;
const MINUS = "\u2212";

/** Returns a chart cell value as display text, or an empty string for non-primitive values. */
export function chartCellText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : "";
}

function tickDigits(ticks: number[] | undefined): number {
  if (!ticks || ticks.length < 2) return 3;
  const step = ticks[1] - ticks[0];
  const magnitude = Math.max(...ticks.map(Math.abs));
  if (step <= 0 || magnitude === 0) return 3;
  const needed = Math.floor(Math.log10(magnitude)) - Math.floor(Math.log10(step)) + 1;
  return Math.min(21, Math.max(3, needed));
}

function keepSmall(
  options: Intl.NumberFormatOptions
): (n: number, format: (formatter: Intl.NumberFormat, n: number) => string) => string {
  const small = new Intl.NumberFormat(undefined, { ...options, maximumSignificantDigits: 3 });
  const regular = new Intl.NumberFormat(undefined, { ...options, maximumFractionDigits: 2 });
  return (n, format) => format(n !== 0 && Math.abs(n) < 1 ? small : regular, n);
}

function buildFormatters(
  format: ChartValueFormat | undefined,
  currency: string | undefined,
  ticks: number[] | undefined
): ChartFormatters {
  const digits = tickDigits(ticks);
  if (format === "currency") {
    const money = (options: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency ?? "USD",
        ...options,
      });
    const compact = money({ notation: "compact", maximumSignificantDigits: 3 });
    const tick = money({ notation: "compact", maximumSignificantDigits: digits });
    const small = money({ maximumSignificantDigits: 4 });
    const cents = money({ minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const value = (n: number) =>
      Math.abs(n) >= 1e6
        ? compact.format(n)
        : n !== 0 && Math.abs(n) < 1
          ? small.format(n)
          : cents.format(n);
    return { tick: (n) => tick.format(n), value, change: (d) => value(Math.abs(d)) };
  }
  if (format === "percent") {
    const percent = keepSmall({ style: "percent" });
    const points = keepSmall({});
    const tick = new Intl.NumberFormat(undefined, {
      style: "percent",
      maximumSignificantDigits: digits,
    });
    return {
      tick: (n) => tick.format(n / 100),
      value: (n) => percent(n, (formatter) => formatter.format(n / 100)),
      change: (d) => `${points(Math.abs(d), (formatter, n) => formatter.format(n))} pts`,
    };
  }
  const tick = new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumSignificantDigits: digits,
  });
  const compact = new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumSignificantDigits: 3,
  });
  const small = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 4 });
  const plain = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  const value = (n: number) =>
    Math.abs(n) >= 1e6
      ? compact.format(n)
      : n !== 0 && Math.abs(n) < 1
        ? small.format(n)
        : plain.format(n);
  return { tick: (n) => tick.format(n), value, change: (d) => value(Math.abs(d)) };
}

function seriesValues(points: ChartDataPoint[], keys: string[]): number[] {
  return points.flatMap((point) =>
    keys.map((key) => point[key]).filter((v): v is number => typeof v === "number")
  );
}

function niceStep(rough: number): number {
  const exponent = Math.floor(Math.log10(rough));
  const base = 10 ** exponent;
  const fraction = rough / base;
  const nice =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * base;
}

function niceTicks(values: number[]): number[] | undefined {
  if (values.length === 0) return undefined;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.abs(max) * 0.02 || 1;
  const low = min - span * 0.1;
  const high = max + span * 0.1;
  const step = niceStep((high - low) / 3);
  const start =
    min >= 0 ? Math.max(0, Math.floor(low / step) * step) : Math.floor(low / step) * step;
  const ticks: number[] = [];
  for (let index = 0; index <= MAX_TICKS; index++) {
    const tick = Number((start + index * step).toPrecision(15));
    if (ticks.length > 0 && tick <= ticks[ticks.length - 1]) break;
    ticks.push(tick);
    if (tick >= high) break;
  }
  return ticks.length >= 2 ? ticks : undefined;
}

function buildTrend(
  values: number[],
  format: ChartValueFormat | undefined,
  formatters: ChartFormatters
): ChartTrend | undefined {
  if (values.length < 2) return undefined;
  const first = values[0];
  const last = values[values.length - 1];
  const difference = last - first;
  const direction = difference > 0 ? "up" : difference < 0 ? "down" : "flat";
  const sign = direction === "up" ? "+" : direction === "down" ? MINUS : "";
  const percent =
    format !== "percent" && first !== 0
      ? ` (${sign}${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
          Math.abs((difference / Math.abs(first)) * 100)
        )}%)`
      : "";
  return {
    value: formatters.value(last),
    change: `${sign}${formatters.change(difference)}${percent}`,
    direction,
  };
}

function lastValueIndex(points: ChartDataPoint[], key: string): number {
  for (let index = points.length - 1; index >= 0; index--) {
    if (typeof points[index][key] === "number") return index;
  }
  return -1;
}

/** Returns the display label for a series key. */
export function chartSeriesLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** Computes a renderer-agnostic layout for a `display_chart` result: axis ticks, formatters, headline trend and mark policy. */
export function buildChartModel(spec: ChartSpec): ChartModel {
  const { chartType, title, data, dataKeys, xAxisKey, valueFormat, currency } = spec;
  const isTrendChart = chartType === "line" || chartType === "area";
  const plottedKeys = chartType === "pie" ? dataKeys.slice(0, 1) : dataKeys;
  const values = seriesValues(data, plottedKeys);
  const yTicks = isTrendChart ? niceTicks(values) : undefined;
  const yDomain: [number, number] | undefined = yTicks
    ? [yTicks[0], yTicks[yTicks.length - 1]]
    : undefined;
  const formatters = buildFormatters(valueFormat, currency, yTicks);
  const seriesLabels = Object.fromEntries(dataKeys.map((key) => [key, chartSeriesLabel(key)]));
  const trendBase =
    isTrendChart && dataKeys.length === 1 ? buildTrend(values, valueFormat, formatters) : undefined;
  const trendRows = trendBase
    ? data.filter((point: ChartDataPoint) => typeof point[dataKeys[0]] === "number")
    : [];
  const range =
    trendBase && xAxisKey
      ? [trendRows[0], trendRows[trendRows.length - 1]]
          .map((point) => chartCellText(point[xAxisKey]))
          .filter(Boolean)
          .join(" \u2013 ") || undefined
      : undefined;
  const trend = trendBase ? { ...trendBase, range } : undefined;
  const tickSamples = [...(yDomain ?? []), ...values].map((value) => formatters.tick(value));
  const showDots = data.length <= DOT_LIMIT;
  return {
    isTrendChart,
    plottedKeys,
    seriesLabels,
    labelKey: chartType === "pie" ? xAxisKey || "name" : xAxisKey,
    values,
    yTicks,
    yDomain,
    formatters,
    trend,
    title: title ?? (trend ? seriesLabels[dataKeys[0]] : undefined),
    showDots,
    endIndexes: Object.fromEntries(plottedKeys.map((key) => [key, lastValueIndex(data, key)])),
    curve: showDots ? "linear" : "monotone",
    hasNegative: values.some((value) => value < 0),
    longestTickLength: tickSamples.reduce((max, label) => Math.max(max, label.length), 0),
    total: values.reduce((sum, value) => sum + value, 0),
  };
}
