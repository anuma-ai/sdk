import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import { ChartCard, ChartContainer, ChartLegendContent, ChartTooltipContent } from "./chart";
import type { ChartDataPoint, DisplayChartResult } from "../tools/chart";

const lineDots: Record<string, any> = vi.hoisted(() => ({}));

vi.mock("recharts", () => {
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
    Line: ({ dot, ...props }: any) => {
      lineDots[props.dataKey] = dot;
      return createMock("Line")({ ...props, "dot-kind": typeof dot });
    },
    Area: ({ dot, ...props }: any) => createMock("Area")({ ...props, "dot-kind": typeof dot }),
    Pie: createMock("Pie"),
    Cell: createMock("Cell"),
    Label: createMock("Label"),
    XAxis: ({ padding, ...props }: any) =>
      createMock("XAxis")({ ...props, "padding-left": padding?.left }),
    YAxis: ({ tickFormatter, domain, ...props }: any) =>
      createMock("YAxis")({
        ...props,
        "tick-sample": tickFormatter?.(2150000000000),
        "tick-labels": props.ticks?.map((tick: number) => tickFormatter?.(tick)).join("|"),
        "domain-low": domain?.[0],
        "domain-high": domain?.[1],
      }),
    CartesianGrid: createMock("CartesianGrid"),
    Tooltip: createMock("Tooltip"),
    Legend: createMock("Legend"),
  };
});

const EN_DASH = String.fromCharCode(0x2013);
const MINUS = String.fromCharCode(0x2212);

const SOL_DATA: DisplayChartResult = {
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

async function renderChart(data: DisplayChartResult) {
  const result = render(<ChartCard data={data} />);
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(r));
  });
  return result;
}

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

describe("ChartCard", () => {
  it("renders a bar chart with title", async () => {
    await renderChart(BAR_DATA);

    expect(screen.getByText("Quarterly Revenue")).toBeDefined();
    expect(screen.getByTestId("BarChart")).toBeDefined();

    const bars = screen.getAllByTestId("Bar");
    expect(bars).toHaveLength(2);
    expect(bars[0].getAttribute("data-datakey")).toBe("revenue");
    expect(bars[1].getAttribute("data-datakey")).toBe("expenses");

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

  it("shows generic copy instead of the tool's developer error", () => {
    render(
      <ChartCard
        data={{
          error:
            'The "data" array is required and must contain at least one data point object. You provided: []',
        }}
      />
    );
    expect(screen.getByText("Couldn't display this chart.")).toBeDefined();
    expect(screen.queryByText(/You provided/)).toBeNull();
  });

  it("drops colors that are not plain CSS colors", async () => {
    const { container } = await renderChart({
      ...BAR_DATA,
      colors: { revenue: "red} body{visibility:hidden", expenses: "url(javascript:alert(1))" },
    });

    const style = container.querySelector("style")!;
    expect(style.innerHTML).not.toContain("body");
    expect(style.innerHTML).not.toContain("url(");
    const bars = screen.getAllByTestId("Bar");
    expect(bars[0].getAttribute("data-fill")).toBe("var(--chart-1)");
    expect(bars[1].getAttribute("data-fill")).toBe("var(--chart-2)");
  });

  it("colors series whose keys contain spaces or symbols", async () => {
    const { container } = await renderChart({
      chartType: "line",
      data: [
        { day: "Mon", "BTC Price": 65000, "Close ($)": 64000 },
        { day: "Tue", "BTC Price": 66000, "Close ($)": 65500 },
      ],
      dataKeys: ["BTC Price", "Close ($)"],
      xAxisKey: "day",
      colors: { "Close ($)": "#2563eb" },
    });

    const lines = screen.getAllByTestId("Line");
    expect(lines[0].getAttribute("data-datakey")).toBe("BTC Price");
    expect(lines[0].getAttribute("data-stroke")).toBe("var(--chart-1)");
    expect(lines[1].getAttribute("data-stroke")).toBe("#2563eb");
    expect(container.querySelector("style")?.innerHTML ?? "").not.toContain("BTC Price");
  });

  it("formats Y axis ticks compactly and sizes the axis to fit", async () => {
    await renderChart({
      chartType: "bar",
      data: [{ coin: "BTC", cap: 2150000000000 }],
      dataKeys: ["cap"],
      xAxisKey: "coin",
    });

    const yAxis = screen.getByTestId("YAxis");
    expect(yAxis.getAttribute("data-tick-sample")).toBe("2.15T");
    expect(Number(yAxis.getAttribute("data-width"))).toBeGreaterThanOrEqual(40);
  });

  it("widens the Y axis for long tick labels", async () => {
    await renderChart({
      chartType: "line",
      data: [{ t: "1", pepe: 0.0000123 }],
      dataKeys: ["pepe"],
      xAxisKey: "t",
    });

    expect(Number(screen.getByTestId("YAxis").getAttribute("data-width"))).toBeGreaterThan(60);
  });

  it("exposes an accessible name and a data table", async () => {
    const { container } = await renderChart(BAR_DATA);

    expect(screen.getByRole("figure", { name: "Quarterly Revenue, bar chart" })).toBeDefined();
    const table = screen.getByRole("table");
    expect(Array.from(table.querySelectorAll("th")).map((th) => th.textContent)).toEqual([
      "quarter",
      "revenue",
      "expenses",
    ]);
    expect(
      Array.from(table.querySelectorAll("tbody tr")[1].querySelectorAll("td")).map(
        (td) => td.textContent
      )
    ).toEqual(["Q2", "150", "90"]);
    expect(container.querySelector('[data-slot="chart"]')?.getAttribute("aria-hidden")).toBe(
      "true"
    );
  });

  it("renders non-primitive labels as empty table cells instead of crashing", async () => {
    await renderChart({
      chartType: "bar",
      data: [{ label: { text: "Mon" }, value: 10 }] as unknown as ChartDataPoint[],
      dataKeys: ["value"],
      xAxisKey: "label",
    });

    const cells = Array.from(screen.getByRole("table").querySelectorAll("tbody td")).map(
      (td) => td.textContent
    );
    expect(cells).toEqual(["", "10"]);
  });

  it("fits the Y axis to a line's data instead of starting at zero", async () => {
    await renderChart(SOL_DATA);

    const yAxis = screen.getByTestId("YAxis");
    expect(Number(yAxis.getAttribute("data-domain-low"))).toBeGreaterThan(130);
    expect(Number(yAxis.getAttribute("data-domain-high"))).toBeLessThan(150);
    expect(screen.getByTestId("XAxis").getAttribute("data-padding-left")).toBe("12");
  });

  it("keeps a zero baseline for bars", async () => {
    await renderChart(BAR_DATA);

    expect(screen.getByTestId("YAxis").hasAttribute("data-domain-low")).toBe(false);
  });

  it("formats currency values and leads a single series with its latest value and change", async () => {
    await renderChart(SOL_DATA);

    expect(screen.getByTestId("YAxis").getAttribute("data-tick-sample")).toBe("$2.15T");
    const header = screen.getByTestId("chart-header");
    expect(header.textContent).toContain("SOL daily closes (USD)");
    expect(header.textContent).toContain("$143.60");
    expect(header.textContent).toContain("+$4.40 (+3.16%)");
    expect(header.textContent).toContain(`Mon ${EN_DASH} Fri`);
    expect(header.querySelector(".text-emerald-600")).not.toBeNull();
  });

  it("shows a falling series with a minus sign and the down color", async () => {
    await renderChart({
      ...SOL_DATA,
      data: [
        { day: "Mon", close: 150 },
        { day: "Tue", close: 135 },
      ],
    });

    const header = screen.getByTestId("chart-header");
    expect(header.textContent).toContain(`${MINUS}$15.00 (${MINUS}10%)`);
    expect(header.querySelector(".text-red-600")).not.toBeNull();
  });

  it("formats percent series as percentages and their change in points", async () => {
    await renderChart({
      chartType: "line",
      title: "Funding rate",
      data: [
        { day: "Mon", rate: 1.5 },
        { day: "Tue", rate: 3.2 },
      ],
      dataKeys: ["rate"],
      xAxisKey: "day",
      valueFormat: "percent",
    });

    const header = screen.getByTestId("chart-header");
    expect(header.textContent).toContain("3.2%");
    expect(header.textContent).toContain("+1.7 pts");
  });

  it("marks every point on short series and only the end on long ones", async () => {
    await renderChart(SOL_DATA);
    expect(screen.getByTestId("Line").getAttribute("data-dot-kind")).toBe("object");

    await renderChart({
      ...SOL_DATA,
      data: Array.from({ length: 30 }, (_, i) => ({ day: `D${i}`, close: 100 + i })),
    });
    expect(screen.getAllByTestId("Line")[1].getAttribute("data-dot-kind")).toBe("function");
  });

  it("puts a long series' end dot on its last value, never at a missing point", async () => {
    await renderChart({
      chartType: "line",
      data: Array.from({ length: 30 }, (_, i) => ({
        day: `D${i}`,
        eth: 100 + i,
        ...(i < 29 ? { sol: 50 + i } : {}),
      })),
      dataKeys: ["eth", "sol"],
      xAxisKey: "day",
    });

    const drawn = (key: string, props: Record<string, unknown>) =>
      render(<svg>{lineDots[key](props)}</svg>).container.querySelectorAll("circle").length;

    expect(drawn("sol", { cx: 10, cy: null, index: 29 })).toBe(0);
    expect(drawn("sol", { cx: 10, cy: 20, index: 28 })).toBe(1);
    expect(drawn("eth", { cx: 10, cy: 20, index: 29 })).toBe(1);
    expect(drawn("eth", { cx: 10, cy: 20, index: 28 })).toBe(0);
  });

  it("shows zero values in the tooltip with the chart's formatter", () => {
    render(
      <ChartContainer config={{ close: { label: "Close", color: "red" } }}>
        <ChartTooltipContent
          active
          payload={[{ value: 0, dataKey: "close", name: "close", color: "red" } as any]}
          valueFormatter={(value) => `$${value.toFixed(2)}`}
        />
      </ChartContainer>
    );

    expect(screen.getByText("$0.00")).toBeDefined();
  });

  it("names legend entries that have no series config, like pie slices", () => {
    render(
      <ChartContainer config={{ value: { label: "Value", color: "red" } }}>
        <ChartLegendContent
          nameKey="asset"
          payload={[{ value: "BTC", color: "red", dataKey: "value" } as any]}
        />
      </ChartContainer>
    );

    expect(screen.getByText("BTC")).toBeDefined();
  });

  it("renders values too large to step through without hanging", async () => {
    await renderChart({
      chartType: "line",
      data: [
        { t: "a", v: 10000000000000000 },
        { t: "b", v: 10000000000000002 },
      ],
      dataKeys: ["v"],
      xAxisKey: "t",
    });

    expect(screen.getByTestId("YAxis")).toBeDefined();
  });

  it("keeps adjacent tick labels distinct on tight ranges at high magnitudes", async () => {
    await renderChart({
      chartType: "line",
      data: [
        { t: "a", v: 1000000900 },
        { t: "b", v: 1000001100 },
      ],
      dataKeys: ["v"],
      xAxisKey: "t",
    });

    const labels = screen.getByTestId("YAxis").getAttribute("data-tick-labels")!.split("|");
    expect(labels.length).toBeGreaterThan(2);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("keeps meaningful digits for small percentages and point changes", async () => {
    await renderChart({
      chartType: "line",
      data: [
        { t: "a", rate: 0.001 },
        { t: "b", rate: 0.002 },
        { t: "c", rate: 0.003 },
      ],
      dataKeys: ["rate"],
      xAxisKey: "t",
      valueFormat: "percent",
    });

    const header = screen.getByTestId("chart-header");
    expect(header.textContent).toContain("0.003%");
    expect(header.textContent).toContain("+0.002 pts");
  });

  it("labels the headline range with the rows the change compares", async () => {
    await renderChart({
      ...SOL_DATA,
      data: [
        { day: "Mon" },
        { day: "Tue", close: 100 },
        { day: "Wed", close: 110 },
        { day: "Thu" },
      ],
    });

    const header = screen.getByTestId("chart-header");
    expect(header.textContent).toContain(`Tue ${EN_DASH} Wed`);
    expect(header.textContent).toContain("+$10.00 (+10%)");
  });

  it("gives every pie slice a distinct color", async () => {
    await renderChart({
      chartType: "pie",
      data: Array.from({ length: 8 }, (_, i) => ({ name: `Slice ${i}`, share: i + 1 })),
      dataKeys: ["share"],
      xAxisKey: "name",
    });

    const fills = screen.getAllByTestId("Cell").map((cell) => cell.getAttribute("data-fill"));
    expect(new Set(fills).size).toBe(8);
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
