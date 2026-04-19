import { describe, expect, it } from "vitest";

import { getInStreamErrorMessage } from "./utils";

describe("getInStreamErrorMessage", () => {
  it("detects Bifrost timeout_error and formats with type, message, trace_id", () => {
    const chunk = {
      error: {
        request_id: "req_1",
        trace_id: "trace_abc",
        message: "The request timed out. Please try again.",
        type: "timeout_error",
        code: "timeout",
      },
    };
    expect(getInStreamErrorMessage(chunk)).toBe(
      "[timeout_error timeout] The request timed out. Please try again. (trace_id: trace_abc)"
    );
  });

  it("omits the code label when it duplicates the type", () => {
    const chunk = { error: { type: "rate_limit", code: "rate_limit", message: "slow down" } };
    expect(getInStreamErrorMessage(chunk)).toBe("[rate_limit] slow down");
  });

  it("falls back to type when message is missing", () => {
    const chunk = { error: { type: "upstream_unreachable", code: "network" } };
    expect(getInStreamErrorMessage(chunk)).toBe("[upstream_unreachable network] upstream_unreachable");
  });

  it("returns null when there's no error field", () => {
    expect(getInStreamErrorMessage({ choices: [{ delta: { content: "hi" } }] })).toBeNull();
  });

  it("returns null when error is a string (Bifrost uses strings for terminal 5xx bodies)", () => {
    // `{"error":"Service error."}` is the 5xx body shape — surfaced via HTTP
    // status, not this in-stream path, so we must not treat it as an in-stream
    // event.
    expect(getInStreamErrorMessage({ error: "Service error." })).toBeNull();
  });

  it("returns null for empty error objects", () => {
    expect(getInStreamErrorMessage({ error: {} })).toBeNull();
  });

  it("returns null for non-object chunks", () => {
    expect(getInStreamErrorMessage("hello")).toBeNull();
    expect(getInStreamErrorMessage(null)).toBeNull();
    expect(getInStreamErrorMessage(undefined)).toBeNull();
  });
});
