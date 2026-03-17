/**
 * IP geolocation tool definition for the chat system.
 * Uses the public ip-api.com service (no auth required).
 */

import type { ToolConfig } from "../lib/chat/useChat/types";

interface GeolocateResult {
  ip: string;
  country: string;
  region: string;
  city: string;
  isp: string;
  lat: number;
  lon: number;
  timezone: string;
}

/**
 * Creates the IP geolocation tool.
 */
export function createIpGeolocationTool(): ToolConfig {
  return {
    type: "function",
    function: {
      name: "geolocate_ip",
      description:
        "Look up the geographic location of an IP address. Returns country, city, ISP, coordinates, and timezone.",
      parameters: {
        type: "object",
        properties: {
          ip: {
            type: "string",
            description: "IPv4 address to look up (e.g. 8.8.8.8)",
          },
        },
        required: ["ip"],
      },
    },
    executor: async (args: Record<string, unknown>): Promise<GeolocateResult | string> => {
      const ip = args.ip as string;

      try {
        const resp = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}`);
        if (!resp.ok) {
          return `Error: Geolocation failed (${resp.status})`;
        }

        const data: {
          status: string;
          message?: string;
          query: string;
          country: string;
          regionName: string;
          city: string;
          isp: string;
          lat: number;
          lon: number;
          timezone: string;
        } = await resp.json();
        if (data.status === "fail") {
          return `Error: ${data.message || "Invalid IP address"}`;
        }

        return {
          ip: data.query,
          country: data.country,
          region: data.regionName,
          city: data.city,
          isp: data.isp,
          lat: data.lat,
          lon: data.lon,
          timezone: data.timezone,
        };
      } catch (error) {
        return `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  };
}
