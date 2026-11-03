import type { ToolConfig } from "../lib/chat/useChat/types.js";
import type { CreateUIToolsOptions } from "./uiInteraction";
import { createDisplayTool } from "./uiInteraction";

export type ChartDataPoint = Record<string, string | number>;

export type DisplayChartResult =
  | {
      chartType: "bar" | "line" | "area" | "pie";
      title?: string;
      data: ChartDataPoint[];
      dataKeys: string[];
      xAxisKey?: string;
      colors?: Record<string, string>;
    }
  | {
      error: string;
    };

const NUMERIC_STRING = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[\s,$€£¥%]/g, "");
  return NUMERIC_STRING.test(cleaned) ? Number(cleaned) : undefined;
}

/**
 * Create a display_chart tool that renders charts inline in the chat.
 *
 * @example
 * ```typescript
 * import { createChartTool } from "@anuma/sdk/tools";
 *
 * const chartTool = createChartTool({
 *   getContext: () => uiInteraction,
 *   getLastMessageId: () => lastMsgId,
 * });
 * ```
 */
export function createChartTool(options: CreateUIToolsOptions): ToolConfig {
  return createDisplayTool(options, {
    name: "display_chart",
    description:
      'Render a bar, line, area, or pie chart inline — visualize data, plot a trend over time, or graph a comparison. Use whenever the user asks to chart, plot, graph, or visualize numbers (sales, prices, temperatures, metrics). You MUST pass the actual numeric values in the "data" array — they are never inferred. Do not chart price or market history (crypto, stocks, market caps) unless those values came from a tool result or a cited source earlier in this conversation; never fill a price series from memory.',
    parameters: {
      type: "object",
      properties: {
        chartType: {
          type: "string",
          enum: ["bar", "line", "area", "pie"],
          description: "Type of chart to render",
        },
        title: {
          type: "string",
          description: "Optional title displayed above the chart",
        },
        data: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: true,
          },
          description:
            'Array of objects containing the actual values to plot. Example: [{"quarter":"Q1","revenue":10},{"quarter":"Q2","revenue":15}]. Each object must include the label key and numeric value keys with real data from the user\'s message.',
        },
        dataKeys: {
          type: "array",
          items: { type: "string" },
          description:
            'Which keys in each data object contain the numeric values to chart (e.g. ["revenue"]). Must match keys present in the data array.',
        },
        xAxisKey: {
          type: "string",
          description:
            "Which key in each data object to use for x-axis labels (for bar, line, area charts). For pie charts, this is the name/label key for each slice.",
        },
        colors: {
          type: "object",
          additionalProperties: { type: "string" },
          description:
            "Optional color overrides. Map of dataKey to CSS color value (e.g. { 'revenue': '#2563eb' }). If omitted, uses theme chart colors.",
        },
      },
      required: ["chartType", "data", "dataKeys"],
    },
    displayType: "chart",
    execute: (args: Record<string, unknown>): DisplayChartResult => {
      const chartType = args.chartType as string;
      const data = args.data as ChartDataPoint[];
      const dataKeys = args.dataKeys as string[];

      if (!chartType || !["bar", "line", "area", "pie"].includes(chartType)) {
        return {
          error: `Unsupported chart type: ${chartType}. Must be one of: bar, line, area, pie.`,
        };
      }
      if (!data || !Array.isArray(data) || data.length === 0) {
        return {
          error:
            'The "data" array is required and must contain at least one data point object, e.g. [{"quarter":"Q1","revenue":10}]. You provided: ' +
            JSON.stringify(data),
        };
      }
      if (!dataKeys || !Array.isArray(dataKeys) || dataKeys.length === 0) {
        return {
          error:
            'The "dataKeys" array is required and must list the numeric keys to chart, e.g. ["revenue"].',
        };
      }

      const points = data.map((point) => ({ ...point }));
      for (const key of dataKeys) {
        let numericCount = 0;
        for (const [index, point] of points.entries()) {
          const raw = point[key];
          if (raw === undefined || raw === null) continue;
          const value = toNumber(raw);
          if (value === undefined) {
            return {
              error: `Series "${key}" has a non-numeric value at data[${index}]: ${JSON.stringify(raw)}. Values for dataKeys must be plain numbers, e.g. 65000 rather than "$65,000 USD".`,
            };
          }
          point[key] = value;
          numericCount++;
        }
        if (numericCount === 0) {
          return {
            error: `Series "${key}" has no numeric values. Every entry in "dataKeys" must name a numeric key present in the "data" objects.`,
          };
        }
      }

      return {
        chartType: chartType as "bar" | "line" | "area" | "pie",
        title: args.title as string | undefined,
        data: points,
        dataKeys,
        xAxisKey: args.xAxisKey as string | undefined,
        colors: args.colors as Record<string, string> | undefined,
      };
    },
  });
}
