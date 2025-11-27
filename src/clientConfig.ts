import type { CreateClientConfig } from "./client/client.gen";

export const BASE_URL = "https://ai-portal-dev.zetachain.com";

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: BASE_URL,
});
