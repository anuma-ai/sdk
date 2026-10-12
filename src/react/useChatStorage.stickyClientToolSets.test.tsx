// @vitest-environment happy-dom

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LlmapiChatCompletionTool } from "../client";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import { getToolName } from "../lib/tools";
import { resetRecentToolSets } from "../lib/tools/selection/recentToolSets";

function vectorFor(text: string): number[] {
  if (/email/i.test(text)) return [1, 0, 0, 0];
  if (/\bapp\b/i.test(text)) return [0, 1, 0, 0];
  if (/weather/i.test(text)) return [0, 0, 1, 0];
  return [0, 0, 0, 1];
}

vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...orig, runToolLoop: vi.fn() };
});
vi.mock("../lib/memoryEngine/generate", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/memoryEngine/generate")>();
  return {
    ...orig,
    generateEmbedding: async (text: string) => vectorFor(text),
    generateEmbeddings: async (texts: string[]) => texts.map(vectorFor),
  };
});
vi.mock("../lib/tools", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/tools")>();
  return { ...orig, getServerTools: async () => [] };
});

import { useChatStorage as useExpoChatStorage } from "../expo/useChatStorage";
import { runToolLoop } from "../lib/chat/toolLoop";
import { useChatStorage as useReactChatStorage } from "./useChatStorage";

function clientTool(name: string, description: string): LlmapiChatCompletionTool {
  return {
    type: "function",
    function: { name, description, parameters: { type: "object", properties: {} } },
  } as unknown as LlmapiChatCompletionTool;
}

const CLIENT_TOOLS = [
  clientTool("gmail_send_message", "Send an email"),
  clientTool("create_file", "Create a file for an app"),
  clientTool("display_weather", "Show the weather"),
];

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `sticky-client-tools-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

let conversationCount = 0;

const hooks = [
  ["react", useReactChatStorage],
  ["expo", useExpoChatStorage],
] as const;

describe.each(hooks)("useChatStorage carried connector tool sets (%s)", (label, useChatStorage) => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRecentToolSets();
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

  describe.each([false, true])("skipStorage=%s", (skipStorage) => {
    type SendOptions = {
      clientTools?: LlmapiChatCompletionTool[];
      clientToolsFilter?: (
        embedding: number[] | number[][] | null,
        tools: LlmapiChatCompletionTool[]
      ) => string[];
    };

    function openChat(conversationId?: string, database: Database = makeDatabase()) {
      const { result } = renderHook(() =>
        useChatStorage({ database, conversationId, getToken: async () => "tok" })
      );
      return async (text: string, options: SendOptions = {}): Promise<string[]> => {
        const before = vi.mocked(runToolLoop).mock.calls.length;
        await result.current.sendMessage({
          messages: [{ role: "user", content: [{ type: "text", text }] }],
          model: "test-model",
          serverTools: [],
          clientTools: CLIENT_TOOLS,
          skipStorage,
          ...options,
        });
        await waitFor(() => expect(result.current.conversationId).toBeTruthy());
        const calls = vi.mocked(runToolLoop).mock.calls;
        expect(calls.length).toBe(before + 1);
        const tools = (calls[calls.length - 1][0].tools ?? []) as LlmapiChatCompletionTool[];
        return tools.map(getToolName);
      };
    }

    const newConversation = () => `conv_carry_${++conversationCount}`;

    it("keeps the Gmail tools for the next two sends after an email request", async () => {
      const send = openChat(newConversation());
      expect(await send("send an email to a@b.com saying hi")).toContain("gmail_send_message");
      expect(await send("Yes")).toContain("gmail_send_message");
      expect(await send("ok")).toContain("gmail_send_message");
      expect(await send("ok")).not.toContain("gmail_send_message");
    });

    it.each<[string, SendOptions]>([
      [
        "an explicit client-tool filter",
        { clientToolsFilter: (_e, tools) => tools.map(getToolName) },
      ],
      ["no client tools", { clientTools: [] }],
    ])("counts a successful send with %s as a turn", async (_case, options) => {
      const send = openChat(newConversation());
      expect(await send("send an email to a@b.com saying hi")).toContain("gmail_send_message");
      await send("make a slide deck", options);
      expect(await send("Yes")).toContain("gmail_send_message");
      expect(await send("ok")).not.toContain("gmail_send_message");
    });

    it("does not count a failed send, so its retry keeps the Gmail tools", async () => {
      const send = openChat(newConversation());
      expect(await send("send an email to a@b.com saying hi")).toContain("gmail_send_message");
      vi.mocked(runToolLoop).mockResolvedValueOnce({
        data: null,
        error: "Network error",
      } as never);
      expect(await send("Yes")).toContain("gmail_send_message");
      expect(await send("Yes")).toContain("gmail_send_message");
      expect(await send("ok")).toContain("gmail_send_message");
      expect(await send("ok")).not.toContain("gmail_send_message");
    });

    if (label === "expo") {
      it("counts a detached send as exactly one turn", async () => {
        const send = openChat(newConversation());
        vi.mocked(runToolLoop).mockResolvedValueOnce({
          data: null,
          error: "Request detached",
          detached: true,
          resume: null,
        } as never);
        expect(await send("send an email to a@b.com saying hi")).toContain("gmail_send_message");
        expect(await send("Yes")).toContain("gmail_send_message");
        expect(await send("ok")).toContain("gmail_send_message");
        expect(await send("ok")).not.toContain("gmail_send_message");
      });
    }

    if (!skipStorage) {
      it("counts a stopped send whose partial reply was saved as one turn", async () => {
        const send = openChat(newConversation());
        vi.mocked(runToolLoop).mockResolvedValueOnce({
          data: {
            id: "resp-stopped",
            model: "test-model",
            object: "response",
            output: [
              {
                type: "message",
                role: "assistant",
                content: [{ type: "output_text", text: "Shall I send it?" }],
                status: "completed",
              },
            ],
          },
          error: "Request aborted",
        } as never);
        expect(await send("send an email to a@b.com saying hi")).toContain("gmail_send_message");
        expect(await send("Yes")).toContain("gmail_send_message");
        expect(await send("ok")).toContain("gmail_send_message");
        expect(await send("ok")).not.toContain("gmail_send_message");
      });

      it("keeps the Gmail tools on 'Yes' in a brand-new chat", async () => {
        const send = openChat();
        expect(await send("send an email to a@b.com saying hi")).toContain("gmail_send_message");
        expect(await send("Yes")).toContain("gmail_send_message");
      });
    }

    it("carries nothing after a prompt that matched no connector", async () => {
      const send = openChat(newConversation());
      expect(await send("what's the weather?")).toContain("display_weather");
      expect(await send("Yes")).toEqual([]);
    });

    it("does not carry the app-generation set", async () => {
      const send = openChat(newConversation());
      expect(await send("build me an app please")).toContain("create_file");
      expect(await send("lol")).toEqual([]);
    });

    it("keeps one conversation's carry out of another", async () => {
      const database = makeDatabase();
      const sendA = openChat(newConversation(), database);
      const sendB = openChat(newConversation(), database);
      expect(await sendA("send an email to a@b.com saying hi")).toContain("gmail_send_message");
      expect(await sendB("Yes")).toEqual([]);
    });

    it("keeps the carry apart for the same conversation id in two databases", async () => {
      const conversationId = newConversation();
      const sendA = openChat(conversationId, makeDatabase());
      const sendB = openChat(conversationId, makeDatabase());
      expect(await sendA("send an email to a@b.com saying hi")).toContain("gmail_send_message");
      expect(await sendB("Yes")).toEqual([]);
    });

    it("shares the carry between hook instances on one conversation", async () => {
      const database = makeDatabase();
      const conversationId = newConversation();
      const sendA = openChat(conversationId, database);
      const sendB = openChat(conversationId, database);
      expect(await sendA("send an email to a@b.com saying hi")).toContain("gmail_send_message");
      expect(await sendB("Yes")).toContain("gmail_send_message");
    });
  });
});
