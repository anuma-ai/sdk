/**
 * Chart display tool factory.
 *
 * Creates a client-side tool that renders bar, line, area, and pie charts
 * inline in the chat. The tool validates the LLM-provided data and passes
 * it through for rendering by the ChartCard component.
 */

import { createDisplayTool } from "./uiInteraction";
import type { CreateUIToolsOptions } from "./uiInteraction";
import type { ToolConfig } from "./googleCalendar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

/**
 * Create a display_chart tool that renders charts inline in the chat.
 *
 * @example
 * ```typescript
 * import { createChartTool } from "@reverbia/sdk/tools";
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
      "Renders a chart inline in the chat. Supports bar, line, area, and pie charts. RULES: (1) Call this tool ONCE per request — you cannot update a chart after it renders. (2) When the user provides data in their message, call this tool immediately with that data — do NOT search or verify it. (3) Only search/fetch if the user asks for data you don't have. (4) Do NOT repeat the chart data as text in your response. Just add a brief conversational comment about the chart. Use simple alphanumeric keys without spaces (e.g. 'revenue', 'users', 'q1Sales').",
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
            "Array of data points. Each object should have a label key and one or more numeric value keys.",
        },
        dataKeys: {
          type: "array",
          items: { type: "string" },
          description:
            "Which keys in each data object to chart as series/bars/slices (the numeric values).",
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
    execute: async (
      args: Record<string, unknown>
    ): Promise<DisplayChartResult> => {
      const chartType = args.chartType as string;
      const data = args.data as ChartDataPoint[];
      const dataKeys = args.dataKeys as string[];

      if (
        !chartType ||
        !["bar", "line", "area", "pie"].includes(chartType)
      ) {
        return { error: `Unsupported chart type: ${chartType}` };
      }
      if (!data || !Array.isArray(data) || data.length === 0) {
        return { error: "Invalid or empty chart data" };
      }
      if (!dataKeys || !Array.isArray(dataKeys) || dataKeys.length === 0) {
        return { error: "No data keys specified for charting" };
      }

      return {
        chartType: chartType as "bar" | "line" | "area" | "pie",
        title: args.title as string | undefined,
        data,
        dataKeys,
        xAxisKey: args.xAxisKey as string | undefined,
        colors: args.colors as Record<string, string> | undefined,
      };
    },
  });
}
