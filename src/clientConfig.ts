import type { CreateClientConfig } from "./client/client.gen";

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: "https://ai-portal-dev.zetachain.com",
});
