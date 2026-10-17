// @vitest-environment happy-dom

import { Database, Q } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Message } from "../lib/db/chat/models";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";

vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...orig, runToolLoop: vi.fn() };
});

import type { LlmapiToolCallEvent } from "../client";
import { runToolLoop } from "../lib/chat/toolLoop";
import { useChatStorage } from "./useChatStorage";

const mockRunToolLoop = vi.mocked(runToolLoop);

const CIPHERTEXT = `enc:v3:${"a1".repeat(40)}`;

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `tool-call-events-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function loopResult(toolCallEvents?: LlmapiToolCallEvent[]) {
  return {
    data: {
      id: `resp-${Math.random().toString(36).slice(2)}`,
      model: "test-model",
      object: "response",
      output: [
        {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "Here it is." }],
          status: "completed",
        },
      ],
      ...(toolCallEvents ? { tool_call_events: toolCallEvents } : {}),
    },
    error: null,
  } as never;
}

async function send(result: { current: ReturnType<typeof useChatStorage> }, text: string) {
  return await act(async () =>
    result.current.sendMessage({
      messages: [{ role: "user", content: [{ type: "text", text }] }],
      model: "test-model",
    })
  );
}

describe("useChatStorage tool call event replay (expo)", () => {
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

  it("replays decrypted tool events and leaves out ones that are still encrypted", async () => {
    mockRunToolLoop.mockResolvedValue(
      loopResult([
        { id: "t1", name: "notion_search", arguments: '{"q":"plan"}', output: '{"title":"Plan"}' },
        { id: "t2", name: "notion_search", arguments: CIPHERTEXT, output: CIPHERTEXT },
      ])
    );
    const { result } = renderHook(() =>
      useChatStorage({ database: db, conversationId: "conv_events", getToken: async () => "tok" })
    );

    await send(result, "find my plan");
    mockRunToolLoop.mockResolvedValue(loopResult());
    await send(result, "summarize it");

    const replayed = mockRunToolLoop.mock.calls[1]![0]!.messages as {
      role: string;
      tool_call_id?: string;
      tool_calls?: { id?: string; function?: { arguments?: string } }[];
      content?: { text?: string }[];
    }[];

    const toolCalls = replayed.flatMap((m) => m.tool_calls ?? []);
    expect(toolCalls.map((c) => [c.id, c.function?.arguments])).toEqual([["t1", '{"q":"plan"}']]);
    expect(
      replayed.filter((m) => m.role === "tool").map((m) => [m.tool_call_id, m.content?.[0]?.text])
    ).toEqual([["t1", '{"title":"Plan"}']]);
    expect(JSON.stringify(replayed)).not.toContain("enc:v");
  });

  it("replays no tool calls when the stored column never decoded to a list", async () => {
    mockRunToolLoop.mockResolvedValue(
      loopResult([{ id: "t1", name: "notion_search", arguments: "{}", output: "{}" }])
    );
    const { result } = renderHook(() =>
      useChatStorage({ database: db, conversationId: "conv_events", getToken: async () => "tok" })
    );

    await send(result, "find my plan");
    await db.write(async () => {
      const rows = await db
        .get<Message>("history")
        .query(Q.where("tool_call_events", Q.notEq(null)))
        .fetch();
      await db.batch(
        ...rows.map((row) => row.prepareUpdate((m) => m._setRaw("tool_call_events", CIPHERTEXT)))
      );
    });
    mockRunToolLoop.mockResolvedValue(loopResult());
    await send(result, "summarize it");

    const replayed = mockRunToolLoop.mock.calls[1]![0]!.messages as {
      role: string;
      tool_calls?: unknown[];
    }[];
    expect(replayed.some((m) => m.tool_calls || m.role === "tool")).toBe(false);
    expect(replayed.map((m) => m.role)).toContain("assistant");
  });
});
