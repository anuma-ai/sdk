"use client";

import * as React from "react";

import { buildChartModel } from "../tools/chartModel";
import { type ChartCardProps, ChartError, ChartFrame, ChartPlaceholder } from "./chartFrame";

const RechartsChartCard = React.lazy(() =>
  import("./chart").then((module) => ({ default: module.ChartCard }))
);

class ChartLoadBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <ChartError /> : this.props.children;
  }
}

/** Renders a `display_chart` result, loading Recharts on first render and reserving the chart's space until it arrives. */
export function ChartCard({ data }: ChartCardProps) {
  if ("error" in data) return <ChartError />;
  return (
    <ChartLoadBoundary>
      <React.Suspense
        fallback={
          <ChartFrame spec={data} model={buildChartModel(data)}>
            <ChartPlaceholder />
          </ChartFrame>
        }
      >
        <RechartsChartCard data={data} />
      </React.Suspense>
    </ChartLoadBoundary>
  );
}
