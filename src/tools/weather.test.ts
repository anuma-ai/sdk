import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import type { CreateWeatherToolOptions, DisplayWeatherResult } from "./weather";
import { createWeatherTool } from "./weather";

// ── Mock fetch ──────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const geoResultLondon = {
  results: [{ latitude: 51.5, longitude: -0.13, name: "London", country: "UK" }],
};

const currentWeatherData = {
  current: {
    temperature_2m: 12,
    apparent_temperature: 10,
    relative_humidity_2m: 70,
    wind_speed_10m: 5,
    weather_code: 3,
    is_day: 1,
  },
  daily: {
    time: ["2026-05-21", "2026-05-22"],
    weather_code: [1, 2],
    temperature_2m_max: [15, 16],
    temperature_2m_min: [8, 9],
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildContext() {
  const createDisplayInteraction = vi.fn();
  const createInteraction = vi.fn();
  return {
    createDisplayInteraction,
    createInteraction,
    context: { createDisplayInteraction, createInteraction },
  };
}

function buildTool(weatherOptions?: CreateWeatherToolOptions): {
  tool: ToolConfig;
  createDisplayInteraction: ReturnType<typeof vi.fn>;
} {
  const { context, createDisplayInteraction } = buildContext();
  const tool = createWeatherTool(
    {
      getContext: () => context,
      getLastMessageId: () => "msg-1",
    },
    {
      // Default to Celsius for deterministic tests; specific tests override.
      detectUseFahrenheit: () => false,
      ...weatherOptions,
    }
  );
  return { tool, createDisplayInteraction };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("createWeatherTool", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Pin jitter to a deterministic 100 ms so retry tests don't add wall time.
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => vi.restoreAllMocks());

  describe("tool shape", () => {
    it("registers as display_weather with skipContinuation", () => {
      const { tool } = buildTool();
      expect(tool.function.name).toBe("display_weather");
      expect(tool.skipContinuation).toBe(true);
      const params = tool.function.arguments as { required?: string[] };
      expect(params.required).toContain("location");
    });
  });

  describe("input validation", () => {
    it("returns error when location is empty", async () => {
      const { tool, createDisplayInteraction } = buildTool();
      const result = (await tool.executor!({ location: "" })) as DisplayWeatherResult;
      expect(result).toEqual({ error: "No location provided", _meta: { location: "" } });
      expect(mockFetch).not.toHaveBeenCalled();
      // No display interaction expected since execute returned synchronously.
      // (Display interaction is still recorded — see "display integration" below.)
      expect(createDisplayInteraction).toHaveBeenCalledTimes(1);
    });

    it("returns error when location is missing", async () => {
      const { tool } = buildTool();
      const result = (await tool.executor!({})) as DisplayWeatherResult;
      expect(result).toEqual({ error: "No location provided", _meta: { location: "" } });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("geocoding", () => {
    it("returns 'Location not found' when no geocoding results", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }));
      const { tool } = buildTool();
      const result = (await tool.executor!({ location: "Nowhere" })) as DisplayWeatherResult;
      expect(result).toEqual({
        error: "Location not found: Nowhere",
        _meta: { location: "Nowhere" },
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("returns 'Location not found' when results is undefined", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));
      const { tool } = buildTool();
      const result = (await tool.executor!({ location: "Nowhere" })) as DisplayWeatherResult;
      expect("error" in result && result.error).toBe("Location not found: Nowhere");
    });

    it("uses the custom geocodingBaseUrl", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }));
      const { tool } = buildTool({ geocodingBaseUrl: "https://geo.example.com/v9" });
      await tool.executor!({ location: "London" });
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url.startsWith("https://geo.example.com/v9/search")).toBe(true);
    });

    it("URL-encodes the location parameter", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }));
      const { tool } = buildTool();
      await tool.executor!({ location: "São Paulo" });
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain("name=S%C3%A3o%20Paulo");
    });
  });

  describe("successful forecast", () => {
    it("returns weather data with Celsius/kmh units by default", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(geoResultLondon))
        .mockResolvedValueOnce(jsonResponse(currentWeatherData));
      const { tool } = buildTool();
      const result = (await tool.executor!({ location: "London" })) as DisplayWeatherResult;

      expect(result).toMatchObject({
        location: "London",
        country: "UK",
        temperature: 12,
        apparentTemperature: 10,
        humidity: 70,
        windSpeed: 5,
        weatherCode: 3,
        isDay: true,
        useFahrenheit: false,
        _meta: { location: "London" },
      });
      expect(result).toHaveProperty("forecast");

      const forecastUrl = mockFetch.mock.calls[1]?.[0] as string;
      expect(forecastUrl).toContain("temperature_unit=celsius");
      expect(forecastUrl).toContain("wind_speed_unit=kmh");
      expect(forecastUrl).toContain("latitude=51.5");
      expect(forecastUrl).toContain("longitude=-0.13");
    });

    it("requests Fahrenheit/mph when detectUseFahrenheit returns true", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(geoResultLondon))
        .mockResolvedValueOnce(jsonResponse(currentWeatherData));
      const { tool } = buildTool({ detectUseFahrenheit: () => true });
      const result = (await tool.executor!({ location: "London" })) as DisplayWeatherResult;

      expect("useFahrenheit" in result && result.useFahrenheit).toBe(true);
      const forecastUrl = mockFetch.mock.calls[1]?.[0] as string;
      expect(forecastUrl).toContain("temperature_unit=fahrenheit");
      expect(forecastUrl).toContain("wind_speed_unit=mph");
    });

    it("uses the custom forecastBaseUrl", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(geoResultLondon))
        .mockResolvedValueOnce(jsonResponse(currentWeatherData));
      const { tool } = buildTool({ forecastBaseUrl: "https://fc.example.com/v2" });
      await tool.executor!({ location: "London" });
      const forecastUrl = mockFetch.mock.calls[1]?.[0] as string;
      expect(forecastUrl.startsWith("https://fc.example.com/v2/forecast")).toBe(true);
    });

    it("maps forecast entries from daily arrays", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(geoResultLondon))
        .mockResolvedValueOnce(jsonResponse(currentWeatherData));
      const { tool } = buildTool();
      const result = (await tool.executor!({ location: "London" })) as DisplayWeatherResult;
      expect("forecast" in result && result.forecast).toEqual([
        { date: "2026-05-21", weatherCode: 1, temperatureMax: 15, temperatureMin: 8 },
        { date: "2026-05-22", weatherCode: 2, temperatureMax: 16, temperatureMin: 9 },
      ]);
    });

    it("falls back to empty forecast when daily is missing", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(geoResultLondon))
        .mockResolvedValueOnce(jsonResponse({ current: currentWeatherData.current }));
      const { tool } = buildTool();
      const result = (await tool.executor!({ location: "London" })) as DisplayWeatherResult;
      expect("forecast" in result && result.forecast).toEqual([]);
    });

    it("falls back to 0 for missing daily entries", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(geoResultLondon))
        .mockResolvedValueOnce(
          jsonResponse({
            current: currentWeatherData.current,
            daily: {
              time: ["2026-05-21"],
              weather_code: [],
              temperature_2m_max: [],
              temperature_2m_min: [],
            },
          })
        );
      const { tool } = buildTool();
      const result = (await tool.executor!({ location: "London" })) as DisplayWeatherResult;
      expect("forecast" in result && result.forecast).toEqual([
        { date: "2026-05-21", weatherCode: 0, temperatureMax: 0, temperatureMin: 0 },
      ]);
    });

    it("marks isDay=false when is_day is 0", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(geoResultLondon))
        .mockResolvedValueOnce(
          jsonResponse({
            current: { ...currentWeatherData.current, is_day: 0 },
            daily: currentWeatherData.daily,
          })
        );
      const { tool } = buildTool();
      const result = (await tool.executor!({ location: "London" })) as DisplayWeatherResult;
      expect("isDay" in result && result.isDay).toBe(false);
    });
  });

  describe("error handling", () => {
    it("returns 'Failed to fetch weather data' when both attempts fail with HTTP error", async () => {
      const onError = vi.fn();
      mockFetch
        .mockResolvedValueOnce(jsonResponse({}, 500))
        .mockResolvedValueOnce(jsonResponse({}, 500));
      const { tool } = buildTool({ onError });
      const result = (await tool.executor!({ location: "London" })) as DisplayWeatherResult;
      expect(result).toEqual({
        error: "Failed to fetch weather data",
        _meta: { location: "London" },
      });
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
      expect((onError.mock.calls[0]?.[0] as Error).message).toBe("HTTP 500");
      expect(onError.mock.calls[0]?.[1]).toEqual({ location: "London" });
    });

    it("returns timeout error when AbortController fires", async () => {
      const onError = vi.fn();
      // Resolve very slowly so the 10ms timeout fires first.
      mockFetch.mockImplementation(
        (_url, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener(
              "abort",
              () => {
                reject(new DOMException("Aborted", "AbortError"));
              },
              { once: true }
            );
          })
      );
      const { tool } = buildTool({ onError, timeoutMs: 10 });
      const result = (await tool.executor!({ location: "London" })) as DisplayWeatherResult;
      expect(result).toEqual({
        error: "Weather request timed out",
        _meta: { location: "London" },
      });
      // onError must NOT be called for timeouts — see weather.ts comment.
      expect(onError).not.toHaveBeenCalled();
    });

    it("does not retry on AbortError", async () => {
      mockFetch.mockImplementation(
        (_url, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true }
            );
          })
      );
      const { tool } = buildTool({ timeoutMs: 10 });
      await tool.executor!({ location: "London" });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("skips onError callback when none is provided", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse({}, 500))
        .mockResolvedValueOnce(jsonResponse({}, 500));
      const { tool } = buildTool();
      const result = (await tool.executor!({ location: "London" })) as DisplayWeatherResult;
      expect("error" in result && result.error).toBe("Failed to fetch weather data");
    });
  });

  describe("retry logic", () => {
    it("retries once after a transient HTTP failure and succeeds", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse({}, 500))
        .mockResolvedValueOnce(jsonResponse(geoResultLondon))
        .mockResolvedValueOnce(jsonResponse(currentWeatherData));
      const onError = vi.fn();
      const { tool } = buildTool({ onError });
      const result = (await tool.executor!({ location: "London" })) as DisplayWeatherResult;
      expect("location" in result && result.location).toBe("London");
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(onError).not.toHaveBeenCalled();
    });

    it("retries once after a network error and succeeds", async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError("network down"))
        .mockResolvedValueOnce(jsonResponse(geoResultLondon))
        .mockResolvedValueOnce(jsonResponse(currentWeatherData));
      const { tool } = buildTool();
      const result = (await tool.executor!({ location: "London" })) as DisplayWeatherResult;
      expect("location" in result && result.location).toBe("London");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("display integration", () => {
    it("registers a display interaction with displayType 'weather'", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(geoResultLondon))
        .mockResolvedValueOnce(jsonResponse(currentWeatherData));
      const { tool, createDisplayInteraction } = buildTool();
      await tool.executor!({ location: "London" });
      expect(createDisplayInteraction).toHaveBeenCalledTimes(1);
      const call = createDisplayInteraction.mock.calls[0]!;
      expect(call[1]).toBe("weather");
      expect(call[2]).toEqual({ afterMessageId: "msg-1" });
      expect(call[3]).toMatchObject({ location: "London", useFahrenheit: false });
    });

    it("still registers a display interaction for error results", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }));
      const { tool, createDisplayInteraction } = buildTool();
      await tool.executor!({ location: "Nowhere" });
      expect(createDisplayInteraction).toHaveBeenCalledTimes(1);
      expect(createDisplayInteraction.mock.calls[0]?.[3]).toMatchObject({
        error: "Location not found: Nowhere",
      });
    });

    it("does not throw when no context is available", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(geoResultLondon))
        .mockResolvedValueOnce(jsonResponse(currentWeatherData));
      const tool = createWeatherTool(
        { getContext: () => null },
        { detectUseFahrenheit: () => false }
      );
      const result = (await tool.executor!({ location: "London" })) as DisplayWeatherResult;
      expect("location" in result && result.location).toBe("London");
    });
  });

  describe("default fahrenheit detection", () => {
    function withNavigatorLanguage(language: string, fn: () => void): void {
      const original = Object.getOwnPropertyDescriptor(navigator, "language");
      Object.defineProperty(navigator, "language", { value: language, configurable: true });
      try {
        fn();
      } finally {
        if (original) {
          Object.defineProperty(navigator, "language", original);
        }
      }
    }

    it("detects Fahrenheit for en-US", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(geoResultLondon))
        .mockResolvedValueOnce(jsonResponse(currentWeatherData));
      const { context } = buildContext();
      // No detectUseFahrenheit override → exercises default detector.
      const tool = createWeatherTool({ getContext: () => context });
      let result: DisplayWeatherResult | undefined;
      await new Promise<void>((resolve) => {
        withNavigatorLanguage("en-US", () => {
          tool.executor!({ location: "London" }).then((r) => {
            result = r as DisplayWeatherResult;
            resolve();
          });
        });
      });
      expect(result && "useFahrenheit" in result && result.useFahrenheit).toBe(true);
    });

    it("detects Celsius for en-GB", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(geoResultLondon))
        .mockResolvedValueOnce(jsonResponse(currentWeatherData));
      const { context } = buildContext();
      const tool = createWeatherTool({ getContext: () => context });
      let result: DisplayWeatherResult | undefined;
      await new Promise<void>((resolve) => {
        withNavigatorLanguage("en-GB", () => {
          tool.executor!({ location: "London" }).then((r) => {
            result = r as DisplayWeatherResult;
            resolve();
          });
        });
      });
      expect(result && "useFahrenheit" in result && result.useFahrenheit).toBe(false);
    });

    it("falls back to Celsius when navigator.language is invalid", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse(geoResultLondon))
        .mockResolvedValueOnce(jsonResponse(currentWeatherData));
      const { context } = buildContext();
      const tool = createWeatherTool({ getContext: () => context });
      let result: DisplayWeatherResult | undefined;
      await new Promise<void>((resolve) => {
        withNavigatorLanguage("not-a-locale!!!", () => {
          tool.executor!({ location: "London" }).then((r) => {
            result = r as DisplayWeatherResult;
            resolve();
          });
        });
      });
      expect(result && "useFahrenheit" in result && result.useFahrenheit).toBe(false);
    });
  });
});
