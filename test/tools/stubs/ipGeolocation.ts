import type { ToolConfig } from "../../../src/lib/chat/useChat/types";

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

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
    executor: async (args: Record<string, unknown>) => {
      const match = IPV4.exec(String(args.ip));
      if (!match || match.slice(1).some((octet) => Number(octet) > 255)) {
        return "Error: Invalid IP address";
      }
      return {
        ip: args.ip,
        country: "United States",
        region: "Virginia",
        city: "Ashburn",
        isp: "Google LLC",
        lat: 39.03,
        lon: -77.5,
        timezone: "America/New_York",
      };
    },
  };
}
