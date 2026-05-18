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
      useFahrenheit: boolean;
      forecast?: ForecastDay[];
      _meta?: { location: string };
    }
  | {
      error: string;
      _meta?: { location: string };
    };

export interface CreateWeatherToolOptions {
  /**
   * Detect whether to fetch Fahrenheit/mph instead of Celsius/km/h.
   * Defaults to checking `navigator.language` for US/LR/MM regions.
   */
  detectUseFahrenheit?: () => boolean;
  /** Called when a fetch error occurs (after retry). */
  onError?: (error: Error, ctx: { location: string }) => void;
  /** Timeout in milliseconds for fetch requests. Defaults to 10000. */
  timeoutMs?: number;
  /**
   * Override the Open-Meteo geocoding API base URL.
   * Defaults to `https://geocoding-api.open-meteo.com/v1`.
   */
  geocodingBaseUrl?: string;
  /**
   * Override the Open-Meteo forecast API base URL.
   * Defaults to `https://api.open-meteo.com/v1`.
   */
  forecastBaseUrl?: string;
}

const DEFAULT_GEOCODING_BASE = "https://geocoding-api.open-meteo.com/v1";
const DEFAULT_FORECAST_BASE = "https://api.open-meteo.com/v1";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAHRENHEIT_REGIONS = new Set(["US", "LR", "MM"]);

function defaultDetectUseFahrenheit(): boolean {
  try {
    const region = new Intl.Locale(navigator.language).region;
    return FAHRENHEIT_REGIONS.has(region ?? "");
  } catch {
    return false;
  }
}

async function fetchJsonOnce<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/**
 * One retry with jitter (100-300ms) for transient network/HTTP failures.
 * AbortError (timeout) is NOT retried — repeating it would just double the
 * user's wait time before the same outcome. The caller's signal is shared
 * across both attempts, so `timeoutMs` bounds the total operation rather
 * than restarting per attempt.
 */
async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  try {
    return await fetchJsonOnce<T>(url, signal);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    if (signal.aborted) throw err;
    const jitter = 100 + Math.random() * 200;
    await new Promise<void>((resolve, reject) => {
      const id = setTimeout(resolve, jitter);
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(id);
          reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
        },
        { once: true }
      );
    });
    return await fetchJsonOnce<T>(url, signal);
  }
}

type GeocodingResponse = {
  results?: {
    latitude: number;
    longitude: number;
    name: string;
    country?: string;
  }[];
};

type WeatherResponse = {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    is_day: number;
  };
  daily?: {
    time?: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
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
 * Units are auto-detected from `navigator.language` (US/LR/MM → Fahrenheit
 * + mph). Override with `weatherOptions.detectUseFahrenheit`.
 *
 * @example
 * ```typescript
 * import { createWeatherTool } from "@anuma/sdk/tools";
 *
 * const weatherTool = createWeatherTool(
 *   { getContext: () => uiInteraction, getLastMessageId: () => lastMsgId },
 *   { onError: (err, { location }) => logError("weather", err, { location }) }
 * );
 * ```
 */
export function createWeatherTool(
  options: CreateUIToolsOptions,
  weatherOptions?: CreateWeatherToolOptions
): ToolConfig {
  const detectUseFahrenheit = weatherOptions?.detectUseFahrenheit ?? defaultDetectUseFahrenheit;
  const onError = weatherOptions?.onError;
  const timeoutMs = weatherOptions?.timeoutMs ?? 10_000;
  const geocodingBase = weatherOptions?.geocodingBaseUrl ?? DEFAULT_GEOCODING_BASE;
  const forecastBase = weatherOptions?.forecastBaseUrl ?? DEFAULT_FORECAST_BASE;

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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const useFahrenheit = detectUseFahrenheit();
        const tempUnit = useFahrenheit ? "fahrenheit" : "celsius";
        const windUnit = useFahrenheit ? "mph" : "kmh";

        const geoData = await fetchJson<GeocodingResponse>(
          `${geocodingBase}/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
          controller.signal
        );

        const firstResult = geoData.results?.[0];
        if (!firstResult) {
          return { error: `Location not found: ${location}`, _meta: { location } };
        }

        const { latitude, longitude, name, country } = firstResult;

        const weatherData = await fetchJson<WeatherResponse>(
          `${forecastBase}/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`,
          controller.signal
        );
        const current = weatherData.current;
        const daily = weatherData.daily;

        const forecast: ForecastDay[] =
          daily?.time?.map((date: string, i: number) => ({
            date,
            weatherCode: daily.weather_code[i] ?? 0,
            temperatureMax: daily.temperature_2m_max[i] ?? 0,
            temperatureMin: daily.temperature_2m_min[i] ?? 0,
          })) ?? [];

        return {
          location: name,
          country,
          temperature: current.temperature_2m,
          apparentTemperature: current.apparent_temperature,
          humidity: current.relative_humidity_2m,
          windSpeed: current.wind_speed_10m,
          weatherCode: current.weather_code,
          isDay: current.is_day === 1,
          useFahrenheit,
          forecast,
          _meta: { location },
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        if (error instanceof DOMException && error.name === "AbortError") {
          return { error: "Weather request timed out", _meta: { location } };
        }

        onError?.(error, { location });

        return { error: "Failed to fetch weather data", _meta: { location } };
      } finally {
        clearTimeout(timeoutId);
      }
    },
  });
}
