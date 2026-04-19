import { describe, expect, it, vi } from "vitest";

import type { AccumulatedToolCall } from "./types";
import { executeToolCall, getInStreamErrorMessage } from "./utils";

function makeToolCall(args: string): AccumulatedToolCall {
  return {
    id: "call_1",
    type: "function",
    name: "test_tool",
    arguments: args,
    status: "pending",
  };
}

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

describe("executeToolCall argument parsing", () => {
  it("passes well-formed JSON through to the executor unchanged", async () => {
    const executor = vi.fn().mockResolvedValue("ok");
    const result = await executeToolCall(
      makeToolCall('{"path":"slides.json","content":"hi"}'),
      executor
    );
    expect(result).toEqual({ result: "ok" });
    expect(executor).toHaveBeenCalledWith({ path: "slides.json", content: "hi" });
  });

  it("repairs trailing commas (common LLM mistake) and executes", async () => {
    const executor = vi.fn().mockResolvedValue("ok");
    const result = await executeToolCall(
      makeToolCall('{"path":"slides.json","content":"hi",}'),
      executor
    );
    expect(result).toEqual({ result: "ok" });
    expect(executor).toHaveBeenCalledWith({ path: "slides.json", content: "hi" });
  });

  it("repairs single-quoted keys/values", async () => {
    const executor = vi.fn().mockResolvedValue("ok");
    const result = await executeToolCall(
      makeToolCall("{'path': 'slides.json', 'content': 'hi'}"),
      executor
    );
    expect(result).toEqual({ result: "ok" });
    expect(executor).toHaveBeenCalledWith({ path: "slides.json", content: "hi" });
  });

  it("repairs unquoted keys", async () => {
    const executor = vi.fn().mockResolvedValue("ok");
    const result = await executeToolCall(makeToolCall('{path: "slides.json"}'), executor);
    expect(result).toEqual({ result: "ok" });
    expect(executor).toHaveBeenCalledWith({ path: "slides.json" });
  });

  it("returns a parse error when repair cannot salvage the string", async () => {
    const executor = vi.fn();
    const result = await executeToolCall(makeToolCall("not json at all {{{"), executor);
    expect(result.error).toMatch(/Failed to parse tool arguments/);
    expect(result.errorType).toBe("parse");
    expect(executor).not.toHaveBeenCalled();
  });

  it("rejects JSON arrays (tools expect objects)", async () => {
    const executor = vi.fn();
    const result = await executeToolCall(makeToolCall('["a","b"]'), executor);
    expect(result.error).toMatch(/must be a JSON object.*array/);
    expect(result.errorType).toBe("parse");
    expect(executor).not.toHaveBeenCalled();
  });
});
