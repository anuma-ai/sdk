import { describe, expect, it, vi } from "vitest";

import { PiiRedactor } from "../lib/pii/redactor";
import { resolveCallPii } from "./useChatStorage";

describe("resolveCallPii", () => {
  const customRedactor = new PiiRedactor();
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
    resolveCallPii(false, true, spy);
    resolveCallPii(customRedactor, true, spy);
    resolveCallPii(undefined, customRedactor, spy);
    resolveCallPii(undefined, false, spy);
    expect(spy).not.toHaveBeenCalled();

    resolveCallPii(undefined, true, spy);
    resolveCallPii(true, false, spy);
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
