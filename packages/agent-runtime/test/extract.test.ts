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
      // Synthesized from the tool-result index so it matches the
      // `tool_call_id` on the corresponding tool-role message.
      callId: "call_0",
      error: {
        code: "connector_not_connected",
        provider: "gmail",
        connectUrl: "https://portal.example/connectors/gmail/connect?ticket=t1",
        missingScopes: undefined,
        required: undefined,
      },
    });
  });

  test("assigns each error a callId matching its tool-result index", () => {
    const a = buildConnectorErrorResult("connector_not_connected", "gmail", "u1");
    const b = buildConnectorErrorResult("scope_not_covered", "gdrive", "u2");
    const errors = extractConnectorToolErrors([
      { name: "gmail_search_messages", result: a },
      { name: "gdrive_search", result: b },
    ]);
    expect(errors).toHaveLength(2);
    expect(errors[0].callId).toBe("call_0");
    expect(errors[1].callId).toBe("call_1");
  });

  test("preserves the result index even when non-error entries sit between connector errors", () => {
    const err = buildConnectorErrorResult("connector_not_connected", "gmail", "u1");
    const errors = extractConnectorToolErrors([
      { name: "noise", result: "plain text" },
      { name: "gmail_search_messages", result: err },
    ]);
    expect(errors).toHaveLength(1);
    // Index 1 in the input array — not 0 — so consumers can correlate
    // back to the matching tool-role message.
    expect(errors[0].callId).toBe("call_1");
  });

  test("surfaces missingScopes from scope_not_covered payloads", () => {
    const result = buildConnectorErrorResult(
      "scope_not_covered",
      "gdrive",
      "https://portal.example/connectors/gdrive/connect?ticket=t2",
      { missingScopes: ["https://www.googleapis.com/auth/drive.readonly"] }
    );
    const errors = extractConnectorToolErrors([{ name: "gdrive_search", result }]);
    expect(errors[0].error.missingScopes).toEqual([
      "https://www.googleapis.com/auth/drive.readonly",
    ]);
  });

  test("surfaces required from insufficient_scope payloads", () => {
    const result = buildConnectorErrorResult("insufficient_scope", "gmail", undefined, {
      required: "connector:gmail:send",
    });
    const errors = extractConnectorToolErrors([{ name: "gmail_send_message", result }]);
    expect(errors[0].error.required).toBe("connector:gmail:send");
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
