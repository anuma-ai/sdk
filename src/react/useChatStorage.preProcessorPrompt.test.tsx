// @vitest-environment happy-dom

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import type { ServerTool } from "../lib/tools";

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

vi.mock("../lib/tools", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/tools")>();
  return { ...orig, getServerTools: async () => [] as ServerTool[] };
});

import { runToolLoop } from "../lib/chat/toolLoop";

import { useChatStorage } from "./useChatStorage";

const mockRunToolLoop = vi.mocked(runToolLoop);

const TYPED = "top holders of BONK";
const INJECTED = [
  "Relevant memories:",
  "## Relevant Memories",
  "- likes memecoins",
  "Current time (precise): 2026-11-12T19:10:19Z",
  TYPED,
].join("\n");
const MESSAGES = [{ role: "user" as const, content: [{ type: "text", text: INJECTED }] }];

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `pre-processor-prompt-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

describe("useChatStorage preProcessorPrompt forwarding", () => {
  let db: Database;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeDatabase();
    mockRunToolLoop.mockResolvedValue({
      data: {
        id: "resp",
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

  async function send(args: Record<string, unknown>) {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: `conv_${Math.random().toString(36).slice(2)}`,
        getToken: async () => "tok",
        preProcessors: [async () => undefined],
      })
    );
    return result.current.sendMessage({
      messages: MESSAGES,
      model: "test-model",
      ...args,
    } as never);
  }

  it.each([false, true])(
    "hands pre-processors the stored user content, not the injected wire text (skipStorage: %s)",
    async (skipStorage) => {
      await send({ storedUserContent: TYPED, skipStorage });

      expect(mockRunToolLoop).toHaveBeenCalledTimes(1);
      const options = mockRunToolLoop.mock.calls[0]![0];
      expect(options.preProcessorPrompt).toBe(TYPED);
      expect(JSON.stringify(options.messages)).toContain("Current time (precise)");
    }
  );

  it("leaves the prompt to the tool loop when no stored user content is given", async () => {
    await send({});

    expect(mockRunToolLoop.mock.calls[0]![0].preProcessorPrompt).toBeUndefined();
  });
});
