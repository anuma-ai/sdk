import { describe, expect, test } from "vitest";

import { buildConnectorErrorResult, CONNECTOR_ERROR_MARKER } from "./errors.js";

describe("buildConnectorErrorResult", () => {
  test("emits the canonical shape with the v1 marker, code, and provider", () => {
    const result = buildConnectorErrorResult("connector_not_connected", "gmail");
    const parsed = JSON.parse(result) as Record<string, unknown>;
    expect(parsed).toEqual({
      __anuma_connector_error_v1: true,
      code: "connector_not_connected",
      provider: "gmail",
    });
    expect(parsed[CONNECTOR_ERROR_MARKER]).toBe(true);
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

  test("serializes missing_scopes when extras.missingScopes is supplied", () => {
    const parsed = JSON.parse(
      buildConnectorErrorResult("scope_not_covered", "gdrive", {
        missingScopes: ["https://www.googleapis.com/auth/drive.readonly"],
      })
    ) as Record<string, unknown>;
    expect(parsed.missing_scopes).toEqual(["https://www.googleapis.com/auth/drive.readonly"]);
  });

  test("serializes required when extras.required is supplied", () => {
    const parsed = JSON.parse(
      buildConnectorErrorResult("insufficient_scope", "gmail", {
        required: "connector:gmail:send",
      })
    ) as Record<string, unknown>;
    expect(parsed.required).toBe("connector:gmail:send");
  });

  test("omits missing_scopes and required when extras are not supplied", () => {
    const parsed = JSON.parse(
      buildConnectorErrorResult("connector_not_connected", "gmail")
    ) as Record<string, unknown>;
    expect("missing_scopes" in parsed).toBe(false);
    expect("required" in parsed).toBe(false);
  });
});
