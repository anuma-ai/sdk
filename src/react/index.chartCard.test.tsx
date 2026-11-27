import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import type { DisplayChartResult } from "../tools/chart";
import { ChartCard } from "./index";

const recharts = vi.hoisted(() => ({ loaded: false }));

vi.mock("recharts", () => {
  recharts.loaded = true;
  const Stub = () => null;
  return Object.fromEntries(
    [
      "Area",
      "AreaChart",
      "Bar",
      "BarChart",
      "CartesianGrid",
      "Cell",
      "Label",
      "Legend",
      "Line",
      "LineChart",
      "Pie",
      "PieChart",
      "ResponsiveContainer",
      "Tooltip",
      "XAxis",
      "YAxis",
    ].map((name) => [name, Stub])
  );
});

const rechartsLoadedByEntry = recharts.loaded;

const SOL_DATA: DisplayChartResult = {
  chartType: "line",
  title: "SOL daily closes (USD)",
  data: [
    { day: "Mon", close: 139.2 },
    { day: "Tue", close: 141.5 },
    { day: "Wed", close: 140.8 },
  ],
  dataKeys: ["close"],
  xAxisKey: "day",
  valueFormat: "currency",
  currency: "USD",
};

function chartBox(figure: HTMLElement) {
  const card = figure.firstElementChild as HTMLElement;
  const [header, table, body] = Array.from(card.children);
  return {
    figure: figure.className,
    card: card.className,
    header: header.outerHTML,
    table: table.outerHTML,
    bodyHeight: body.className.match(/\bh-\[[^\]]+\]/)?.[0],
  };
}

describe("ChartCard from @anuma/sdk/react", () => {
  it("does not load Recharts when the entry is imported", () => {
    expect(rechartsLoadedByEntry).toBe(false);
  });

  it("reserves the chart's box while Recharts loads, then draws the chart in it", async () => {
    const { container } = render(<ChartCard data={SOL_DATA} />);

    expect(recharts.loaded).toBe(false);
    expect(container.querySelector('[data-slot="chart"]')).toBeNull();
    const reserved = chartBox(
      screen.getByRole("figure", { name: "SOL daily closes (USD), line chart" })
    );
    expect(reserved.bodyHeight).toBeDefined();
    expect(reserved.header).toContain("$140.80");

    const chart = await waitFor(
      () => {
        const element = container.querySelector<HTMLElement>('[data-slot="chart"]');
        expect(element).not.toBeNull();
        return element!;
      },
      { timeout: 3_000 }
    );

    expect(recharts.loaded).toBe(true);
    const drawn = chartBox(chart.closest<HTMLElement>('[role="figure"]')!);
    expect(drawn).toEqual(reserved);
  });
});
