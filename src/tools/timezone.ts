/**
 * Timezone / current time tool definition for the chat system.
 * Uses the public timeapi.io service (no auth required).
 */

import type { ToolConfig } from "../lib/chat/useChat/types";

interface TimezoneResult {
  timezone: string;
  datetime: string;
  utcOffset: string;
  dayOfWeek: string;
}

/**
 * Creates the timezone lookup tool.
 */
export function createTimezoneTool(): ToolConfig {
  return {
    type: "function",
    function: {
      name: "get_current_time",
      description:
        "Get the current date and time for a given IANA timezone (e.g. America/New_York, Europe/London).",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "IANA timezone identifier (e.g. America/New_York)",
          },
        },
        required: ["timezone"],
      },
    },
    executor: async (args: Record<string, unknown>): Promise<TimezoneResult | string> => {
      const timezone = args.timezone as string;

      try {
        const resp = await fetch(
          `https://timeapi.io/api/time/current/zone?timeZone=${encodeURIComponent(timezone)}`
        );
        if (!resp.ok) {
          return `Error: Timezone lookup failed (${resp.status})`;
        }

        const data = (await resp.json()) as {
          timeZone: string;
          dateTime: string;
          utcOffset: string;
          dayOfWeek: string;
        };
        return {
          timezone: data.timeZone,
          datetime: data.dateTime,
          utcOffset: data.utcOffset,
          dayOfWeek: data.dayOfWeek,
        };
      } catch (error) {
        return `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  };
}
