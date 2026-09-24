// @vitest-environment happy-dom
/**
 * Where a turn's extracted attachment text lands in the request.
 *
 * It used to go ONLY into a detached system message at the very front of the
 * request ("The user has attached files to this conversation…"), separated from
 * the user's "Please review the attached file(s)." by the whole system prompt,
 * tool catalog and history. In a long multi-file conversation the auto-routed
 * fast model had the PDF's full text in its request (portal input-composition
 * logs: +9.8k system bytes) and still told the user the attachment was
 * unreadable. The current turn's contents now ride on the current user message.
 */

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";

vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...orig, runToolLoop: vi.fn() };
});

import type { LlmapiMessage } from "../client";
import { isAttachedFilesText } from "../lib/chat/fileContext";
import { runToolLoop } from "../lib/chat/toolLoop";
import { useChatStorage } from "./useChatStorage";

const mockRunToolLoop = vi.mocked(runToolLoop);

const DOC_TEXT = "ORDER FORM Quote Number: Q-1191243 Term: 12 months";
const FILE = {
  id: "file-order",
  name: "order-form.txt",
  type: "text/plain",
  size: DOC_TEXT.length,
  url: `data:text/plain;base64,${btoa(DOC_TEXT)}`,
};
const LEGACY_SYSTEM_HEADER = "The user has attached files to this conversation";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `file-context-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function loopResult() {
  return {
    data: {
      id: `resp-${Math.random().toString(36).slice(2)}`,
      model: "test-model",
      object: "response",
      output: [
        {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "ok" }],
          status: "completed",
        },
      ],
      usage: undefined,
    },
    error: null,
  } as never;
}

function sentMessages(callIndex: number): LlmapiMessage[] {
  return mockRunToolLoop.mock.calls[callIndex]![0]!.messages as LlmapiMessage[];
}

function lastUser(messages: LlmapiMessage[]): LlmapiMessage {
  return [...messages].reverse().find((m) => m.role === "user")!;
}

function systemText(messages: LlmapiMessage[]): string {
  return messages
    .filter((m) => m.role === "system")
    .flatMap((m) => m.content ?? [])
    .map((p) => p.text ?? "")
    .join("\n");
}

describe("useChatStorage attachment text placement", () => {
  let db: Database;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeDatabase();
    fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network"));
    mockRunToolLoop.mockResolvedValue(loopResult());
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("puts this turn's extracted file text on this turn's user message, not in a system message", async () => {
    const { result } = renderHook(() =>
      useChatStorage({ database: db, conversationId: "conv_files", getToken: async () => "tok" })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: "Please review the attached file(s)." }],
          },
        ],
        model: "test-model",
        files: [FILE],
      });
    });

    const messages = sentMessages(0);
    const parts = lastUser(messages).content!;
    expect(parts[0]).toEqual({ type: "text", text: "Please review the attached file(s)." });
    const filePart = parts.find((p) => isAttachedFilesText(p.text));
    expect(filePart?.text).toContain("[Extracted content from order-form.txt]");
    expect(filePart?.text).toContain(DOC_TEXT);

    const system = systemText(messages);
    expect(system).not.toContain(DOC_TEXT);
    expect(system).not.toContain(LEGACY_SYSTEM_HEADER);
  });

  it("still recalls the latest file text on a follow-up turn with no attachment", async () => {
    const { result } = renderHook(() =>
      useChatStorage({ database: db, conversationId: "conv_followup", getToken: async () => "tok" })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Review this." }] }],
        model: "test-model",
        files: [FILE],
      });
    });
    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "What is the term?" }] }],
        model: "test-model",
      });
    });

    const followUp = sentMessages(1);
    // The follow-up's own message carries only the user's words…
    expect(lastUser(followUp).content).toEqual([{ type: "text", text: "What is the term?" }]);
    // …and the earlier file's text is still available to answer it.
    expect(systemText(followUp)).toContain(DOC_TEXT);
  });
});
