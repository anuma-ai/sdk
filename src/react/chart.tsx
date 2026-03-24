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
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import type { DisplayChartResult } from "../tools/chart";

// ---------------------------------------------------------------------------
// Utility: lightweight class-name joiner (no tailwind-merge needed)
// ---------------------------------------------------------------------------

function cx(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// ChartConfig / Context
// ---------------------------------------------------------------------------

const THEMES = { light: "", dark: ".dark" } as const;

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

// ---------------------------------------------------------------------------
// ChartStyle – injects CSS variables for colors
// ---------------------------------------------------------------------------

export function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.theme || cfg.color);

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
    return color ? `  --color-${key}: ${color};` : null;
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

// ---------------------------------------------------------------------------
// ChartContainer
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// ChartTooltip / ChartTooltipContent
// ---------------------------------------------------------------------------

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
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
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
                      {item.value && (
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {item.value.toLocaleString()}
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

// ---------------------------------------------------------------------------
// ChartLegend / ChartLegendContent
// ---------------------------------------------------------------------------

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
              {itemConfig?.label}
            </div>
          );
        })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: extract item config from a recharts payload
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// ChartCard – the high-level component consumers render in chat
// ---------------------------------------------------------------------------

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

function buildChartConfig(dataKeys: string[], colors?: Record<string, string>): ChartConfig {
  const config: ChartConfig = {};
  dataKeys.forEach((key, i) => {
    config[key] = {
      label: key.charAt(0).toUpperCase() + key.slice(1),
      color: colors?.[key] || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    };
  });
  return config;
}

export function ChartCard({ data }: ChartCardProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if ("error" in data) {
    return (
      <div className="my-4 max-w-lg">
        <div className="rounded-xl bg-sidebar dark:bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">{data.error}</p>
        </div>
      </div>
    );
  }

  const { chartType, title, data: chartData, dataKeys, xAxisKey, colors } = data;
  const chartConfig = buildChartConfig(dataKeys, colors);

  return (
    <div className="my-4 max-w-lg" ref={containerRef}>
      <div className="rounded-xl bg-sidebar dark:bg-card px-5 py-4">
        {title && <p className="text-sm font-medium mb-3">{title}</p>}
        {ready ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            {chartType === "bar" ? (
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} />
                {xAxisKey && (
                  <XAxis dataKey={xAxisKey} tickLine={false} axisLine={false} tickMargin={8} />
                )}
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {dataKeys.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
                {dataKeys.map((key) => (
                  <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={4} />
                ))}
              </BarChart>
            ) : chartType === "line" ? (
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} />
                {xAxisKey && (
                  <XAxis dataKey={xAxisKey} tickLine={false} axisLine={false} tickMargin={8} />
                )}
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {dataKeys.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
                {dataKeys.map((key) => (
                  <Line
                    key={key}
                    dataKey={key}
                    stroke={`var(--color-${key})`}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            ) : chartType === "area" ? (
              <AreaChart data={chartData}>
                <CartesianGrid vertical={false} />
                {xAxisKey && (
                  <XAxis dataKey={xAxisKey} tickLine={false} axisLine={false} tickMargin={8} />
                )}
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {dataKeys.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
                {dataKeys.map((key) => (
                  <Area
                    key={key}
                    dataKey={key}
                    fill={`var(--color-${key})`}
                    stroke={`var(--color-${key})`}
                    fillOpacity={0.3}
                  />
                ))}
              </AreaChart>
            ) : (
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={chartData}
                  dataKey={dataKeys[0]}
                  nameKey={xAxisKey || "name"}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                >
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey={xAxisKey || "name"} />} />
              </PieChart>
            )}
          </ChartContainer>
        ) : (
          <div className="h-[250px] w-full" />
        )}
      </div>
    </div>
  );
}
