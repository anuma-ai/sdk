/**
 * E2E test: display_weather tool
 *
 * Verifies that the model calls display_weather when asked about weather
 * and the tool executor fetches valid data from the Open-Meteo API.
 */

import { describe, it, expect } from "vitest";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createWeatherTool } from "../../src/tools/weather.js";
import { config, printResult, wrapTool, type ToolCallLog } from "./setup.js";
import type { DisplayWeatherResult } from "../../src/tools/weather.js";

const toolOpts = {
  getContext: () => null,
  getLastMessageId: () => undefined,
};

describe("display_weather", () => {
  it("fetches current weather for a known city", async () => {
    const log: ToolCallLog[] = [];
    const tool = wrapTool(createWeatherTool(toolOpts), log);

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What's the weather like in Paris right now? Use the display_weather tool.",
            },
          ],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools: [tool],
      toolChoice: "auto",
      maxToolRounds: 3,
    });

    printResult(result);

    expect(result.error).toBeNull();
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].name).toBe("display_weather");

    const raw = log[0].result;
    const weather = (typeof raw === "string" ? JSON.parse(raw) : raw) as DisplayWeatherResult;
    expect("error" in weather).toBe(false);

    if (!("error" in weather)) {
      expect(weather.location).toBe("Paris");
      expect(weather.country).toBe("France");
      expect(typeof weather.temperature).toBe("number");
      expect(typeof weather.humidity).toBe("number");
      expect(typeof weather.windSpeed).toBe("number");
      expect(typeof weather.weatherCode).toBe("number");
      expect(typeof weather.isDay).toBe("boolean");
      expect(Array.isArray(weather.forecast)).toBe(true);
      expect(weather.forecast!.length).toBe(7);
    }
  });

  it("returns a 7-day forecast with correct structure", async () => {
    const log: ToolCallLog[] = [];
    const tool = wrapTool(createWeatherTool(toolOpts), log);

    const result = await runToolLoop({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Show me the weather forecast for Tokyo. Use the display_weather tool.",
            },
          ],
        },
      ],
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools: [tool],
      toolChoice: "auto",
      maxToolRounds: 3,
    });

    printResult(result);

    expect(result.error).toBeNull();
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].name).toBe("display_weather");

    const raw = log[0].result;
    const weather = (typeof raw === "string" ? JSON.parse(raw) : raw) as DisplayWeatherResult;
    expect("error" in weather).toBe(false);

    if (!("error" in weather)) {
      expect(weather.location).toBe("Tokyo");
      expect(weather.forecast).toBeDefined();
      expect(weather.forecast!.length).toBe(7);

      for (const day of weather.forecast!) {
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof day.weatherCode).toBe("number");
        expect(typeof day.temperatureMax).toBe("number");
        expect(typeof day.temperatureMin).toBe("number");
      }
    }
  });
});
