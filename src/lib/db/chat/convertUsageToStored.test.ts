import { describe, expect, it } from "vitest";

import type { LlmapiChatCompletionResponse, LlmapiResponseResponse } from "../../../client";
import { convertUsageToStored } from "./types";

// convertUsageToStored defers the portal-vs-legacy cost precedence to the
// shared getCostMicroUsd / getCreditsUsed helpers rather than re-implementing
// it. These tests pin that it reads cost/credits correctly from each response
// shape and handles the empty cases.

describe("convertUsageToStored", () => {
  it("reads tokens from usage and cost/credits from the portal envelope (Chat Completions)", () => {
    const res: LlmapiChatCompletionResponse = {
      id: "r1",
      object: "chat.completion",
      choices: [{ index: 0, message: { role: "assistant", content: "hi" } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      portal: { cost_micro_usd: 1234, credits_used: 2 },
    };

    expect(convertUsageToStored(res)).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      costMicroUsd: 1234,
      creditsUsed: 2,
    });
  });

  it("reads cost/credits from usage for the Responses API shape", () => {
    const res: LlmapiResponseResponse = {
      id: "r1",
      object: "response",
      output: [],
      usage: {
        prompt_tokens: 8,
        completion_tokens: 4,
        total_tokens: 12,
        cost_micro_usd: 99,
        credits_used: 1,
      },
    };

    expect(convertUsageToStored(res)).toEqual({
      promptTokens: 8,
      completionTokens: 4,
      totalTokens: 12,
      costMicroUsd: 99,
      creditsUsed: 1,
    });
  });

  it("prefers the portal envelope over a mirrored usage value (no double counting)", () => {
    // Streaming responses mirror cost into both usage and portal; portal wins.
    const res: LlmapiChatCompletionResponse = {
      id: "r1",
      object: "chat.completion",
      choices: [],
      usage: { prompt_tokens: 1, cost_micro_usd: 500, credits_used: 5 },
      portal: { cost_micro_usd: 500, credits_used: 5 },
    };
    const stored = convertUsageToStored(res);
    expect(stored?.costMicroUsd).toBe(500);
    expect(stored?.creditsUsed).toBe(5);
  });

  it("returns undefined for null/undefined input", () => {
    expect(convertUsageToStored(null)).toBeUndefined();
    expect(convertUsageToStored(undefined)).toBeUndefined();
  });

  it("keeps token counts even when cost fields are absent", () => {
    const res: LlmapiChatCompletionResponse = {
      id: "r1",
      object: "chat.completion",
      choices: [],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };
    expect(convertUsageToStored(res)).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      costMicroUsd: undefined,
      creditsUsed: undefined,
    });
  });

  it("returns undefined when there is neither usage nor cost", () => {
    const res: LlmapiChatCompletionResponse = {
      id: "r1",
      object: "chat.completion",
      choices: [],
    };
    expect(convertUsageToStored(res)).toBeUndefined();
  });

  // Per-step out-of-credits marker (ai-portal #1146): injected into the `usage`
  // object (not portal). Passed through as-is to stored.creditsExhausted.
  it("passes credits_exhausted through from usage (Chat Completions)", () => {
    const res: LlmapiChatCompletionResponse = {
      id: "r1",
      object: "chat.completion",
      choices: [{ index: 0, message: { role: "assistant", content: "wrap-up" } }],
      // credits_exhausted is runtime-injected, not on the generated usage type.
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, credits_exhausted: true } as never,
    };
    expect(convertUsageToStored(res)?.creditsExhausted).toBe(true);
  });

  it("passes credits_exhausted through from usage (Responses API)", () => {
    const res: LlmapiResponseResponse = {
      id: "r1",
      object: "response",
      output: [],
      usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12, credits_exhausted: true } as never,
    };
    expect(convertUsageToStored(res)?.creditsExhausted).toBe(true);
  });

  it("omits creditsExhausted when absent (unchanged credits_used behavior)", () => {
    const res: LlmapiChatCompletionResponse = {
      id: "r1",
      object: "chat.completion",
      choices: [],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      portal: { credits_used: 2 },
    };
    const stored = convertUsageToStored(res);
    expect(stored).not.toHaveProperty("creditsExhausted");
    expect(stored?.creditsUsed).toBe(2); // existing behavior unchanged
  });
});
