// @vitest-environment happy-dom
/**
 * Send hot path must not read the whole thread (sdk perf: memory hot paths).
 *
 * sendMessage used to call getMessagesOp(convId) on EVERY send: an unbounded
 * unsafeFetchRaw of the thread that JSON.parses and decrypts every row's
 * embedding columns (vector/chunks — tens of KB per row), only to slice the
 * result down to the last maxHistoryMessages. Cost grew O(thread length) per
 * send. The fixed path builds the dedup set from getToolCallEventIdsOp (a
 * plaintext single-column scan) and pages backward with getMessagesPageOp
 * (skipEmbeddings) until the folded window is full.
 *
 * The getMessagesOp-never-called assertions fail against the old code by
 * construction; the window/fold assertions pin that behaviour is unchanged.
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

vi.mock("../lib/db/chat", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/db/chat")>();
  return {
    ...orig,
    getMessagesOp: vi.fn(orig.getMessagesOp),
    getToolCallEventIdsOp: vi.fn(orig.getToolCallEventIdsOp),
  };
});

import { runToolLoop } from "../lib/chat/toolLoop";
import { createMessageOp, getMessagesOp, getToolCallEventIdsOp } from "../lib/db/chat";
import { useChatStorage } from "./useChatStorage";

const mockRunToolLoop = vi.mocked(runToolLoop);
const mockGetMessagesOp = vi.mocked(getMessagesOp);
const mockGetToolCallEventIdsOp = vi.mocked(getToolCallEventIdsOp);

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `send-history-test-${Math.random().toString(36).slice(2)}`,
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

function replayedTexts(callIndex: number): string[] {
  const messages = mockRunToolLoop.mock.calls[callIndex]![0]!.messages as {
    role: string;
    content: { text?: string }[];
  }[];
  return messages.map((m) => m.content.map((part) => part.text ?? "").join(""));
}

describe("useChatStorage send history read", () => {
  let db: Database;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeDatabase();
    fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network"));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.clearAllMocks();
  });

  async function seed(count: number, conversationId: string) {
    const ctx = {
      database: db,
      messagesCollection: db.get("history"),
      conversationsCollection: db.get("conversations"),
    } as never;
    for (let i = 1; i <= count; i++) {
      await createMessageOp(ctx, {
        conversationId,
        role: i % 2 === 1 ? "user" : "assistant",
        content: `seeded-${i}`,
        uniqueId: `seed-${i}`,
      });
    }
  }

  it("sends only the windowed tail and never calls getMessagesOp", async () => {
    await seed(25, "conv_long");
    mockRunToolLoop.mockResolvedValue(loopResult());

    const { result } = renderHook(() =>
      useChatStorage({ database: db, conversationId: "conv_long", getToken: async () => "tok" })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "new prompt" }] }],
        model: "test-model",
        maxHistoryMessages: 10,
      });
    });

    expect(mockGetMessagesOp).not.toHaveBeenCalled();
    expect(mockGetToolCallEventIdsOp).toHaveBeenCalled();

    const texts = replayedTexts(0);
    const history = texts.filter((t) => t.startsWith("seeded-"));
    expect(history).toEqual([
      "seeded-16",
      "seeded-17",
      "seeded-18",
      "seeded-19",
      "seeded-20",
      "seeded-21",
      "seeded-22",
      "seeded-23",
      "seeded-24",
      "seeded-25",
    ]);
    expect(texts[texts.length - 1]).toContain("new prompt");
  });

  it("pages backward until the FOLDED window is full (synthetic rows don't spend slots)", async () => {
    // Three turns, each assistant turn followed by its synthetic tool-results
    // row: 9 stored rows, 6 replayable after folding. A naive pre-sliced page
    // of 3 would replay 2; the backward pager must fetch the second page.
    const ctx = {
      database: db,
      messagesCollection: db.get("history"),
      conversationsCollection: db.get("conversations"),
    } as never;
    for (let turn = 1; turn <= 3; turn++) {
      await createMessageOp(ctx, {
        conversationId: "conv_fold",
        role: "user",
        content: `prompt-${turn}`,
        uniqueId: `u-${turn}`,
      });
      await createMessageOp(ctx, {
        conversationId: "conv_fold",
        role: "assistant",
        content: `answer-${turn}`,
        uniqueId: `a-${turn}`,
      });
      await createMessageOp(ctx, {
        conversationId: "conv_fold",
        role: "user",
        content: `[Tool Execution Results]\nTool "search" returned: {"turn":${turn}}`,
        uniqueId: `r-${turn}`,
        parentMessageId: `a-${turn}`,
      });
    }
    mockRunToolLoop.mockResolvedValue(loopResult());

    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_fold",
        getToken: async () => "tok",
        foldToolResultsInHistory: true,
      })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "next" }] }],
        model: "test-model",
        maxHistoryMessages: 3,
      });
    });

    expect(mockGetMessagesOp).not.toHaveBeenCalled();

    const texts = replayedTexts(0);
    // Last 3 replayable rows: answer-2 (folded), prompt-3, answer-3 (folded).
    expect(texts.slice(0, 3)).toHaveLength(3);
    expect(texts[0]).toContain("answer-2");
    expect(texts[0]).toContain("search");
    expect(texts[1]).toBe("prompt-3");
    expect(texts[2]).toContain("answer-3");
    expect(texts[texts.length - 1]).toContain("next");
  });
});
