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
import { buildAttachedFilesText, isAttachedFilesText } from "../lib/chat/fileContext";
import { runToolLoop } from "../lib/chat/toolLoop";
import { getMessagesOp } from "../lib/db/chat";
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

  it("never stores the attached-file part as the user's message when the caller puts it on messages", async () => {
    // Mobile builds its own document context and sends the tagged part inside `messages`,
    // without `storedUserContent`. The stored row must still be only what the user typed.
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_caller_part",
        getToken: async () => "tok",
      })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Please review the attached file(s)." },
              {
                type: "text",
                text: buildAttachedFilesText(`[Extracted content from a.pdf]\n${DOC_TEXT}`),
              },
            ],
          },
        ],
        model: "test-model",
      });
    });

    // The wire still carries the document…
    expect(JSON.stringify(sentMessages(0))).toContain(DOC_TEXT);
    // …but the persisted user row is only the user's words.
    const rows = await getMessagesOp(
      {
        database: db,
        messagesCollection: db.get("history"),
        conversationsCollection: db.get("conversations"),
      } as never,
      "conv_caller_part"
    );
    const userRow = rows.find((r) => r.role === "user")!;
    expect(userRow.content).toBe("Please review the attached file(s).");
  });

  async function storedRows(conversationId: string) {
    return getMessagesOp(
      {
        database: db,
        messagesCollection: db.get("history"),
        conversationsCollection: db.get("conversations"),
      } as never,
      conversationId
    );
  }

  it("reports per-file statuses once and tells the model which file it could not read", async () => {
    const onFileProcessingResult = vi.fn();
    const { result } = renderHook(() =>
      useChatStorage({ database: db, conversationId: "conv_status", getToken: async () => "tok" })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Review these." }] }],
        model: "test-model",
        files: [
          FILE,
          {
            id: "file-bin",
            name: "weird.bin",
            type: "application/x-unknown",
            size: 4,
            url: "data:application/x-unknown;base64,AAAA",
          },
          {
            id: "file-img",
            name: "p.png",
            type: "image/png",
            size: 4,
            url: "data:image/png;base64,AA==",
          },
        ],
        onFileProcessingResult,
      });
    });

    expect(onFileProcessingResult).toHaveBeenCalledTimes(1);
    expect(onFileProcessingResult).toHaveBeenCalledWith([
      { fileId: "file-order", fileName: "order-form.txt", status: "extracted" },
      { fileId: "file-bin", fileName: "weird.bin", status: "skipped", reason: "unsupported_type" },
    ]);
    const filePart = lastUser(sentMessages(0)).content!.find((p) => isAttachedFilesText(p.text));
    expect(filePart?.text).toContain(DOC_TEXT);
    expect(filePart?.text).toContain(
      "[weird.bin could not be read: its file type is not supported for reading]"
    );
  });

  it("still sends when onFileProcessingResult throws", async () => {
    const { result } = renderHook(() =>
      useChatStorage({ database: db, conversationId: "conv_throw", getToken: async () => "tok" })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Review this." }] }],
        model: "test-model",
        files: [FILE],
        onFileProcessingResult: () => {
          throw new Error("observer bug");
        },
      });
    });

    expect(mockRunToolLoop).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(sentMessages(0))).toContain(DOC_TEXT);
  });

  it("attaches the note alone when no file could be read, and stores no file context", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_all_failed",
        getToken: async () => "tok",
      })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Summarize order.pdf" }] }],
        model: "test-model",
        files: [{ ...FILE, id: "file-big", name: "order.pdf", size: 11 * 1024 * 1024 }],
      });
    });

    const parts = lastUser(sentMessages(0)).content!;
    expect(parts[0]).toEqual({ type: "text", text: "Summarize order.pdf" });
    const filePart = parts.find((p) => isAttachedFilesText(p.text));
    expect(filePart?.text).toContain(
      "[order.pdf could not be read: the file is larger than 10 MB]"
    );
    expect(filePart?.text).not.toContain("[Extracted content from ");

    const userRow = (await storedRows("conv_all_failed")).find((r) => r.role === "user")!;
    expect(userRow.thinking ?? undefined).toBeUndefined();
  });

  it("carries file context forward past maxHistoryMessages", async () => {
    const { result } = renderHook(() =>
      useChatStorage({ database: db, conversationId: "conv_carry", getToken: async () => "tok" })
    );
    const send = (text: string, extra: { files?: (typeof FILE)[] } = {}) =>
      act(async () => {
        await result.current.sendMessage({
          messages: [{ role: "user", content: [{ type: "text", text }] }],
          model: "test-model",
          maxHistoryMessages: 2,
          ...extra,
        });
      });

    await send("Review this.", { files: [FILE] });
    await send("What is the quote number?");
    await send("And the term?");
    await send("Summarize it again.");

    // By the fourth turn the attaching turn is far outside a 2-message window…
    const userRows = (await storedRows("conv_carry")).filter((r) => r.role === "user");
    expect(userRows).toHaveLength(4);
    // …yet each follow-up row carried the context forward, so it still reaches the model.
    for (const row of userRows) {
      expect(row.thinking?.startsWith("[Extracted content from order-form.txt]")).toBe(true);
    }
    expect(systemText(sentMessages(3))).toContain(DOC_TEXT);
  });

  it("drops an input_file part without file_id that carries a preprocessed file's data", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_input_file",
        getToken: async () => "tok",
      })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Review this." },
              { type: "input_file", file: { filename: FILE.name, file_data: FILE.url } },
            ],
          },
        ],
        model: "test-model",
        files: [FILE],
      });
    });

    const parts = lastUser(sentMessages(0)).content!;
    expect(parts.some((p) => p.type === "input_file")).toBe(false);
    expect(parts.some((p) => isAttachedFilesText(p.text))).toBe(true);
  });
});
