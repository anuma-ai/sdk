// @vitest-environment happy-dom

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import type { ServerTool } from "../lib/tools";

const embedCalls: string[] = [];
let embedFails = false;

vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...orig, runToolLoop: vi.fn() };
});
vi.mock("../lib/memoryEngine/generate", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/memoryEngine/generate")>();
  return {
    ...orig,
    generateEmbedding: async (text: string) => {
      embedCalls.push(text);
      if (embedFails) throw new Error("embeddings down");
      return [0.1, 0.2, 0.3];
    },
    generateEmbeddings: async (texts: string[]) => texts.map(() => [0.1, 0.2, 0.3]),
  };
});
vi.mock("../lib/tools", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/tools")>();
  return { ...orig, getServerTools: async () => CATALOG };
});

import { useChatStorage as useExpoChatStorage } from "../expo/useChatStorage";
import { runToolLoop } from "../lib/chat/toolLoop";
import { previewToolSelection, useChatStorage as useReactChatStorage } from "./useChatStorage";

const RESTAURANT_TOOLS = [
  "AnumaPaymentsMCP-anuma_find_restaurant",
  "AnumaPaymentsMCP-anuma_check_restaurant_availability",
  "AnumaPaymentsMCP-anuma_book_restaurant",
];

function serverTool(name: string): ServerTool {
  return {
    type: "function",
    name,
    description: `${name} does something`,
    parameters: { type: "object", properties: {}, required: [] },
  };
}

const CATALOG = ["AnumaJinaMCP-search_web", ...RESTAURANT_TOOLS].map(serverTool);

const semanticMiss = () => [];

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `sticky-server-tools-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

beforeEach(() => {
  embedFails = false;
});

const hooks = [
  ["react", useReactChatStorage],
  ["expo", useExpoChatStorage],
] as const;

describe.each(hooks)("useChatStorage sticky server-tool sets (%s)", (_label, useChatStorage) => {
  beforeEach(() => {
    vi.clearAllMocks();
    embedCalls.length = 0;
    vi.mocked(runToolLoop).mockResolvedValue({
      data: {
        id: "resp-1",
        model: "test-model",
        object: "response",
        output: [
          {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: "done" }],
            status: "completed",
          },
        ],
      },
      error: null,
    } as never);
  });

  async function selectedServerTools(
    text: string,
    activeToolSets: string[] | undefined,
    skipStorage: boolean
  ): Promise<string[]> {
    const selection = vi.fn();
    const { result } = renderHook(() =>
      useChatStorage({
        database: makeDatabase(),
        conversationId: "conv_sticky",
        getToken: async () => "tok",
        activeToolSets,
        onToolSelection: selection,
      })
    );
    await result.current.sendMessage({
      messages: [{ role: "user", content: [{ type: "text", text }] }],
      model: "test-model",
      serverTools: semanticMiss,
      skipStorage,
    });
    expect(selection).toHaveBeenCalledTimes(1);
    return selection.mock.calls[0][0].serverToolNames;
  }

  describe.each([false, true])("skipStorage=%s", (skipStorage) => {
    it("keeps the booking tools on 'Retry' when the set is active", async () => {
      expect(await selectedServerTools("Retry", ["restaurant-booking"], skipStorage)).toEqual(
        RESTAURANT_TOOLS
      );
    });

    it("selects from the prompt alone when no set is active", async () => {
      expect(await selectedServerTools("Retry", undefined, skipStorage)).toEqual([]);
    });

    it("keeps the booking tools on 'okay', below the short-prompt gate", async () => {
      expect(await selectedServerTools("okay", ["restaurant-booking"], skipStorage)).toEqual(
        RESTAURANT_TOOLS
      );
      expect(embedCalls).toEqual([]);
    });

    it("sends no server tools on 'okay' when no set is active", async () => {
      expect(await selectedServerTools("okay", [], skipStorage)).toEqual([]);
    });

    it("keeps the booking tools when the embedding fails and the set is active", async () => {
      embedFails = true;
      expect(await selectedServerTools("Retry", ["restaurant-booking"], skipStorage)).toEqual(
        RESTAURANT_TOOLS
      );
      expect(embedCalls).not.toEqual([]);
    });

    it("sends no server tools when the embedding fails and no set is active", async () => {
      embedFails = true;
      expect(await selectedServerTools("Retry", undefined, skipStorage)).toEqual([]);
    });
  });
});

describe("previewToolSelection sticky server-tool sets", () => {
  const preview = (prompt: string, activeToolSets?: string[]) =>
    previewToolSelection({
      prompt,
      serverToolsFilter: semanticMiss,
      getToken: async () => "tok",
      activeToolSets,
    });

  it.each(["Retry", "okay"])("keeps the booking tools on %j when the set is active", async (p) => {
    expect((await preview(p, ["restaurant-booking"])).serverToolNames).toEqual(RESTAURANT_TOOLS);
  });

  it.each(["Retry", "okay"])("selects no server tools on %j when no set is active", async (p) => {
    expect((await preview(p)).serverToolNames).toEqual([]);
  });
});
