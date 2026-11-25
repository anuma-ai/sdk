// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

const recharts = vi.hoisted(() => ({ loaded: false }));

vi.mock("recharts", async (importOriginal) => {
  recharts.loaded = true;
  return importOriginal();
});

const CHART_EXPORTS = [
  "ChartCard",
  "ChartContainer",
  "ChartLegend",
  "ChartLegendContent",
  "ChartStyle",
  "ChartTooltip",
  "ChartTooltipContent",
];

describe("chart components entry point", () => {
  it("keeps them and recharts out of @anuma/sdk/react", async () => {
    const react = await import("./index");
    for (const name of CHART_EXPORTS) {
      expect(react).not.toHaveProperty(name);
    }
    expect(recharts.loaded).toBe(false);
  });

  it("serves them from @anuma/sdk/react/chart", async () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      exports: Record<string, Record<string, string>>;
    };
    expect(pkg.exports["./react/chart"]).toMatchObject({
      types: "./dist/react/chart/index.d.ts",
      import: "./dist/react/chart/index.mjs",
      require: "./dist/react/chart/index.cjs",
    });

    const chart = await import("./chart");
    for (const name of CHART_EXPORTS) {
      expect(chart).toHaveProperty(name);
    }
    expect(recharts.loaded).toBe(true);
  });
});
