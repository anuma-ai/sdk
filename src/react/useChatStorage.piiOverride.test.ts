import { describe, expect, it, vi } from "vitest";

import { PiiRedactor } from "../lib/pii/redactor";
import { resolveCallPii } from "./useChatStorage";

/**
 * Unit tests for the per-call PII redaction resolution used by
 * `useChatStorage().sendMessage`.
 *
 * Two behaviors are locked in here:
 *  1. A per-request `piiRedaction` overrides the hook-level option for one call
 *     (false disables, an instance overrides, true uses the conversation redactor).
 *  2. `true` (hook- OR request-level) resolves via the injected
 *     `getConversationRedactorFor` getter, so the caller keys on the conversation
 *     ACTUALLY used for the call. `forInnerSend` is always forwarded so the LLM
 *     request uses that redactor rather than the inner hook's own
 *     `currentConversationId`-keyed one (null on turn 1 of an auto-created chat).
 */
describe("resolveCallPii", () => {
  const customRedactor = new PiiRedactor();
  // Stand-in for the conversation-shared redactor `getConversationRedactor(id)`
  // would return — the `true` case must resolve to THIS, lazily.
  const conversationRedactor = new PiiRedactor();
  const getConversationRedactorFor = () => conversationRedactor;

  describe("no per-request override → falls back to the hook-level option", () => {
    it("hook true → conversation redactor (resolved via the getter)", () => {
      const { redactor, forInnerSend } = resolveCallPii(
        undefined,
        true,
        getConversationRedactorFor
      );
      expect(redactor).toBe(conversationRedactor);
      // Always forwarded so the LLM call uses the conversation redactor too.
      expect(forInnerSend).toBe(conversationRedactor);
    });

    it("hook instance → that instance", () => {
      const { redactor, forInnerSend } = resolveCallPii(
        undefined,
        customRedactor,
        getConversationRedactorFor
      );
      expect(redactor).toBe(customRedactor);
      expect(forInnerSend).toBe(customRedactor);
    });

    it.each([false, undefined])("hook %s → redaction off", (hookValue) => {
      const { redactor, forInnerSend } = resolveCallPii(
        undefined,
        hookValue,
        getConversationRedactorFor
      );
      expect(redactor).toBeUndefined();
      expect(forInnerSend).toBe(false);
    });
  });

  describe("per-request override takes precedence", () => {
    it("override false disables redaction even when hook-level is on", () => {
      const { redactor, forInnerSend } = resolveCallPii(false, true, getConversationRedactorFor);
      expect(redactor).toBeUndefined();
      // Must force-disable on the inner send, not fall through to the hook-level redactor.
      expect(forInnerSend).toBe(false);
    });

    it("override instance wins over hook-level true", () => {
      const { redactor, forInnerSend } = resolveCallPii(
        customRedactor,
        true,
        getConversationRedactorFor
      );
      expect(redactor).toBe(customRedactor);
      expect(forInnerSend).toBe(customRedactor);
    });

    it("override true uses the conversation redactor even when hook-level is off", () => {
      const { redactor, forInnerSend } = resolveCallPii(true, false, getConversationRedactorFor);
      expect(redactor).toBe(conversationRedactor);
      expect(forInnerSend).toBe(conversationRedactor);
    });
  });

  it("resolves the conversation redactor lazily — only for the `true` case", () => {
    const spy = vi.fn(getConversationRedactorFor);
    resolveCallPii(false, true, spy); // override false
    resolveCallPii(customRedactor, true, spy); // override instance
    resolveCallPii(undefined, customRedactor, spy); // hook instance
    resolveCallPii(undefined, false, spy); // hook off
    expect(spy).not.toHaveBeenCalled();

    resolveCallPii(undefined, true, spy); // hook true → resolves
    resolveCallPii(true, false, spy); // override true → resolves
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("treats a non-redactor truthy override as no redaction (defensive)", () => {
    const { redactor, forInnerSend } = resolveCallPii(
      // @ts-expect-error — exercising a malformed value at runtime
      {},
      true,
      getConversationRedactorFor
    );
    expect(redactor).toBeUndefined();
    expect(forInnerSend).toBe(false);
  });
});
