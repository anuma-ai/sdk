import { describe, expect, it, vi } from "vitest";

import type { AccumulatedToolCall, AnswerSummary } from "./types";
import { executeToolCall, getInStreamErrorMessage, mergeAnswerSummary } from "./utils";

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
    expect(getInStreamErrorMessage(chunk)).toBe(
      "[upstream_unreachable network] upstream_unreachable"
    );
  });

  it("returns null when there's no error field", () => {
    expect(getInStreamErrorMessage({ choices: [{ delta: { content: "hi" } }] })).toBeNull();
  });

  it("returns null when error is a string (Bifrost uses strings for terminal 5xx bodies)", () => {
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

describe("executeToolCall abort handling", () => {
  it("stops waiting on a never-settling executor with no timeout when aborted", async () => {
    const controller = new AbortController();
    const executor = vi.fn(() => new Promise<never>(() => {}));
    const pending = executeToolCall(makeToolCall("{}"), executor, Infinity, controller.signal);
    controller.abort();
    await expect(pending).resolves.toEqual({
      error: "Tool execution cancelled",
      errorType: "cancelled",
    });
  });

  it("stops waiting on a slow executor with a finite timeout when aborted", async () => {
    const controller = new AbortController();
    const executor = vi.fn(() => new Promise<never>(() => {}));
    const pending = executeToolCall(makeToolCall("{}"), executor, 60_000, controller.signal);
    controller.abort();
    const result = await pending;
    expect(result.errorType).toBe("cancelled");
  });

  it("does not run the executor when already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const executor = vi.fn();
    const result = await executeToolCall(makeToolCall("{}"), executor, 1000, controller.signal);
    expect(result.errorType).toBe("cancelled");
    expect(executor).not.toHaveBeenCalled();
  });

  it("returns the result and removes the abort listener when the executor settles", async () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const result = await executeToolCall(
      makeToolCall("{}"),
      vi.fn().mockResolvedValue("ok"),
      Infinity,
      controller.signal
    );
    expect(result).toEqual({ result: "ok" });
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("stops waiting when the executor aborts the signal synchronously and never settles", async () => {
    const controller = new AbortController();
    const executor = vi.fn(() => {
      controller.abort();
      return new Promise<never>(() => {});
    });
    const result = await executeToolCall(makeToolCall("{}"), executor, Infinity, controller.signal);
    expect(result.errorType).toBe("cancelled");
  });

  it("passes the signal to the executor", async () => {
    const controller = new AbortController();
    const executor = vi.fn().mockResolvedValue("ok");
    await executeToolCall(makeToolCall("{}"), executor, Infinity, controller.signal);
    expect(executor).toHaveBeenCalledWith({}, controller.signal);
  });
});

describe("mergeAnswerSummary", () => {
  const summary = (durationMs: number, sources: AnswerSummary["sources"]): AnswerSummary => ({
    duration_ms: durationMs,
    source_count: sources.filter((s) => s.status === "ok").length,
    sources,
  });

  it("keeps the best status per source name", () => {
    const merged = mergeAnswerSummary(
      summary(1, [
        { name: "a", status: "canceled" },
        { name: "b", status: "ok" },
        { name: "c", status: "failed" },
      ]),
      summary(2, [
        { name: "a", status: "rejected" },
        { name: "b", status: "failed" },
        { name: "c", status: "ok" },
      ])
    );
    expect(merged?.sources).toEqual([
      { name: "a", status: "rejected" },
      { name: "b", status: "ok" },
      { name: "c", status: "ok" },
    ]);
  });

  it("sorts the union by name, sums durations and recounts ok sources", () => {
    const merged = mergeAnswerSummary(
      summary(1000, [{ name: "web", status: "ok" }]),
      summary(250, [
        { name: "web", status: "ok" },
        { name: "maps", status: "failed" },
        { name: "calendar", status: "ok" },
      ])
    );
    expect(merged).toEqual({
      duration_ms: 1250,
      source_count: 2,
      sources: [
        { name: "calendar", status: "ok" },
        { name: "maps", status: "failed" },
        { name: "web", status: "ok" },
      ],
    });
  });

  it("returns the other side unchanged when one side is undefined", () => {
    const only = summary(5, [{ name: "web", status: "ok" }]);
    expect(mergeAnswerSummary(undefined, only)).toBe(only);
    expect(mergeAnswerSummary(only, undefined)).toBe(only);
    expect(mergeAnswerSummary(undefined, undefined)).toBeUndefined();
  });
});
