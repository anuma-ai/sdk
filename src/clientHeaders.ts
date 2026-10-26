import type { Config } from "./client/core/types.gen";

export function normalizeHeaders(headers: Config["headers"]) {
  if (headers instanceof Headers || Array.isArray(headers)) {
    const normalized = Object.create(null) as Record<string, string>;
    new Headers(headers).forEach((value, name) => {
      normalized[name] = value;
    });
    return normalized;
  }
  return headers;
}
