import { describe, expect, it, vi } from "vitest";

import type { StoredConversationSummary, StoredMessage } from "../db/chat/types";

import {
  callSummarizationLlm,
  estimateMessagesTokens,
  estimateTokens,
  progressiveSummarize,
  splitMessagesAtThreshold,
  summaryToSystemMessage,
} from "./summarize";

/** Helper to create a minimal StoredMessage for testing */
function makeMsg(id: string, role: "user" | "assistant" | "system", content: string): StoredMessage {
  return {
    uniqueId: id,
    conversationId: "conv-1",
    role,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
    model: "test-model",
    fileIds: [],
  } as StoredMessage;
}

/** Helper to create a message with a specific token count (chars = tokens * 4) */
function makeMsgWithTokens(id: string, role: "user" | "assistant", tokens: number): StoredMessage {
  return makeMsg(id, role, "x".repeat(tokens * 4));
}

describe("estimateTokens", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("uses chars/4 approximation", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2); // ceil(5/4)
    expect(estimateTokens("a".repeat(100))).toBe(25);
  });

  it("rounds up for non-divisible lengths", () => {
    expect(estimateTokens("abc")).toBe(1); // ceil(3/4)
    expect(estimateTokens("ab")).toBe(1); // ceil(2/4)
    expect(estimateTokens("a")).toBe(1); // ceil(1/4)
  });
});

describe("estimateMessagesTokens", () => {
  it("returns 0 for empty array", () => {
    expect(estimateMessagesTokens([])).toBe(0);
  });

  it("sums token estimates across messages including per-message overhead", () => {
    const msgs = [
      makeMsg("1", "user", "a".repeat(40)), // 10 content tokens + 4 overhead = 14
      makeMsg("2", "assistant", "b".repeat(80)), // 20 content tokens + 4 overhead = 24
    ];
    expect(estimateMessagesTokens(msgs)).toBe(38); // 14 + 24
  });
});

describe("splitMessagesAtThreshold", () => {
  it("returns all messages in window when count <= minWindowMessages", () => {
    const msgs = [makeMsg("1", "user", "hello"), makeMsg("2", "assistant", "hi")];
    const result = splitMessagesAtThreshold(msgs, 1, 4);
    expect(result.toSummarize).toHaveLength(0);
    expect(result.window).toEqual(msgs);
  });

  it("returns all messages in window when everything fits under threshold", () => {
    const msgs = [
      makeMsgWithTokens("1", "user", 10),
      makeMsgWithTokens("2", "assistant", 10),
      makeMsgWithTokens("3", "user", 10),
      makeMsgWithTokens("4", "assistant", 10),
      makeMsgWithTokens("5", "user", 10),
    ];
    const result = splitMessagesAtThreshold(msgs, 100, 2);
    expect(result.toSummarize).toHaveLength(0);
    expect(result.window).toHaveLength(5);
  });

  it("splits messages when over threshold", () => {
    const msgs = [
      makeMsgWithTokens("1", "user", 100),
      makeMsgWithTokens("2", "assistant", 100),
      makeMsgWithTokens("3", "user", 100),
      makeMsgWithTokens("4", "assistant", 100),
      makeMsgWithTokens("5", "user", 100),
    ];
    // Threshold 250: walking backwards, msgs 5+4+3 = 300 > 250, but need minWindow=2
    // At i=2 (msg3): cumulative = 200 (msg5+msg4), adding msg3 = 300 > 250, and window has 2 msgs
    const result = splitMessagesAtThreshold(msgs, 250, 2);
    expect(result.toSummarize.map((m) => m.uniqueId)).toEqual(["1", "2", "3"]);
    expect(result.window.map((m) => m.uniqueId)).toEqual(["4", "5"]);
  });

  it("respects minWindowMessages even when over threshold", () => {
    const msgs = [
      makeMsgWithTokens("1", "user", 100),
      makeMsgWithTokens("2", "assistant", 100),
      makeMsgWithTokens("3", "user", 100),
      makeMsgWithTokens("4", "assistant", 100),
    ];
    // Threshold 50: very small, but minWindow=4 means all stay in window
    const result = splitMessagesAtThreshold(msgs, 50, 4);
    expect(result.toSummarize).toHaveLength(0);
    expect(result.window).toHaveLength(4);
  });

  it("places threshold-breaking message in toSummarize (conservative)", () => {
    const msgs = [
      makeMsgWithTokens("1", "user", 50),
      makeMsgWithTokens("2", "assistant", 50),
      makeMsgWithTokens("3", "user", 50),
      makeMsgWithTokens("4", "assistant", 50),
      makeMsgWithTokens("5", "user", 50),
      makeMsgWithTokens("6", "assistant", 50),
    ];
    // Each message = 50 content + 4 overhead = 54 tokens
    // Threshold 162: walking backwards from msg6
    // msg6=54, msg5=108, msg4=162 (exactly at threshold, not over)
    // msg3: 162+54=216 > 162, and window has 3 msgs >= minWindow=2 → cutoff at i=2+1=3
    const result = splitMessagesAtThreshold(msgs, 162, 2);
    expect(result.toSummarize.map((m) => m.uniqueId)).toEqual(["1", "2", "3"]);
    expect(result.window.map((m) => m.uniqueId)).toEqual(["4", "5", "6"]);
  });

  it("handles single message above threshold", () => {
    const msgs = [
      makeMsgWithTokens("1", "user", 10),
      makeMsgWithTokens("2", "assistant", 10),
      makeMsgWithTokens("3", "user", 1000),
    ];
    // Threshold 5, minWindow=2: msg3 alone is 1000 > 5, but need 2 msgs in window first
    // At i=1: cumulative = 1000 (msg3), adding msg2 = 1010 > 5, window has 2 msgs → cutoff at 2
    const result = splitMessagesAtThreshold(msgs, 5, 2);
    expect(result.toSummarize.map((m) => m.uniqueId)).toEqual(["1", "2"]);
    expect(result.window.map((m) => m.uniqueId)).toEqual(["3"]);
  });
});

describe("progressiveSummarize", () => {
  const makeCallLlm = (response: string) => vi.fn().mockResolvedValue(response);

  it("returns messages verbatim when under threshold (no cached summary)", async () => {
    const msgs = [makeMsgWithTokens("1", "user", 10), makeMsgWithTokens("2", "assistant", 10)];
    const callLlm = makeCallLlm("summary");

    const result = await progressiveSummarize({
      cachedSummary: null,
      unsummarizedMessages: msgs,
      tokenThreshold: 100,
      minWindowMessages: 2,
      callLlm,
      model: "test-model",
    });

    expect(result.didSummarize).toBe(false);
    expect(result.summary).toBeNull();
    expect(result.windowMessages).toEqual(msgs);
    expect(callLlm).not.toHaveBeenCalled();
  });

  it("returns messages verbatim when under threshold (with cached summary)", async () => {
    const msgs = [makeMsgWithTokens("3", "user", 10)];
    const cached: StoredConversationSummary = {
      uniqueId: "s1",
      conversationId: "conv-1",
      summary: "Previous conversation about AI",
      summarizedUpTo: "2",
      tokenCount: 20,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const callLlm = makeCallLlm("summary");

    const result = await progressiveSummarize({
      cachedSummary: cached,
      unsummarizedMessages: msgs,
      tokenThreshold: 100, // 20 (cached) + 10 (msg) = 30 < 100
      minWindowMessages: 2,
      callLlm,
      model: "test-model",
    });

    expect(result.didSummarize).toBe(false);
    expect(result.summary).toBe("Previous conversation about AI");
    expect(result.summarizedUpTo).toBe("2");
    expect(callLlm).not.toHaveBeenCalled();
  });

  it("calls LLM and returns summary when over threshold", async () => {
    const msgs = [
      makeMsgWithTokens("1", "user", 100),
      makeMsgWithTokens("2", "assistant", 100),
      makeMsgWithTokens("3", "user", 100),
      makeMsgWithTokens("4", "assistant", 100),
      makeMsgWithTokens("5", "user", 100),
      makeMsgWithTokens("6", "assistant", 100),
    ];
    const callLlm = makeCallLlm("The user discussed various topics with the AI.");

    const result = await progressiveSummarize({
      cachedSummary: null,
      unsummarizedMessages: msgs,
      tokenThreshold: 250,
      minWindowMessages: 2,
      callLlm,
      model: "gemini-flash",
    });

    expect(result.didSummarize).toBe(true);
    expect(result.summary).toBe("The user discussed various topics with the AI.");
    expect(result.windowMessages.length).toBeGreaterThan(0);
    expect(result.windowMessages.length).toBeLessThan(msgs.length);
    expect(callLlm).toHaveBeenCalledOnce();
    expect(callLlm).toHaveBeenCalledWith(expect.stringContaining("Current summary:"), "gemini-flash");
  });

  it("sets summarizedUpTo to the last summarized message ID", async () => {
    const msgs = [
      makeMsgWithTokens("msg-1", "user", 200),
      makeMsgWithTokens("msg-2", "assistant", 200),
      makeMsgWithTokens("msg-3", "user", 200),
      makeMsgWithTokens("msg-4", "assistant", 200),
    ];
    const callLlm = makeCallLlm("summary text");

    const result = await progressiveSummarize({
      cachedSummary: null,
      unsummarizedMessages: msgs,
      tokenThreshold: 250,
      minWindowMessages: 2,
      callLlm,
      model: "test",
    });

    expect(result.didSummarize).toBe(true);
    // The summarizedUpTo should be the last message in toSummarize, not in window
    expect(result.summarizedUpTo).toBeDefined();
    expect(msgs.map((m) => m.uniqueId)).toContain(result.summarizedUpTo);
  });

  it("falls back to verbatim on LLM failure", async () => {
    const msgs = [
      makeMsgWithTokens("1", "user", 200),
      makeMsgWithTokens("2", "assistant", 200),
      makeMsgWithTokens("3", "user", 200),
      makeMsgWithTokens("4", "assistant", 200),
    ];
    const callLlm = vi.fn().mockRejectedValue(new Error("API error"));

    const result = await progressiveSummarize({
      cachedSummary: null,
      unsummarizedMessages: msgs,
      tokenThreshold: 100,
      minWindowMessages: 2,
      callLlm,
      model: "test",
    });

    expect(result.didSummarize).toBe(false);
    expect(result.windowMessages).toEqual(msgs);
    expect(callLlm).toHaveBeenCalledOnce();
  });

  it("includes existing summary in the prompt when cached summary exists", async () => {
    const msgs = [
      makeMsgWithTokens("3", "user", 200),
      makeMsgWithTokens("4", "assistant", 200),
      makeMsgWithTokens("5", "user", 200),
      makeMsgWithTokens("6", "assistant", 200),
    ];
    const cached: StoredConversationSummary = {
      uniqueId: "s1",
      conversationId: "conv-1",
      summary: "User asked about quantum computing.",
      summarizedUpTo: "2",
      tokenCount: 200,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const callLlm = makeCallLlm("Extended summary about quantum computing.");

    await progressiveSummarize({
      cachedSummary: cached,
      unsummarizedMessages: msgs,
      tokenThreshold: 300,
      minWindowMessages: 2,
      callLlm,
      model: "test",
    });

    expect(callLlm).toHaveBeenCalledWith(
      expect.stringContaining("User asked about quantum computing."),
      "test"
    );
  });

  it("adjusts window budget to account for cached summary tokens", async () => {
    // 4 messages at 100 tokens each (+ 4 overhead = 104 each)
    const msgs = [
      makeMsgWithTokens("1", "user", 100),
      makeMsgWithTokens("2", "assistant", 100),
      makeMsgWithTokens("3", "user", 100),
      makeMsgWithTokens("4", "assistant", 100),
    ];
    const cached: StoredConversationSummary = {
      uniqueId: "s1",
      conversationId: "conv-1",
      summary: "x".repeat(800), // 200 cached tokens
      summarizedUpTo: "0",
      tokenCount: 200,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const callLlm = makeCallLlm("New summary.");

    // tokenThreshold=400, cachedTokens=200 → window budget = 200
    // 4 messages at 104 tokens each = 416 total → exceeds threshold (200 + 416 = 616 > 400)
    // Window budget = 400 - 200 = 200. Walking backwards: msg4=104, msg3=208 > 200
    // So window = [msg4], toSummarize = [msg1, msg2, msg3]
    const result = await progressiveSummarize({
      cachedSummary: cached,
      unsummarizedMessages: msgs,
      tokenThreshold: 400,
      minWindowMessages: 1,
      callLlm,
      model: "test",
    });

    expect(result.didSummarize).toBe(true);
    // Window should be smaller because the cached summary eats into the budget
    expect(result.windowMessages.length).toBeLessThan(msgs.length);
  });

  it("excludes system messages from the summarization prompt", async () => {
    const msgs = [
      makeMsg("1", "system", "You are a helpful assistant"),
      makeMsgWithTokens("2", "user", 200),
      makeMsgWithTokens("3", "assistant", 200),
      makeMsgWithTokens("4", "user", 200),
      makeMsgWithTokens("5", "assistant", 200),
      makeMsgWithTokens("6", "user", 200),
    ];
    const callLlm = makeCallLlm("Summary without system prompt.");

    await progressiveSummarize({
      cachedSummary: null,
      unsummarizedMessages: msgs,
      tokenThreshold: 300,
      minWindowMessages: 2,
      callLlm,
      model: "test",
    });

    // The prompt should NOT contain the system message content
    const promptArg = callLlm.mock.calls[0]?.[0] as string;
    expect(promptArg).not.toContain("You are a helpful assistant");
    // But it should contain user/assistant messages
    expect(promptArg).toContain("Human:");
  });

  it("returns no-op when all messages fit in window due to minWindowMessages", async () => {
    // 5 messages but minWindow=5, so nothing can be summarized
    const msgs = [
      makeMsgWithTokens("1", "user", 200),
      makeMsgWithTokens("2", "assistant", 200),
      makeMsgWithTokens("3", "user", 200),
      makeMsgWithTokens("4", "assistant", 200),
      makeMsgWithTokens("5", "user", 200),
    ];
    const callLlm = makeCallLlm("summary");

    const result = await progressiveSummarize({
      cachedSummary: null,
      unsummarizedMessages: msgs,
      tokenThreshold: 100, // Way under, but minWindow prevents splitting
      minWindowMessages: 5,
      callLlm,
      model: "test",
    });

    expect(result.didSummarize).toBe(false);
    expect(callLlm).not.toHaveBeenCalled();
  });
});

describe("summaryToSystemMessage", () => {
  it("creates a system message with the summary text", () => {
    const result = summaryToSystemMessage("User discussed AI ethics.");
    expect(result.role).toBe("system");
    expect(result.content).toEqual([
      {
        type: "text",
        text: expect.stringContaining("User discussed AI ethics."),
      },
    ]);
  });

  it("includes context prefix in the message", () => {
    const result = summaryToSystemMessage("test summary");
    const text = (result.content as Array<{ text: string }>)[0].text;
    expect(text).toContain("Conversation summary");
    expect(text).toContain("older messages have been summarized");
  });
});

describe("callSummarizationLlm", () => {
  it("sends correct request format and parses string content", async () => {
    const mockResponse = {
      choices: [{ message: { content: "This is a summary." } }],
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await callSummarizationLlm("summarize this", "gemini-flash", "test-token", "https://api.test");

    expect(result).toBe("This is a summary.");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.test/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          model: "gemini-flash",
          stream: false,
          messages: [{ role: "user", content: "summarize this" }],
        }),
        signal: expect.any(AbortSignal),
      })
    );

    fetchSpy.mockRestore();
  });

  it("parses array content format", async () => {
    const mockResponse = {
      choices: [{ message: { content: [{ text: "Part 1 " }, { text: "Part 2" }] } }],
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await callSummarizationLlm("prompt", "model", "token");
    expect(result).toBe("Part 1 Part 2");

    fetchSpy.mockRestore();
  });

  it("throws on non-ok response", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response);

    await expect(callSummarizationLlm("prompt", "model", "token")).rejects.toThrow(
      "Summarization LLM call failed: 500 Internal Server Error"
    );

    fetchSpy.mockRestore();
  });

  it("throws on unexpected response format", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ unexpected: true }),
    } as Response);

    await expect(callSummarizationLlm("prompt", "model", "token")).rejects.toThrow(
      "Unexpected API response format"
    );

    fetchSpy.mockRestore();
  });

  it("aborts fetch when timeout is exceeded", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          (options as RequestInit).signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        })
    );

    const promise = callSummarizationLlm("prompt", "model", "token");
    vi.advanceTimersByTime(10_000);

    await expect(promise).rejects.toThrow("aborted");

    fetchSpy.mockRestore();
    vi.useRealTimers();
  });
});
