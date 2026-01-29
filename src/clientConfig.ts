import type { CreateClientConfig } from "./client/client.gen";

export const BASE_URL = "https://portal.anuma-dev.ai";

export const MCP_R2_DOMAIN =
  "ai-image-mcp-images.4cf0e0ea50b97e72386fcf2f92a2d4e8.r2.cloudflarestorage.com";

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: BASE_URL,
});
