import { describe, expect, test } from "vitest";

import { buildConnectorErrorResult, CONNECTOR_ERROR_MARKER } from "./errors.js";

describe("buildConnectorErrorResult", () => {
  test("emits the canonical shape with the v1 marker, code, provider, and connect_url", () => {
    const result = buildConnectorErrorResult(
      "connector_not_connected",
      "gmail",
      "https://portal.example/connectors/gmail/connect?ticket=abc"
    );
    const parsed = JSON.parse(result) as Record<string, unknown>;
    expect(parsed).toEqual({
      __anuma_connector_error_v1: true,
      code: "connector_not_connected",
      provider: "gmail",
      connect_url: "https://portal.example/connectors/gmail/connect?ticket=abc",
    });
    expect(parsed[CONNECTOR_ERROR_MARKER]).toBe(true);
  });

  test("omits connect_url from JSON when not supplied", () => {
    const result = buildConnectorErrorResult("insufficient_scope", "gmail");
    const parsed = JSON.parse(result) as Record<string, unknown>;
    expect(parsed).toEqual({
      __anuma_connector_error_v1: true,
      code: "insufficient_scope",
      provider: "gmail",
    });
    expect("connect_url" in parsed).toBe(false);
  });

  test.each([
    "connector_not_connected",
    "scope_not_covered",
    "insufficient_scope",
    "upstream_unavailable",
  ] as const)("accepts %s as a code", (code) => {
    const parsed = JSON.parse(buildConnectorErrorResult(code, "gdrive")) as {
      code: string;
    };
    expect(parsed.code).toBe(code);
  });
});
