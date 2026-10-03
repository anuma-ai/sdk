import { describe, expect, it } from "vitest";

import type { LlmapiMessage } from "../../client";

import {
  ATTACHED_FILES_OPEN_TAG,
  attachFileContextToLastUserMessage,
  buildAttachedFilesText,
  isAttachedFilesText,
} from "./fileContext";

const FILE_CONTEXT = "[Extracted content from order.pdf]\nQuote Number: Q-1191243";

function text(role: LlmapiMessage["role"], value: string): LlmapiMessage {
  return { role, content: [{ type: "text", text: value }] };
}

describe("attachFileContextToLastUserMessage", () => {
  it("adds the contents to the LAST user message, after its own text", () => {
    const messages = [
      text("system", "sys"),
      text("user", "earlier question"),
      text("assistant", "earlier answer"),
      text("user", "Please review the attached file(s)."),
    ];

    const result = attachFileContextToLastUserMessage(messages, FILE_CONTEXT);

    expect(result[1]).toEqual(messages[1]);
    const last = result[3].content!;
    expect(last).toHaveLength(2);
    // The user's words stay first: the portal classifier routes on the first text part.
    expect(last[0]).toEqual({ type: "text", text: "Please review the attached file(s)." });
    expect(last[1].type).toBe("text");
    expect(last[1].text).toBe(buildAttachedFilesText(FILE_CONTEXT));
    expect(last[1].text).toContain("Quote Number: Q-1191243");
  });

  it("places the contents before image parts so they follow the user's text", () => {
    const messages: LlmapiMessage[] = [
      {
        role: "user",
        content: [
          { type: "text", text: "what is this?" },
          { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
        ],
      },
    ];

    const parts = attachFileContextToLastUserMessage(messages, FILE_CONTEXT)[0].content!;

    expect(parts.map((p) => p.type)).toEqual(["text", "text", "image_url"]);
    expect(isAttachedFilesText(parts[1].text)).toBe(true);
  });

  it("with interleaved parts, goes right after the LAST text part", () => {
    const img = (url: string) => ({ type: "image_url" as const, image_url: { url } });
    const messages: LlmapiMessage[] = [
      {
        role: "user",
        content: [
          { type: "text", text: "first" },
          img("data:image/png;base64,A"),
          { type: "text", text: "second" },
          img("data:image/png;base64,B"),
        ],
      },
    ];

    const parts = attachFileContextToLastUserMessage(messages, FILE_CONTEXT)[0].content!;

    expect(parts.map((p) => p.text ?? p.image_url?.url)).toEqual([
      "first",
      "data:image/png;base64,A",
      "second",
      buildAttachedFilesText(FILE_CONTEXT),
      "data:image/png;base64,B",
    ]);
  });

  it("does not mutate its input", () => {
    const messages = [text("user", "hi")];
    const snapshot = structuredClone(messages);

    attachFileContextToLastUserMessage(messages, FILE_CONTEXT);

    expect(messages).toEqual(snapshot);
  });

  it("is a no-op without a user message or with blank contents", () => {
    const onlySystem = [text("system", "sys")];
    expect(attachFileContextToLastUserMessage(onlySystem, FILE_CONTEXT)).toBe(onlySystem);

    const withUser = [text("user", "hi")];
    expect(attachFileContextToLastUserMessage(withUser, "   ")).toBe(withUser);
  });
});

describe("isAttachedFilesText", () => {
  it("recognises only the tagged part", () => {
    expect(isAttachedFilesText(buildAttachedFilesText(FILE_CONTEXT))).toBe(true);
    expect(isAttachedFilesText(`note: ${ATTACHED_FILES_OPEN_TAG}`)).toBe(false);
    // User text that merely starts with the tag is still the user's prompt.
    expect(isAttachedFilesText(`${ATTACHED_FILES_OPEN_TAG} how do I parse this tag?`)).toBe(false);
    expect(isAttachedFilesText(`${ATTACHED_FILES_OPEN_TAG}\nnotes</attached_files>`)).toBe(false);
    expect(isAttachedFilesText("Please review the attached file(s).")).toBe(false);
    expect(isAttachedFilesText(undefined)).toBe(false);
  });
});
