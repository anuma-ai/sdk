import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setLogger, consoleLogger, type Logger } from "../lib/logger";
import { logBackground } from "./useChatStorage";

describe("useChatStorage / logBackground", () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    setLogger(mockLogger);
  });

  afterEach(() => {
    setLogger(consoleLogger);
  });

  it("emits a warn with the [useChatStorage] prefix and merged context", () => {
    const err = new Error("boom");
    logBackground("eager vault embed (create)", { id: "vm_123" }, err);

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "[useChatStorage] eager vault embed (create) failed",
      { id: "vm_123", err }
    );
  });

  it("does not throw when the caught value is not an Error", () => {
    expect(() =>
      logBackground("server tools refresh", { reason: "x" }, "string-err")
    ).not.toThrow();
    expect(mockLogger.warn).toHaveBeenCalledWith("[useChatStorage] server tools refresh failed", {
      reason: "x",
      err: "string-err",
    });
  });
});
