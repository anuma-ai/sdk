import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChatStorage as useExpoChatStorage } from "../expo/useChatStorage";
import { runToolLoop } from "../lib/chat/toolLoop";
import { type ChatStoreHarness, createChatStoreHarness } from "../../test/chat/vaultHarness";
import { createVaultChatBackend, vaultChatBackend } from "../lib/chatStore/vaultBackend";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import { type ChatBackend, localChatBackend } from "../lib/storage";
import { useChatStorage as useReactChatStorage } from "./useChatStorage";

vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...original, runToolLoop: vi.fn() };
});

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `vault-hook-parity-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

const turns = [
  {
    user: "plan a weekend in lisbon",
    reply: "Here is a plan for Lisbon.",
    events: [{ id: "call_search", name: "search", arguments: "{}", output: '{"hits":3}' }],
    tools: [{ name: "search_people_nearby", result: { rows_returned: 1 } }],
  },
  { user: "and porto after that?", reply: "Porto works on Sunday." },
  { user: "which one is cheaper", reply: "Porto is cheaper." },
];

function loopResult(turn: (typeof turns)[number]) {
  return {
    data: {
      id: `resp-${turn.reply.length}`,
      model: "test-model",
      object: "response",
      output: [
        {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: turn.reply }],
          status: "completed",
        },
      ],
      ...(turn.events ? { tool_call_events: turn.events } : {}),
    },
    error: null,
    ...(turn.tools ? { autoExecutedToolResults: turn.tools } : {}),
  } as never;
}

async function snapshot(
  backend: Pick<ChatBackend, "getMessages" | "getConversation" | "getToolCallEventIds">
) {
  const messages = await backend.getMessages("conv_p");
  const index = new Map(messages.map((m, i) => [m.uniqueId, i]));
  return {
    title: (await backend.getConversation("conv_p"))?.title,
    toolCalls: [...(await backend.getToolCallEventIds("conv_p"))].sort(),
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      parent:
        m.parentMessageId === undefined || m.parentMessageId === null
          ? null
          : index.get(m.parentMessageId),
      origin: m.origin ?? undefined,
      model: m.model ?? undefined,
      toolCallEvents: m.toolCallEvents ?? undefined,
      wasStopped: m.wasStopped ?? false,
      error: m.error ?? undefined,
    })),
  };
}

describe.each([
  ["react", useReactChatStorage],
  ["expo", useExpoChatStorage],
] as const)("useChatStorage on vault matches local storage (%s)", (_platform, useChatStorage) => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network unavailable"));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  async function session(store?: ChatStoreHarness) {
    const vault = store
      ? createVaultChatBackend({
          store: store.store,
          pollIntervalMs: 0,
          activity: { isActive: () => true, subscribe: () => () => {} },
        })
      : undefined;
    const database = makeDatabase();
    const { result } = renderHook(() =>
      useChatStorage({
        database,
        conversationId: "conv_p",
        getToken: () => Promise.resolve("token"),
        autoEmbedMessages: false,
        ...(vault ? { chatBackend: vaultChatBackend(vault) } : {}),
      })
    );
    for (const turn of turns) {
      vi.mocked(runToolLoop).mockResolvedValueOnce(loopResult(turn));
      const sent = await act(async () =>
        result.current.sendMessage({
          messages: [{ role: "user", content: [{ type: "text", text: turn.user }] }],
          model: "test-model",
        })
      );
      expect(sent.error).toBeNull();
    }
    await vault?.flush();
    const seen = await snapshot(vault ?? localChatBackend(database)({}));
    vault?.close();
    return seen;
  }

  it("persists the same conversation, branch links and tool results", async () => {
    const local = await session();
    const fake = await createChatStoreHarness();
    const onVault = await session(fake);
    const freshDevice = createVaultChatBackend({
      store: fake.store,
      pollIntervalMs: 0,
      activity: { isActive: () => true, subscribe: () => () => {} },
    });

    expect(local.messages.length).toBeGreaterThanOrEqual(turns.length * 2);
    expect(onVault).toEqual(local);
    expect(await snapshot(freshDevice)).toEqual(local);
    freshDevice.close();
  });
});
