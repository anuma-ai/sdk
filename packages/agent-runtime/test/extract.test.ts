import { buildConnectorErrorResult } from "@anuma/sdk/tools";
import { describe, expect, test } from "vitest";

import { extractConnectorToolErrors } from "../src/runAgentRequest.js";

describe("extractConnectorToolErrors", () => {
  test("lifts a connector_not_connected result into a ToolError", () => {
    const result = buildConnectorErrorResult(
      "connector_not_connected",
      "gmail",
      "https://portal.example/connectors/gmail/connect?ticket=t1"
    );
    const errors = extractConnectorToolErrors([{ name: "gmail_search_messages", result }]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      toolName: "gmail_search_messages",
      callId: "",
      error: {
        code: "connector_not_connected",
        provider: "gmail",
        connectUrl: "https://portal.example/connectors/gmail/connect?ticket=t1",
        missingScopes: undefined,
        required: undefined,
      },
    });
  });

  test("skips results without the canonical marker", () => {
    const errors = extractConnectorToolErrors([
      { name: "noise", result: JSON.stringify({ code: "connector_not_connected" }) },
      {
        name: "search",
        result: JSON.stringify({
          messages: [{ subject: "An error occurred at the conference" }],
        }),
      },
    ]);
    expect(errors).toEqual([]);
  });

  test("skips entries with non-JSON string content", () => {
    const errors = extractConnectorToolErrors([
      { name: "x", result: "not json" },
      { name: "y", result: "Error: upstream returned 500" },
    ]);
    expect(errors).toEqual([]);
  });

  test("skips entries whose result is not a string", () => {
    const errors = extractConnectorToolErrors([
      { name: "x", result: { foo: "bar" } },
      { name: "y", result: null },
      { name: "z", result: [1, 2, 3] },
    ]);
    expect(errors).toEqual([]);
  });

  test("returns [] when no results are passed", () => {
    expect(extractConnectorToolErrors(undefined)).toEqual([]);
    expect(extractConnectorToolErrors([])).toEqual([]);
  });

  test("walks every tool result, returning multiple errors when present", () => {
    const a = buildConnectorErrorResult("connector_not_connected", "gmail", "u1");
    const b = buildConnectorErrorResult("scope_not_covered", "gdrive", "u2");
    const errors = extractConnectorToolErrors([
      { name: "gmail_search_messages", result: a },
      { name: "gdrive_search", result: b },
    ]);
    expect(errors).toHaveLength(2);
    expect(errors[0].error.code).toBe("connector_not_connected");
    expect(errors[1].error.code).toBe("scope_not_covered");
    expect(errors[1].toolName).toBe("gdrive_search");
  });
});
