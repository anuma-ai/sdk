"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import type { ChartDataPoint, ChartValueFormat, DisplayChartResult } from "../tools/chart";

function cx(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

const THEMES = { light: "", dark: ".dark" } as const;

const SAFE_CSS_KEY = /^[\w-]+$/;
const SAFE_CSS_COLOR =
  /^(?:#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|[a-z]+|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([\w\s.,%/+-]*\)|var\(--[\w-]+\))$/i;

function isSafeCssColor(value: unknown): value is string {
  if (typeof value !== "string" || !SAFE_CSS_COLOR.test(value)) return false;
  return (
    typeof CSS === "undefined" || typeof CSS.supports !== "function" || CSS.supports("color", value)
  );
}

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = { config: ChartConfig };

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

export function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(
    ([key, cfg]) => SAFE_CSS_KEY.test(key) && (cfg.theme || cfg.color)
  );

  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
    return isSafeCssColor(color) ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  );
}

export function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cx(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
  valueFormatter,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
    valueFormatter?: (value: number) => string;
  }) {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) return null;

    const [item] = payload;
    const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === "string" ? config[label]?.label || label : itemConfig?.label;

    if (labelFormatter) {
      return (
        <div className={cx("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div>
      );
    }

    if (!value) return null;

    return <div className={cx("font-medium", labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

  if (!active || !payload?.length) return null;

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      className={cx(
        "border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const payloadObj = item.payload as Record<string, string> | undefined;
            const indicatorColor = color || payloadObj?.fill || item.color;

            return (
              <div
                key={item.dataKey}
                className={cx(
                  "[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
                  indicator === "dot" && "items-center"
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload as typeof payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cx(
                            "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                            indicator === "dot" && "h-2.5 w-2.5",
                            indicator === "line" && "w-1",
                            indicator === "dashed" &&
                              "w-0 border-[1.5px] border-dashed bg-transparent",
                            nestLabel && indicator === "dashed" && "my-0.5"
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cx(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-end" : "items-center"
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>
                      {item.value !== undefined && item.value !== null && (
                        <span className="text-foreground font-medium tabular-nums">
                          {valueFormatter && typeof item.value === "number"
                            ? valueFormatter(item.value)
                            : item.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

export const ChartLegend = RechartsPrimitive.Legend;

export function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> &
  Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
    hideIcon?: boolean;
    nameKey?: string;
  }) {
  const { config } = useChart();

  if (!payload?.length) return null;

  return (
    <div
      className={cx(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item) => {
          const key = `${nameKey || String(item.dataKey ?? "value")}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);

          return (
            <div
              key={String(item.value)}
              className="[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3"
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: item.color }}
                />
              )}
              {itemConfig?.label ?? cellText(item.value)}
            </div>
          );
        })}
    </div>
  );
}

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) return undefined;

  const payloadPayload =
    "payload" in payload && typeof payload.payload === "object" && payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key];
}

export type ChartCardProps = {
  data: DisplayChartResult;
};

const DEFAULT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const SURFACE = "var(--chart-surface)";
const DOT_LIMIT = 12;
const MAX_TICKS = 8;
const MINUS = "\u2212";

function paletteColor(index: number): string {
  return index < DEFAULT_COLORS.length
    ? DEFAULT_COLORS[index]
    : `hsl(${Math.round((index * 137.508) % 360)} 65% 55%)`;
}

function cellText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : "";
}

const VISUALLY_HIDDEN: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

type Formatters = {
  tick: (value: number) => string;
  value: (value: number) => string;
  change: (difference: number) => string;
};

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
): Formatters {
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

function buildChartConfig(dataKeys: string[], colors?: Record<string, string>): ChartConfig {
  const config: ChartConfig = {};
  dataKeys.forEach((key, i) => {
    const custom = colors?.[key];
    config[key] = {
      label: key.charAt(0).toUpperCase() + key.slice(1),
      color: isSafeCssColor(custom) ? custom : paletteColor(i),
    };
  });
  return config;
}

function lastValueIndex(points: ChartDataPoint[], key: string): number {
  for (let index = points.length - 1; index >= 0; index--) {
    if (typeof points[index][key] === "number") return index;
  }
  return -1;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

type Trend = { value: string; change: string; direction: "up" | "down" | "flat" };

function buildTrend(
  values: number[],
  format: ChartValueFormat | undefined,
  formatters: Formatters
): Trend | undefined {
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

const TREND_CLASS: Record<Trend["direction"], string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-600 dark:text-red-400",
  flat: "text-muted-foreground",
};

const TREND_ARROW: Record<Trend["direction"], string> = { up: "\u25B2", down: "\u25BC", flat: "" };

function ChartHeader({
  title,
  trend,
  range,
}: {
  title?: React.ReactNode;
  trend?: Trend;
  range?: string;
}) {
  if (!trend) {
    return title ? <p className="mb-3 text-sm font-medium">{title}</p> : null;
  }
  return (
    <div className="mb-3" data-testid="chart-header">
      {title && <p className="text-sm text-muted-foreground">{title}</p>}
      <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">{trend.value}</p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs">
        <span className={cx("font-medium", TREND_CLASS[trend.direction])}>
          {TREND_ARROW[trend.direction] && (
            <span aria-hidden="true" className="mr-1 text-[0.6rem]">
              {TREND_ARROW[trend.direction]}
            </span>
          )}
          {trend.change}
        </span>
        {range && <span className="text-muted-foreground">{range}</span>}
      </p>
    </div>
  );
}

export function ChartCard({ data }: ChartCardProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [ready, setReady] = React.useState(false);
  const gradientId = `chart-fill-${React.useId().replace(/:/g, "")}`;
  const reducedMotion = usePrefersReducedMotion();
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if ("error" in data) {
    return (
      <div className="my-4 max-w-lg">
        <div className="rounded-xl bg-sidebar dark:bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">Couldn&apos;t display this chart.</p>
        </div>
      </div>
    );
  }

  const {
    chartType,
    title,
    data: chartData,
    dataKeys,
    xAxisKey,
    colors,
    valueFormat,
    currency,
  } = data;
  const chartConfig = buildChartConfig(dataKeys, colors);
  const seriesColor = (key: string) => chartConfig[key]?.color;
  const isTrendChart = chartType === "line" || chartType === "area";
  const plottedKeys = chartType === "pie" ? dataKeys.slice(0, 1) : dataKeys;
  const values = seriesValues(chartData, plottedKeys);
  const yTicks = isTrendChart ? niceTicks(values) : undefined;
  const yDomain: [number, number] | undefined = yTicks
    ? [yTicks[0], yTicks[yTicks.length - 1]]
    : undefined;
  const formatters = buildFormatters(valueFormat, currency, yTicks);
  const trend =
    isTrendChart && dataKeys.length === 1 ? buildTrend(values, valueFormat, formatters) : undefined;
  const trendRows = trend
    ? chartData.filter((point) => typeof point[dataKeys[0]] === "number")
    : [];
  const range =
    trend && xAxisKey
      ? [trendRows[0], trendRows[trendRows.length - 1]]
          .map((point) => cellText(point[xAxisKey]))
          .filter(Boolean)
          .join(" \u2013 ")
      : undefined;
  const headerTitle = title ?? (trend ? chartConfig[dataKeys[0]]?.label : undefined);
  const tickSamples = [...(yDomain ?? []), ...values].map((value) => formatters.tick(value));
  const longestTick = tickSamples.reduce((max, label) => Math.max(max, label.length), 0);
  const animate = !reducedMotion;
  const showDots = chartData.length <= DOT_LIMIT;
  const curve = showDots ? "linear" : "monotone";
  const hasNegative = values.some((value) => value < 0);
  const margin = { top: 8, right: 8, bottom: 0, left: 0 };

  const xAxis = xAxisKey && (
    <XAxis
      dataKey={xAxisKey}
      tickLine={false}
      axisLine={false}
      tickMargin={8}
      minTickGap={16}
      interval="preserveStartEnd"
      padding={isTrendChart ? { left: 12, right: 12 } : undefined}
    />
  );
  const yAxis = (
    <YAxis
      tickLine={false}
      axisLine={false}
      tickCount={yTicks ? undefined : 4}
      ticks={yTicks}
      tickMargin={4}
      tickFormatter={formatters.tick}
      domain={yDomain}
      allowDataOverflow={false}
      width={Math.min(120, Math.max(36, longestTick * 7 + 12))}
    />
  );
  const tooltip = (
    <ChartTooltip
      cursor={
        chartType === "bar"
          ? { fill: "var(--muted)", opacity: 0.5 }
          : { stroke: "var(--border)", strokeWidth: 1 }
      }
      content={
        <ChartTooltipContent
          indicator={chartType === "bar" ? "dot" : "line"}
          valueFormatter={formatters.value}
        />
      }
    />
  );
  const legend = dataKeys.length > 1 && <ChartLegend content={<ChartLegendContent />} />;
  const marker = (key: string, r: number) => ({
    r,
    fill: seriesColor(key),
    stroke: SURFACE,
    strokeWidth: 2,
  });
  const lineDot = (key: string) =>
    showDots
      ? marker(key, 4)
      : (props: { cx?: number | null; cy?: number | null; index?: number }) =>
          props.index === lastValueIndex(chartData, key) &&
          typeof props.cx === "number" &&
          typeof props.cy === "number" ? (
            <circle key={`end-${key}`} cx={props.cx} cy={props.cy} {...marker(key, 4)} />
          ) : (
            <g key={`dot-${key}-${props.index}`} />
          );
  const labelKey = chartType === "pie" ? xAxisKey || "name" : xAxisKey;
  const tableColumns = labelKey ? [labelKey, ...plottedKeys] : plottedKeys;

  return (
    <div
      className="my-4 max-w-lg"
      ref={containerRef}
      role="figure"
      aria-label={[title, `${chartType} chart`].filter(Boolean).join(", ")}
    >
      <div className="rounded-xl bg-sidebar dark:bg-card px-5 py-4 [--chart-surface:var(--sidebar)] dark:[--chart-surface:var(--card)]">
        <ChartHeader title={headerTitle} trend={trend} range={range} />
        <table style={VISUALLY_HIDDEN}>
          <thead>
            <tr>
              {tableColumns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartData.map((point, row) => (
              <tr key={row}>
                {tableColumns.map((column) => (
                  <td key={column}>{cellText(point[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {ready ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[220px] w-full"
            aria-hidden="true"
          >
            {chartType === "bar" ? (
              <BarChart data={chartData} margin={margin} barGap={2} barCategoryGap="24%">
                <CartesianGrid vertical={false} />
                {xAxis}
                {yAxis}
                {tooltip}
                {legend}
                {dataKeys.map((key) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={seriesColor(key)}
                    maxBarSize={24}
                    radius={hasNegative ? 2 : [4, 4, 0, 0]}
                    isAnimationActive={animate}
                  />
                ))}
              </BarChart>
            ) : chartType === "line" ? (
              <LineChart data={chartData} margin={margin}>
                <CartesianGrid vertical={false} />
                {xAxis}
                {yAxis}
                {tooltip}
                {legend}
                {dataKeys.map((key) => (
                  <Line
                    key={key}
                    type={curve}
                    dataKey={key}
                    stroke={seriesColor(key)}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={lineDot(key)}
                    activeDot={marker(key, 5)}
                    isAnimationActive={animate}
                    animationDuration={600}
                  />
                ))}
              </LineChart>
            ) : chartType === "area" ? (
              <AreaChart data={chartData} margin={margin}>
                <defs>
                  {dataKeys.map((key, index) => (
                    <linearGradient
                      key={key}
                      id={`${gradientId}-${index}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={seriesColor(key)} stopOpacity={0.24} />
                      <stop offset="100%" stopColor={seriesColor(key)} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} />
                {xAxis}
                {yAxis}
                {tooltip}
                {legend}
                {dataKeys.map((key, index) => (
                  <Area
                    key={key}
                    type={curve}
                    dataKey={key}
                    stroke={seriesColor(key)}
                    strokeWidth={2}
                    fill={`url(#${gradientId}-${index})`}
                    dot={lineDot(key)}
                    activeDot={marker(key, 5)}
                    baseValue="dataMin"
                    isAnimationActive={animate}
                    animationDuration={600}
                  />
                ))}
              </AreaChart>
            ) : (
              <PieChart margin={margin}>
                {tooltip}
                <Pie
                  data={chartData}
                  dataKey={dataKeys[0]}
                  nameKey={xAxisKey || "name"}
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="86%"
                  paddingAngle={chartData.length > 1 ? 1 : 0}
                  stroke={SURFACE}
                  strokeWidth={2}
                  isAnimationActive={animate}
                >
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={paletteColor(index)} />
                  ))}
                  <Label
                    position="center"
                    content={({ viewBox }) => {
                      const box = viewBox as { cx?: number; cy?: number } | undefined;
                      if (box?.cx === undefined || box.cy === undefined) return null;
                      return (
                        <text x={box.cx} y={box.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan
                            x={box.cx}
                            y={box.cy - 6}
                            className="fill-foreground text-lg font-semibold"
                          >
                            {formatters.value(values.reduce((sum, value) => sum + value, 0))}
                          </tspan>
                          <tspan x={box.cx} y={box.cy + 14} className="fill-muted-foreground">
                            Total
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey={xAxisKey || "name"} />} />
              </PieChart>
            )}
          </ChartContainer>
        ) : (
          <div className="h-[220px] w-full" />
        )}
      </div>
    </div>
  );
}
