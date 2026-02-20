import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import { ChartCard } from "./chart";
import type { DisplayChartResult } from "../tools/chart";

// recharts relies on DOM measurements (ResizeObserver, getBoundingClientRect)
// that happy-dom doesn't provide. Mock the recharts module so we can verify
// that ChartCard passes the right props without needing a real browser.
vi.mock("recharts", () => {
  // Serialize only primitive props to avoid circular React fiber references.
  function safeAttrs(props: Record<string, unknown>) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(props)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        out[`data-${k.toLowerCase()}`] = String(v);
      }
    }
    return out;
  }

  const createMock =
    (name: string) =>
    ({ children, ...props }: any) => (
      <div data-testid={name} {...safeAttrs(props)}>
        {children}
      </div>
    );

  return {
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    BarChart: createMock("BarChart"),
    LineChart: createMock("LineChart"),
    AreaChart: createMock("AreaChart"),
    PieChart: createMock("PieChart"),
    Bar: createMock("Bar"),
    Line: createMock("Line"),
    Area: createMock("Area"),
    Pie: createMock("Pie"),
    Cell: createMock("Cell"),
    XAxis: createMock("XAxis"),
    YAxis: createMock("YAxis"),
    CartesianGrid: createMock("CartesianGrid"),
    Tooltip: createMock("Tooltip"),
    Legend: createMock("Legend"),
  };
});

// Helper: render ChartCard and flush the requestAnimationFrame that gates
// the chart render (the component delays until the container is laid out).
async function renderChart(data: DisplayChartResult) {
  const result = render(<ChartCard data={data} />);
  // Flush rAF so the `ready` state flips to true
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(r));
  });
  return result;
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const BAR_DATA: DisplayChartResult = {
  chartType: "bar",
  title: "Quarterly Revenue",
  data: [
    { quarter: "Q1", revenue: 100, expenses: 80 },
    { quarter: "Q2", revenue: 150, expenses: 90 },
    { quarter: "Q3", revenue: 200, expenses: 120 },
  ],
  dataKeys: ["revenue", "expenses"],
  xAxisKey: "quarter",
};

const LINE_DATA: DisplayChartResult = {
  chartType: "line",
  title: "User Growth",
  data: [
    { month: "Jan", users: 500 },
    { month: "Feb", users: 800 },
    { month: "Mar", users: 1200 },
  ],
  dataKeys: ["users"],
  xAxisKey: "month",
};

const PIE_DATA: DisplayChartResult = {
  chartType: "pie",
  title: "Market Share",
  data: [
    { name: "Product A", share: 45 },
    { name: "Product B", share: 30 },
    { name: "Product C", share: 25 },
  ],
  dataKeys: ["share"],
  xAxisKey: "name",
};

const AREA_DATA: DisplayChartResult = {
  chartType: "area",
  data: [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 15 },
  ],
  dataKeys: ["y"],
  xAxisKey: "x",
};

const ERROR_DATA: DisplayChartResult = {
  error: "Something went wrong",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ChartCard", () => {
  it("renders a bar chart with title", async () => {
    await renderChart(BAR_DATA);

    expect(screen.getByText("Quarterly Revenue")).toBeDefined();
    expect(screen.getByTestId("BarChart")).toBeDefined();

    // One Bar element per dataKey
    const bars = screen.getAllByTestId("Bar");
    expect(bars).toHaveLength(2);
    expect(bars[0].getAttribute("data-datakey")).toBe("revenue");
    expect(bars[1].getAttribute("data-datakey")).toBe("expenses");

    // XAxis bound to quarter key
    const xAxis = screen.getByTestId("XAxis");
    expect(xAxis.getAttribute("data-datakey")).toBe("quarter");
  });

  it("renders a line chart", async () => {
    await renderChart(LINE_DATA);

    expect(screen.getByText("User Growth")).toBeDefined();
    expect(screen.getByTestId("LineChart")).toBeDefined();

    const lines = screen.getAllByTestId("Line");
    expect(lines).toHaveLength(1);
    expect(lines[0].getAttribute("data-datakey")).toBe("users");
  });

  it("renders a pie chart with cells for each data point", async () => {
    await renderChart(PIE_DATA);

    expect(screen.getByText("Market Share")).toBeDefined();
    expect(screen.getByTestId("PieChart")).toBeDefined();

    const cells = screen.getAllByTestId("Cell");
    expect(cells).toHaveLength(3);
  });

  it("renders an area chart without title", async () => {
    await renderChart(AREA_DATA);

    expect(screen.getByTestId("AreaChart")).toBeDefined();

    const areas = screen.getAllByTestId("Area");
    expect(areas).toHaveLength(1);
    expect(areas[0].getAttribute("data-datakey")).toBe("y");
  });

  it("renders an error message when data has error", () => {
    render(<ChartCard data={ERROR_DATA} />);
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("applies custom colors via CSS variables", async () => {
    const dataWithColors: DisplayChartResult = {
      ...BAR_DATA,
      colors: { revenue: "#2563eb", expenses: "#dc2626" },
    };
    const { container } = await renderChart(dataWithColors);

    const style = container.querySelector("style");
    expect(style).toBeDefined();
    expect(style!.innerHTML).toContain("--color-revenue: #2563eb");
    expect(style!.innerHTML).toContain("--color-expenses: #dc2626");
  });

  it("does not render legend for single dataKey", async () => {
    await renderChart(LINE_DATA);

    expect(screen.getByTestId("LineChart")).toBeDefined();
    expect(screen.queryByTestId("Legend")).toBeNull();
  });

  it("renders legend when multiple dataKeys exist", async () => {
    await renderChart(BAR_DATA);

    expect(screen.getByTestId("BarChart")).toBeDefined();
    expect(screen.getByTestId("Legend")).toBeDefined();
  });
});
