// @vitest-environment happy-dom

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import bookingTurn from "../lib/chat/fixtures/bookingTurnToolCallEvents.json";
import { extractReservationReceipts } from "../lib/chat/reservationReceipts";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";

vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...orig, runToolLoop: vi.fn() };
});
vi.mock("../lib/memoryEngine/generate", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/memoryEngine/generate")>();
  return {
    ...orig,
    generateEmbedding: async () => [0.1, 0.2, 0.3],
    generateEmbeddings: async (texts: string[]) => texts.map(() => [0.1, 0.2, 0.3]),
  };
});

import { useChatStorage as useExpoChatStorage } from "../expo/useChatStorage";
import { runToolLoop } from "../lib/chat/toolLoop";
import { useChatStorage as useReactChatStorage } from "./useChatStorage";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `tool-call-events-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

const hooks = [
  ["react", useReactChatStorage],
  ["expo", useExpoChatStorage],
] as const;

describe.each(hooks)("useChatStorage keeps server tool results (%s)", (_label, useChatStorage) => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runToolLoop).mockResolvedValue({
      data: {
        id: "resp-booking",
        model: "anthropic/claude-opus-5-5",
        object: "response",
        output: [
          {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: "You're booked at Motek Brickell." }],
            status: "completed",
          },
        ],
        tool_call_events: bookingTurn,
      },
      error: null,
    } as never);
  });

  it("stores the booking call's output on the assistant message", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: makeDatabase(),
        conversationId: "conv_booking",
        getToken: async () => "tok",
      })
    );

    await result.current.sendMessage({
      messages: [{ role: "user", content: [{ type: "text", text: "book Motek for 2" }] }],
      model: "auto",
      serverTools: [],
    });

    const stored = await result.current.getMessages("conv_booking");
    const assistant = stored.find((m) => m.role === "assistant");
    expect(assistant?.toolCallEvents).toEqual(bookingTurn);
    const book = assistant?.toolCallEvents?.find((e) => e.name?.endsWith("anuma_book_restaurant"));
    expect(JSON.parse(book?.output ?? "")).toMatchObject({
      success: true,
      reservation_id: "812734455",
    });
    expect(extractReservationReceipts(assistant?.toolCallEvents)).toMatchObject([
      { kind: "booking", status: "made", venueName: "Motek Brickell" },
    ]);
  });
});
