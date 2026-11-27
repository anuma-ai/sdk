import * as React from "react";

import type { DisplayChartResult } from "../tools/chart";
import {
  chartCellText,
  type ChartModel,
  type ChartSpec,
  type ChartTrend,
  type ChartTrendDirection,
} from "../tools/chartModel";

export type ChartCardProps = {
  data: DisplayChartResult;
};

export function cx(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
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

const TREND_CLASS: Record<ChartTrendDirection, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-600 dark:text-red-400",
  flat: "text-muted-foreground",
};

const TREND_ARROW: Record<ChartTrendDirection, string> = { up: "▲", down: "▼", flat: "" };

function ChartHeader({ title, trend }: { title?: React.ReactNode; trend?: ChartTrend }) {
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
        {trend.range && <span className="text-muted-foreground">{trend.range}</span>}
      </p>
    </div>
  );
}

export function ChartError() {
  return (
    <div className="my-4 max-w-lg">
      <div className="rounded-xl bg-sidebar dark:bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">Couldn&apos;t display this chart.</p>
      </div>
    </div>
  );
}

export function ChartPlaceholder() {
  return <div className="h-[220px] w-full" />;
}

export function ChartFrame({
  spec,
  model,
  children,
}: {
  spec: ChartSpec;
  model: ChartModel;
  children: React.ReactNode;
}) {
  const tableColumns = model.labelKey ? [model.labelKey, ...model.plottedKeys] : model.plottedKeys;

  return (
    <div
      className="my-4 max-w-lg"
      role="figure"
      aria-label={[spec.title, `${spec.chartType} chart`].filter(Boolean).join(", ")}
    >
      <div className="rounded-xl bg-sidebar dark:bg-card px-5 py-4 [--chart-surface:var(--sidebar)] dark:[--chart-surface:var(--card)]">
        <ChartHeader title={model.title} trend={model.trend} />
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
            {spec.data.map((point, row) => (
              <tr key={row}>
                {tableColumns.map((column) => (
                  <td key={column}>{chartCellText(point[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {children}
      </div>
    </div>
  );
}
