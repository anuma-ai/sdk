/**
 * Weather display tool factory.
 *
 * Creates a client-side tool that fetches weather data from the Open-Meteo
 * API and renders it as a visual card inline in the chat.
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import type { CreateUIToolsOptions } from "./uiInteraction";
import { createDisplayTool } from "./uiInteraction";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ForecastDay = {
  date: string;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
};

export type DisplayWeatherResult =
  | {
      location: string;
      country?: string;
      temperature: number;
      apparentTemperature: number;
      humidity: number;
      windSpeed: number;
      weatherCode: number;
      isDay: boolean;
      forecast?: ForecastDay[];
      _meta?: { location: string };
    }
  | {
      error: string;
      _meta?: { location: string };
    };

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

/**
 * Create a display_weather tool that fetches and renders weather data.
 *
 * When the LLM calls this tool, it geocodes the location, fetches current
 * weather and a 7-day forecast from Open-Meteo, and renders it as a card.
 * The result is not sent back to the LLM (`skipContinuation: true`).
 *
 * @example
 * ```typescript
 * import { createWeatherTool } from "@anuma/sdk/tools";
 *
 * const weatherTool = createWeatherTool({
 *   getContext: () => uiInteraction,
 *   getLastMessageId: () => lastMsgId,
 * });
 * ```
 */
export function createWeatherTool(options: CreateUIToolsOptions): ToolConfig {
  return createDisplayTool(options, {
    name: "display_weather",
    description:
      "Fetches and displays current weather as a visual card in the chat. ALWAYS call this tool when the user asks about weather, even if you already have weather data from another tool. The card displays temperature, conditions, and a 7-day forecast visually — do NOT repeat this data in your text response. Just add a brief conversational comment if appropriate.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description:
            "City name or place to get weather for (e.g., 'London', 'New York', 'Tokyo')",
        },
      },
      required: ["location"],
    },
    displayType: "weather",
    execute: async (args: Record<string, unknown>): Promise<DisplayWeatherResult> => {
      const location = args.location as string;
      if (!location || typeof location !== "string") {
        return { error: "No location provided", _meta: { location: "" } };
      }

      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
        );
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
          return {
            error: `Location not found: ${location}`,
            _meta: { location },
          };
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`
        );
        const weatherData = await weatherRes.json();
        const current = weatherData.current;
        const daily = weatherData.daily;

        const forecast: ForecastDay[] =
          daily?.time?.map((date: string, i: number) => ({
            date,
            weatherCode: daily.weather_code[i],
            temperatureMax: daily.temperature_2m_max[i],
            temperatureMin: daily.temperature_2m_min[i],
          })) || [];

        return {
          location: name,
          country,
          temperature: current.temperature_2m,
          apparentTemperature: current.apparent_temperature,
          humidity: current.relative_humidity_2m,
          windSpeed: current.wind_speed_10m,
          weatherCode: current.weather_code,
          isDay: current.is_day === 1,
          forecast,
          _meta: { location },
        };
      } catch {
        return {
          error: "Failed to fetch weather data",
          _meta: { location },
        };
      }
    },
  });
}
