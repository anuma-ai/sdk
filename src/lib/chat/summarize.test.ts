import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StoredConversationSummary, StoredMessage } from "../db/chat/types";
import {
  getConversationSummaryOp,
  upsertConversationSummaryOp,
} from "../db/chat/summaryOperations";

import {
  callSummarizationLlm,
  estimateMessagesTokens,
  estimateTokens,
  maybeSummarizeHistory,
  MAX_MESSAGES_PER_SUMMARIZATION,
  progressiveSummarize,
  splitMessagesAtThreshold,
  summarizationLocks,
  summaryToSystemMessage,
} from "./summarize";

// Mock DB operations for maybeSummarizeHistory tests
vi.mock("../db/chat/summaryOperations", () => ({
  createSummaryContext: vi.fn(() => ({ database: {}, summariesCollection: {} })),
  getConversationSummaryOp: vi.fn(() => Promise.resolve(null)),
  upsertConversationSummaryOp: vi.fn(() => Promise.resolve()),
  deleteConversationSummaryOp: vi.fn(() => Promise.resolve()),
}));

/** Helper to create a minimal StoredMessage for testing */
function makeMsg(
  id: string,
  role: "user" | "assistant" | "system",
  content: string
): StoredMessage {
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

  it("handles single message above threshold — respects minWindowMessages", () => {
    const msgs = [
      makeMsgWithTokens("1", "user", 10),
      makeMsgWithTokens("2", "assistant", 10),
      makeMsgWithTokens("3", "user", 1000),
    ];
    // Threshold 5, minWindow=2: every msg exceeds threshold, but we need at least 2 in window.
    // Walking backwards: i=2 (1004>5, window would be 0 < 2 → skip),
    //   i=1 (1018>5, window would be 1 < 2 → skip),
    //   i=0 (1032>5, window would be 2 >= 2 → cutoff=1)
    // window = [msg2, msg3], toSummarize = [msg1]
    const result = splitMessagesAtThreshold(msgs, 5, 2);
    expect(result.toSummarize.map((m) => m.uniqueId)).toEqual(["1"]);
    expect(result.window.map((m) => m.uniqueId)).toEqual(["2", "3"]);
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
    expect(callLlm).toHaveBeenCalledWith(
      expect.stringContaining("Current summary:"),
      "gemini-flash"
    );
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

    const result = await callSummarizationLlm(
      "summarize this",
      "gemini-flash",
      "test-token",
      "https://api.test"
    );

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

    await expect(promise).rejects.toThrow("Summarization timeout");

    fetchSpy.mockRestore();
    vi.useRealTimers();
  });
});

describe("summarizationLocks", () => {
  it("is exported as a Map for concurrent summarization with await support", () => {
    expect(summarizationLocks).toBeInstanceOf(Map);
    expect(summarizationLocks.size).toBe(0);
  });
});

describe("progressiveSummarize — message cap per summarization", () => {
  const makeCallLlm = (response: string) => vi.fn().mockResolvedValue(response);

  it("caps toSummarize at MAX_MESSAGES_PER_SUMMARIZATION and moves excess to window", async () => {
    // Create more messages than the cap
    const msgCount = MAX_MESSAGES_PER_SUMMARIZATION + 10;
    const msgs = Array.from({ length: msgCount }, (_, i) =>
      makeMsgWithTokens(`msg-${i}`, i % 2 === 0 ? "user" : "assistant", 50)
    );
    const callLlm = makeCallLlm("Summarized.");

    const result = await progressiveSummarize({
      cachedSummary: null,
      unsummarizedMessages: msgs,
      tokenThreshold: 200, // Very small to force most messages into toSummarize
      minWindowMessages: 2,
      callLlm,
      model: "test",
    });

    expect(result.didSummarize).toBe(true);
    // The window should contain more messages than just minWindowMessages
    // because excess messages from the cap are moved to the window
    expect(result.windowMessages.length).toBeGreaterThan(2);
    // The prompt's "New lines of conversation" section should only contain
    // at most MAX_MESSAGES_PER_SUMMARIZATION messages (exclude the template example)
    const promptArg = callLlm.mock.calls[0]?.[0] as string;
    const newLinesSection = promptArg
      .split("New lines of conversation:\n")
      .pop()!
      .split("\n\nNew summary:")[0];
    const conversationLines = newLinesSection
      .split("\n")
      .filter((l: string) => l.startsWith("Human:") || l.startsWith("AI:"));
    expect(conversationLines.length).toBeLessThanOrEqual(MAX_MESSAGES_PER_SUMMARIZATION);
  });

  it("does not cap when toSummarize is within limit", async () => {
    const msgs = [
      makeMsgWithTokens("1", "user", 100),
      makeMsgWithTokens("2", "assistant", 100),
      makeMsgWithTokens("3", "user", 100),
      makeMsgWithTokens("4", "assistant", 100),
      makeMsgWithTokens("5", "user", 100),
      makeMsgWithTokens("6", "assistant", 100),
    ];
    const callLlm = makeCallLlm("Summary.");

    const result = await progressiveSummarize({
      cachedSummary: null,
      unsummarizedMessages: msgs,
      tokenThreshold: 250,
      minWindowMessages: 2,
      callLlm,
      model: "test",
    });

    expect(result.didSummarize).toBe(true);
    // 6 messages < MAX_MESSAGES_PER_SUMMARIZATION, so no capping occurs
    // Window should be the normal split result
    expect(result.windowMessages.length).toBeLessThan(msgs.length);
  });
});

describe("progressiveSummarize — degenerate summary growth (H2 scenario)", () => {
  const makeCallLlm = (response: string) => vi.fn().mockResolvedValue(response);

  it("still summarizes when cachedTokens consume most of the budget (windowBudget near 0)", async () => {
    // Simulates H2 scenario: cached summary is 3500 tokens, threshold is 4000
    // windowBudget = max(0, 4000 - 3500) = 500
    const msgs = [
      makeMsgWithTokens("1", "user", 200),
      makeMsgWithTokens("2", "assistant", 200),
      makeMsgWithTokens("3", "user", 200),
      makeMsgWithTokens("4", "assistant", 200),
    ];
    const cached: StoredConversationSummary = {
      uniqueId: "s1",
      conversationId: "conv-1",
      summary: "x".repeat(14000), // 3500 tokens
      summarizedUpTo: "0",
      tokenCount: 3500,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const callLlm = makeCallLlm("Compact new summary.");

    const result = await progressiveSummarize({
      cachedSummary: cached,
      unsummarizedMessages: msgs,
      tokenThreshold: 4000,
      minWindowMessages: 2,
      callLlm,
      model: "test",
    });

    // Even with tiny windowBudget, minWindowMessages keeps at least 2 in the window
    expect(result.windowMessages.length).toBeGreaterThanOrEqual(2);
    // Should still call LLM since total exceeds threshold
    expect(result.didSummarize).toBe(true);
  });

  it("keeps minWindowMessages even when windowBudget is 0", async () => {
    // Extreme case: cached summary equals threshold → windowBudget = 0
    const msgs = [
      makeMsgWithTokens("1", "user", 100),
      makeMsgWithTokens("2", "assistant", 100),
      makeMsgWithTokens("3", "user", 100),
      makeMsgWithTokens("4", "assistant", 100),
    ];
    const cached: StoredConversationSummary = {
      uniqueId: "s1",
      conversationId: "conv-1",
      summary: "x".repeat(16000), // 4000 tokens = threshold
      summarizedUpTo: "0",
      tokenCount: 4000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const callLlm = makeCallLlm("Compact summary.");

    const result = await progressiveSummarize({
      cachedSummary: cached,
      unsummarizedMessages: msgs,
      tokenThreshold: 4000,
      minWindowMessages: 4,
      callLlm,
      model: "test",
    });

    // minWindowMessages=4 and we have 4 messages, so all stay in window
    expect(result.windowMessages).toHaveLength(4);
    // No messages to summarize → didSummarize = false
    expect(result.didSummarize).toBe(false);
  });
});

describe("maybeSummarizeHistory", () => {
  const mockedGetSummary = vi.mocked(getConversationSummaryOp);
  const mockedUpsertSummary = vi.mocked(upsertConversationSummaryOp);

  const baseOptions = {
    database: {} as any,
    conversationId: "conv-test",
    summarizeHistory: true,
    summaryTokenThreshold: 4000,
    summaryMinWindowMessages: 4,
    summaryModel: "gemini-flash",
    token: "test-token",
    baseUrl: "https://api.test",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    summarizationLocks.clear();
  });

  it("returns all messages verbatim when summarizeHistory is false", async () => {
    const msgs = [makeMsgWithTokens("1", "user", 100), makeMsgWithTokens("2", "assistant", 100)];
    const result = await maybeSummarizeHistory({
      ...baseOptions,
      summarizeHistory: false,
      messages: msgs,
    });
    expect(result.messagesToConvert).toEqual(msgs);
    expect(result.summarySystemMessage).toBeNull();
  });

  it("returns all messages verbatim when no auth token", async () => {
    const msgs = [
      makeMsgWithTokens("1", "user", 100),
      makeMsgWithTokens("2", "assistant", 100),
      makeMsgWithTokens("3", "user", 100),
      makeMsgWithTokens("4", "assistant", 100),
      makeMsgWithTokens("5", "user", 100),
    ];
    const result = await maybeSummarizeHistory({
      ...baseOptions,
      token: "",
      messages: msgs,
    });
    expect(result.messagesToConvert).toEqual(msgs);
    expect(result.summarySystemMessage).toBeNull();
  });

  it("returns all messages verbatim when message count <= minWindowMessages", async () => {
    const msgs = [makeMsgWithTokens("1", "user", 100), makeMsgWithTokens("2", "assistant", 100)];
    const result = await maybeSummarizeHistory({
      ...baseOptions,
      messages: msgs,
    });
    expect(result.messagesToConvert).toEqual(msgs);
    expect(result.summarySystemMessage).toBeNull();
  });

  it("performs summarization when over threshold", async () => {
    const msgs = Array.from({ length: 10 }, (_, i) =>
      makeMsgWithTokens(`msg-${i}`, i % 2 === 0 ? "user" : "assistant", 500)
    );
    mockedGetSummary.mockResolvedValueOnce(null);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: "Test summary." } }] }),
    } as Response);

    const result = await maybeSummarizeHistory({
      ...baseOptions,
      messages: msgs,
    });

    expect(result.summarySystemMessage).not.toBeNull();
    expect(result.messagesToConvert.length).toBeLessThan(msgs.length);
    expect(mockedUpsertSummary).toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("re-injects system messages into the window (M2 fix)", async () => {
    const msgs = [
      makeMsgWithTokens("1", "user", 500),
      makeMsgWithTokens("2", "assistant", 500),
      makeMsg("3", "system", "You are a helpful assistant"),
      makeMsgWithTokens("4", "user", 500),
      makeMsgWithTokens("5", "assistant", 500),
      makeMsgWithTokens("6", "user", 500),
    ];
    mockedGetSummary.mockResolvedValueOnce(null);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: "Summary." } }] }),
    } as Response);

    const result = await maybeSummarizeHistory({
      ...baseOptions,
      summaryMinWindowMessages: 2,
      messages: msgs,
    });

    // System message at index 3 should be re-injected if it's in the window range
    const roles = result.messagesToConvert.map((m) => m.role);
    if (result.messagesToConvert.length < msgs.length) {
      // If summarization happened, check system messages are preserved in window
      const hasSystem = roles.includes("system");
      // The system message at index 3 should be included if msgs 4+ are in the window
      const windowIds = result.messagesToConvert.map((m) => m.uniqueId);
      if (windowIds.includes("4") || windowIds.includes("5") || windowIds.includes("6")) {
        expect(hasSystem).toBe(true);
      }
    }

    fetchSpy.mockRestore();
  });

  it("preserves system messages when under threshold (no summarization)", async () => {
    // Under threshold: 3 messages with system msg, well below 4000 token threshold
    const msgs = [
      makeMsg("sys-1", "system", "You are a helpful assistant"),
      makeMsgWithTokens("1", "user", 100),
      makeMsgWithTokens("2", "assistant", 100),
      makeMsgWithTokens("3", "user", 100),
    ];
    mockedGetSummary.mockResolvedValueOnce(null);

    const result = await maybeSummarizeHistory({
      ...baseOptions,
      messages: msgs,
    });

    // All messages including system should be preserved
    expect(result.messagesToConvert).toHaveLength(4);
    expect(result.messagesToConvert.map((m) => m.role)).toContain("system");
    expect(result.messagesToConvert[0].uniqueId).toBe("sys-1");
    expect(result.summarySystemMessage).toBeNull();
  });

  it("concurrent calls await the in-progress result (H3 fix)", async () => {
    const msgs = Array.from({ length: 10 }, (_, i) =>
      makeMsgWithTokens(`msg-${i}`, i % 2 === 0 ? "user" : "assistant", 500)
    );
    mockedGetSummary.mockResolvedValue(null);

    let resolveFirst: (value: Response) => void;
    const firstCallPromise = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });

    let fetchCallCount = 0;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      fetchCallCount++;
      if (fetchCallCount === 1) return firstCallPromise;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: "Summary." } }] }),
      } as Response);
    });

    // Launch two concurrent calls
    const promise1 = maybeSummarizeHistory({ ...baseOptions, messages: msgs });
    const promise2 = maybeSummarizeHistory({ ...baseOptions, messages: msgs });

    // Resolve the first call
    resolveFirst!({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: "Summary." } }] }),
    } as Response);

    const [result1, result2] = await Promise.all([promise1, promise2]);

    // Both should get the same result (second awaits the first)
    expect(result1).toEqual(result2);
    // Only one fetch should have been made (not two)
    expect(fetchCallCount).toBe(1);

    fetchSpy.mockRestore();
  });

  it("compacts oversized summary instead of invalidating (H1 fix)", async () => {
    const msgs = Array.from({ length: 6 }, (_, i) =>
      makeMsgWithTokens(`msg-${i}`, i % 2 === 0 ? "user" : "assistant", 100)
    );
    // Cached summary exceeds 80% of threshold (3500 > 4000 * 0.8 = 3200)
    const oversizedSummary: StoredConversationSummary = {
      uniqueId: "s1",
      conversationId: "conv-test",
      summary: "x".repeat(14000), // 3500 tokens
      summarizedUpTo: "msg-0",
      tokenCount: 3500,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedGetSummary.mockResolvedValueOnce(oversizedSummary);

    let fetchCallCount = 0;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        // First call = compaction
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ choices: [{ message: { content: "Compacted summary." } }] }),
        } as Response);
      }
      // Second call = regular summarization (if needed)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: "New summary." } }] }),
      } as Response);
    });

    await maybeSummarizeHistory({ ...baseOptions, messages: msgs });

    // Compaction should have triggered (first fetch call)
    expect(fetchCallCount).toBeGreaterThanOrEqual(1);
    // Compacted summary should be persisted
    expect(mockedUpsertSummary).toHaveBeenCalledWith(
      expect.anything(),
      "conv-test",
      "Compacted summary.",
      "msg-0", // summarizedUpTo preserved
      expect.any(Number)
    );

    fetchSpy.mockRestore();
  });

  it("falls back gracefully when compaction LLM call fails", async () => {
    const msgs = Array.from({ length: 6 }, (_, i) =>
      makeMsgWithTokens(`msg-${i}`, i % 2 === 0 ? "user" : "assistant", 100)
    );
    const oversizedSummary: StoredConversationSummary = {
      uniqueId: "s1",
      conversationId: "conv-test",
      summary: "x".repeat(14000), // 3500 tokens > 80% of 4000
      summarizedUpTo: "msg-0",
      tokenCount: 3500,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedGetSummary.mockResolvedValueOnce(oversizedSummary);

    let fetchCallCount = 0;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        // Compaction fails
        return Promise.resolve({ ok: false, status: 500, statusText: "Error" } as Response);
      }
      // Subsequent calls succeed (regular summarization)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: "Summary." } }] }),
      } as Response);
    });

    // Should not throw — graceful degradation
    const result = await maybeSummarizeHistory({ ...baseOptions, messages: msgs });
    expect(result.messagesToConvert).toBeDefined();
    expect(result.messagesToConvert.length).toBeGreaterThan(0);

    fetchSpy.mockRestore();
  });

  it("does not compact when summary is below 80% threshold", async () => {
    const msgs = Array.from({ length: 6 }, (_, i) =>
      makeMsgWithTokens(`msg-${i}`, i % 2 === 0 ? "user" : "assistant", 500)
    );
    // Cached summary is below 80% of threshold (500 < 4000 * 0.8 = 3200)
    const smallSummary: StoredConversationSummary = {
      uniqueId: "s1",
      conversationId: "conv-test",
      summary: "x".repeat(2000), // 500 tokens
      summarizedUpTo: "msg-0",
      tokenCount: 500,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedGetSummary.mockResolvedValueOnce(smallSummary);

    let fetchCallCount = 0;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      fetchCallCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: "Summary." } }] }),
      } as Response);
    });

    await maybeSummarizeHistory({ ...baseOptions, messages: msgs });

    // Should have at most 1 fetch call (regular summarization), no compaction
    // If compaction happened, there would be 2 calls
    expect(fetchCallCount).toBeLessThanOrEqual(1);

    fetchSpy.mockRestore();
  });
});
