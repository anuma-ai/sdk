import { describe, expect, it, vi } from "vitest";

import { PiiRedactor } from "../lib/pii/redactor";
import { resolveCallPii } from "./useChatStorage";

/**
 * Unit tests for the per-request PII redaction override resolution used by
 * `useChatStorage().sendMessage`. The override must take precedence over the
 * hook-level redactor for a single call and reach both the LLM request
 * (`forInnerSend`) and this call's embedding/summarization masking (`redactor`).
 */
describe("resolveCallPii", () => {
  const hookRedactor = new PiiRedactor();
  const customRedactor = new PiiRedactor();
  // Stand-in for getConversationRedactor — the conversation-shared redactor that
  // a per-request `true` resolves to.
  const conversationRedactor = new PiiRedactor();
  const getConversationRedactorFor = () => conversationRedactor;

  it("falls back to the hook-level redactor when no override is given", () => {
    const { redactor, forInnerSend } = resolveCallPii(
      undefined,
      hookRedactor,
      getConversationRedactorFor
    );
    expect(redactor).toBe(hookRedactor);
    // undefined → inner useChat keeps its hook-level redactor (no override).
    expect(forInnerSend).toBeUndefined();
  });

  it("no override with hook-level redaction off → no redaction, no inner override", () => {
    const { redactor, forInnerSend } = resolveCallPii(undefined, false, getConversationRedactorFor);
    expect(redactor).toBeUndefined();
    // No override given → inner useChat keeps its (off) hook-level setting.
    expect(forInnerSend).toBeUndefined();
  });

  it("override false disables redaction for this call (even when hook-level is on)", () => {
    const { redactor, forInnerSend } = resolveCallPii(
      false,
      hookRedactor,
      getConversationRedactorFor
    );
    expect(redactor).toBeUndefined();
    // Must force-disable on the inner send, NOT fall through to the hook-level one.
    expect(forInnerSend).toBe(false);
  });

  it("override with a custom instance uses that instance (over hook-level)", () => {
    const { redactor, forInnerSend } = resolveCallPii(
      customRedactor,
      hookRedactor,
      getConversationRedactorFor
    );
    expect(redactor).toBe(customRedactor);
    expect(forInnerSend).toBe(customRedactor);
  });

  it("override true resolves to the conversation-shared redactor (not a throwaway)", () => {
    const spy = vi.fn(getConversationRedactorFor);
    const { redactor, forInnerSend } = resolveCallPii(true, false, spy);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(redactor).toBe(conversationRedactor);
    expect(forInnerSend).toBe(conversationRedactor);
  });

  it("only resolves the conversation redactor for the `true` case (lazy)", () => {
    const spy = vi.fn(getConversationRedactorFor);
    resolveCallPii(false, hookRedactor, spy);
    resolveCallPii(customRedactor, hookRedactor, spy);
    resolveCallPii(undefined, hookRedactor, spy);
    expect(spy).not.toHaveBeenCalled();
  });

  it("treats a non-redactor truthy override as no redaction (defensive)", () => {
    // Mirrors resolvePiiRedactor's guard: anything that isn't `true`/instance is off.
    const { redactor, forInnerSend } = resolveCallPii(
      // @ts-expect-error — exercising a malformed value at runtime
      {},
      hookRedactor,
      getConversationRedactorFor
    );
    expect(redactor).toBeUndefined();
    expect(forInnerSend).toBe(false);
  });
});
