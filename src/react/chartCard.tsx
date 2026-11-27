"use client";

import * as React from "react";

import { buildChartModel } from "../tools/chartModel";
import { type ChartCardProps, ChartError, ChartFrame, ChartPlaceholder } from "./chartFrame";

const RechartsChartCard = React.lazy(() =>
  import("./chart").then((module) => ({ default: module.ChartCard }))
);

function ChartCardFallback({ data }: ChartCardProps) {
  if ("error" in data) return <ChartError />;
  return (
    <ChartFrame spec={data} model={buildChartModel(data)}>
      <ChartPlaceholder />
    </ChartFrame>
  );
}

/** Renders a `display_chart` result, loading Recharts on first render and reserving the chart's space until it arrives. */
export function ChartCard({ data }: ChartCardProps) {
  return (
    <React.Suspense fallback={<ChartCardFallback data={data} />}>
      <RechartsChartCard data={data} />
    </React.Suspense>
  );
}
