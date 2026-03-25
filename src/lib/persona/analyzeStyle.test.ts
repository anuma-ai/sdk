import { describe, it, expect, vi } from "vitest";

import { shouldAnalyzeStyle, analyzeStyle, DEFAULT_ANALYSIS_PROMPT } from "./analyzeStyle";

// ── shouldAnalyzeStyle ──

describe("shouldAnalyzeStyle", () => {
  it("returns false when opted out", () => {
    expect(
      shouldAnalyzeStyle({
        messageCount: 100,
        hasProfile: false,
        hasBeenAnalyzed: true,
        optedOut: true,
      })
    ).toBe(false);
  });

  it("returns true at exact cold start threshold", () => {
    expect(
      shouldAnalyzeStyle({
        messageCount: 5,
        hasProfile: false,
        hasBeenAnalyzed: false,
        optedOut: false,
      })
    ).toBe(true);
  });

  it("returns false below cold start threshold", () => {
    expect(
      shouldAnalyzeStyle({
        messageCount: 3,
        hasProfile: false,
        hasBeenAnalyzed: false,
        optedOut: false,
      })
    ).toBe(false);
  });

  it("returns true above cold start threshold (>= semantics)", () => {
    expect(
      shouldAnalyzeStyle({
        messageCount: 6,
        hasProfile: false,
        hasBeenAnalyzed: false,
        optedOut: false,
      })
    ).toBe(true);
  });

  it("returns true at refresh boundary", () => {
    expect(
      shouldAnalyzeStyle({
        messageCount: 20,
        hasProfile: true,
        hasBeenAnalyzed: true,
        optedOut: false,
      })
    ).toBe(true);
  });

  it("returns true at subsequent refresh boundary", () => {
    expect(
      shouldAnalyzeStyle({
        messageCount: 40,
        hasProfile: true,
        hasBeenAnalyzed: true,
        optedOut: false,
      })
    ).toBe(true);
  });

  it("returns false between refresh boundaries", () => {
    expect(
      shouldAnalyzeStyle({
        messageCount: 15,
        hasProfile: true,
        hasBeenAnalyzed: true,
        optedOut: false,
      })
    ).toBe(false);
  });

  it("cold start does not re-trigger once analyzed", () => {
    expect(
      shouldAnalyzeStyle({
        messageCount: 5,
        hasProfile: true,
        hasBeenAnalyzed: true,
        optedOut: false,
      })
    ).toBe(false);
  });

  it("returns false at messageCount 0 even with profile (0 % N === 0 guard)", () => {
    expect(
      shouldAnalyzeStyle({
        messageCount: 0,
        hasProfile: true,
        hasBeenAnalyzed: true,
        optedOut: false,
      })
    ).toBe(false);
  });

  it("respects custom thresholds", () => {
    expect(
      shouldAnalyzeStyle({
        messageCount: 10,
        hasProfile: false,
        hasBeenAnalyzed: false,
        optedOut: false,
        analyzeAfterMessages: 10,
      })
    ).toBe(true);

    expect(
      shouldAnalyzeStyle({
        messageCount: 30,
        hasProfile: true,
        hasBeenAnalyzed: true,
        optedOut: false,
        refreshEveryMessages: 30,
      })
    ).toBe(true);
  });
});

// ── analyzeStyle ──

describe("analyzeStyle", () => {
  it("calls LLM with system + numbered user messages and returns profile", async () => {
    const callLlm = vi.fn().mockResolvedValue("Casual, concise texting style.");

    const result = await analyzeStyle({
      messages: [
        { role: "user", content: "hey whats up" },
        { role: "assistant", content: "Not much!" },
        { role: "user", content: "cool cool" },
        { role: "assistant", content: "How can I help?" },
        { role: "user", content: "tell me about js" },
      ],
      callLlm,
    });

    expect(result.profile).toBe("Casual, concise texting style.");
    expect(callLlm).toHaveBeenCalledTimes(1);

    const [msgs] = callLlm.mock.calls[0]!;
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toBe(DEFAULT_ANALYSIS_PROMPT);
    expect(msgs[1].role).toBe("user");
    expect(msgs[1].content).toContain("1. hey whats up");
    expect(msgs[1].content).toContain("2. cool cool");
    expect(msgs[1].content).toContain("3. tell me about js");
  });

  it("truncates long profiles at word boundary", async () => {
    const longProfile = "word ".repeat(100); // 500 chars
    const callLlm = vi.fn().mockResolvedValue(longProfile);

    const result = await analyzeStyle({
      messages: [
        { role: "user", content: "msg1" },
        { role: "user", content: "msg2" },
        { role: "user", content: "msg3" },
      ],
      callLlm,
    });

    expect(result.profile!.length).toBeLessThanOrEqual(200);
    // Should end at a word boundary (no trailing partial word)
    expect(result.profile!.endsWith("word")).toBe(true);
  });

  it("skips when fewer than minMessages user messages", async () => {
    const callLlm = vi.fn();
    const result = await analyzeStyle({
      messages: [
        { role: "user", content: "hey" },
        { role: "assistant", content: "hi" },
        { role: "user", content: "ok" },
      ],
      callLlm,
    });

    expect(result.profile).toBeNull();
    expect(callLlm).not.toHaveBeenCalled();
  });

  it("filters out document-embedded messages", async () => {
    const callLlm = vi.fn().mockResolvedValue("concise style");

    await analyzeStyle({
      messages: [
        { role: "user", content: "hey" },
        { role: "user", content: "Here is the user's CSV data:\n```csv\na,b\n1,2\n```" },
        { role: "user", content: "hello" },
        { role: "user", content: "Here is the user's EXCEL content:\n```\nsome text\n```" },
        { role: "user", content: "hi there" },
      ],
      callLlm,
    });

    expect(callLlm).toHaveBeenCalledTimes(1);
    const userContent = callLlm.mock.calls[0]![0][1].content as string;
    expect(userContent).not.toContain("CSV");
    expect(userContent).not.toContain("EXCEL");
  });

  it("returns null on LLM failure", async () => {
    const callLlm = vi.fn().mockResolvedValue(null);

    const result = await analyzeStyle({
      messages: [
        { role: "user", content: "msg1" },
        { role: "user", content: "msg2" },
        { role: "user", content: "msg3" },
      ],
      callLlm,
    });

    expect(result.profile).toBeNull();
  });

  it("returns null when callLlm throws an exception", async () => {
    const callLlm = vi.fn().mockRejectedValue(new Error("network error"));

    const result = await analyzeStyle({
      messages: [
        { role: "user", content: "msg1" },
        { role: "user", content: "msg2" },
        { role: "user", content: "msg3" },
      ],
      callLlm,
    });

    expect(result.profile).toBeNull();
  });

  it("returns null when callLlm returns whitespace-only string", async () => {
    const callLlm = vi.fn().mockResolvedValue("   \n  ");

    const result = await analyzeStyle({
      messages: [
        { role: "user", content: "msg1" },
        { role: "user", content: "msg2" },
        { role: "user", content: "msg3" },
      ],
      callLlm,
    });

    expect(result.profile).toBeNull();
  });

  it("uses custom analysisPrompt when provided", async () => {
    const callLlm = vi.fn().mockResolvedValue("result");

    await analyzeStyle({
      messages: [
        { role: "user", content: "a" },
        { role: "user", content: "b" },
        { role: "user", content: "c" },
      ],
      callLlm,
      analysisPrompt: "Custom prompt",
    });

    expect(callLlm.mock.calls[0]![0][0].content).toBe("Custom prompt");
  });

  it("extracts messages in reverse order (most recent first for cap, returned chronological)", async () => {
    const callLlm = vi.fn().mockResolvedValue("result");

    await analyzeStyle({
      messages: [
        { role: "user", content: "old1" },
        { role: "user", content: "old2" },
        { role: "user", content: "old3" },
        { role: "user", content: "new1" },
        { role: "user", content: "new2" },
        { role: "user", content: "new3" },
      ],
      callLlm,
      maxInputMessages: 3,
    });

    const userContent = callLlm.mock.calls[0]![0][1].content as string;
    // Should contain the 3 most recent, in chronological order
    expect(userContent).toContain("1. new1");
    expect(userContent).toContain("2. new2");
    expect(userContent).toContain("3. new3");
    expect(userContent).not.toContain("old");
  });
});
