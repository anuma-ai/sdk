import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DisplayChartResult } from "../tools/chart";
import { ChartCard } from "./chartCard";

vi.mock("./chart", () => {
  throw new Error("Failed to fetch dynamically imported module");
});

class Escaped extends React.Component<{ children: React.ReactNode }, { escaped: boolean }> {
  state = { escaped: false };

  static getDerivedStateFromError() {
    return { escaped: true };
  }

  render() {
    return this.state.escaped ? <p>escaped</p> : this.props.children;
  }
}

const DATA: DisplayChartResult = {
  chartType: "bar",
  title: "Weekly volume",
  data: [
    { week: "W1", volume: 3 },
    { week: "W2", volume: 5 },
  ],
  dataKeys: ["volume"],
  xAxisKey: "week",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChartCard when the chart chunk fails to load", () => {
  it("shows the chart error in place instead of throwing into the surrounding page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <Escaped>
        <p>surrounding chat</p>
        <ChartCard data={DATA} />
      </Escaped>
    );

    await waitFor(() => expect(screen.getByText("Couldn't display this chart.")).toBeTruthy());
    expect(screen.getByText("surrounding chat")).toBeTruthy();
    expect(screen.queryByText("escaped")).toBeNull();
  });
});
