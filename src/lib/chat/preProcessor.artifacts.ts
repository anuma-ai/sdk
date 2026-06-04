/**
 * Payload shapes for the four well-known artifact `type` values emitted by
 * the SDK's built-in pre-processor factories. Renderers and wrappers both
 * import from here so the contract stays in one place.
 *
 * All shapes are JSON-serializable. Each shape is sized so that
 * `JSON.stringify(payload)` stays under 10KB for typical inputs. Wrappers
 * trim portal responses (drop hourly granular data, etc.) before emitting.
 *
 * Field shapes mirror what the portal currently returns from the matching
 * `/api/v1/preprocessors/*` endpoint — see
 * `shared/preprocessors/design.md` (Decision 3).
 */

/** Well-known `type` string for `WeatherArtifactPayload`. */
export const WEATHER_ARTIFACT_TYPE = "weather";
/** Well-known `type` string for `CryptoChartArtifactPayload`. */
export const CRYPTO_CHART_ARTIFACT_TYPE = "crypto_chart";
/** Well-known `type` string for `StockChartArtifactPayload`. */
export const STOCK_CHART_ARTIFACT_TYPE = "stock_chart";
/** Well-known `type` string for `SearchCitationsArtifactPayload`. */
export const SEARCH_CITATIONS_ARTIFACT_TYPE = "search_citations";

export type WeatherArtifactPayload = {
  forecasts: Array<{
    location: { name: string; country?: string; admin1?: string };
    current: {
      temperatureC: number;
      apparentC?: number;
      humidity?: number;
      windSpeedKmh?: number;
      weatherCode?: number;
      isDay?: boolean;
      time?: string;
      precipitation?: number;
    };
    daily?: Array<{
      date: string;
      tempMaxC: number;
      tempMinC: number;
      weatherCode?: number;
      precipitationMm?: number;
    }>;
    temperatureUnit?: string;
  }>;
};

export type CryptoChartArtifactPayload = {
  quotes: Array<{
    id: string;
    symbol: string;
    name: string;
    price: number;
    currency: string;
    change24h?: number;
    marketCap?: number;
  }>;
};

export type StockChartArtifactPayload = {
  quotes: Array<{
    symbol: string;
    name?: string;
    exchange?: string;
    currency?: string;
    price: number;
    change?: number;
    percentChange?: number;
  }>;
};

export type SearchCitationsArtifactPayload = {
  results: Array<{ title: string; url: string; snippet: string }>;
};
