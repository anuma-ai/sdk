import { describe, expect, it } from "vitest";

import type { LlmapiMessage } from "../../client";

import { assembleMessagesWithHistory } from "./assembleMessages";

/** Helper to create a minimal LlmapiMessage */
function msg(role: "system" | "user" | "assistant", text: string): LlmapiMessage {
  return { role, content: [{ type: "text", text }] };
}

describe("assembleMessagesWithHistory", () => {
  it("hoists system messages before history", () => {
    const history = [msg("user", "hi"), msg("assistant", "hello")];
    const caller = [msg("system", "You are helpful"), msg("user", "follow-up")];

    const result = assembleMessagesWithHistory(history, caller);

    expect(result.map((m) => m.role)).toEqual([
      "system",    // hoisted from caller
      "user",      // history
      "assistant", // history
      "user",      // caller (non-system)
    ]);
    expect(result[0]).toEqual(msg("system", "You are helpful"));
  });

  it("preserves order when caller has no system messages", () => {
    const history = [msg("user", "hi"), msg("assistant", "hello")];
    const caller = [msg("user", "follow-up")];

    const result = assembleMessagesWithHistory(history, caller);

    expect(result.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });

  it("places summary system message before caller system message", () => {
    const history = [msg("user", "hi"), msg("assistant", "hello")];
    const caller = [msg("system", "You are helpful"), msg("user", "follow-up")];
    const summary = msg("system", "Summary of prior conversation");

    const result = assembleMessagesWithHistory(history, caller, summary);

    expect(result.map((m) => m.role)).toEqual([
      "system",    // summary
      "system",    // caller system
      "user",      // history
      "assistant", // history
      "user",      // caller non-system
    ]);
    expect(result[0]).toEqual(summary);
    expect(result[1]).toEqual(msg("system", "You are helpful"));
  });

  it("handles empty history", () => {
    const caller = [msg("system", "You are helpful"), msg("user", "hello")];

    const result = assembleMessagesWithHistory([], caller);

    expect(result.map((m) => m.role)).toEqual(["system", "user"]);
  });

  it("handles empty caller messages", () => {
    const history = [msg("user", "hi"), msg("assistant", "hello")];

    const result = assembleMessagesWithHistory(history, []);

    expect(result.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("handles null summary system message", () => {
    const history = [msg("user", "hi")];
    const caller = [msg("system", "sys"), msg("user", "q")];

    const result = assembleMessagesWithHistory(history, caller, null);

    expect(result.map((m) => m.role)).toEqual(["system", "user", "user"]);
  });
});
