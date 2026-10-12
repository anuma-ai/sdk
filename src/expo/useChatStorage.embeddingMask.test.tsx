// @vitest-environment happy-dom

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";

vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...orig, runToolLoop: vi.fn() };
});

vi.mock("../lib/memoryEngine", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/memoryEngine")>();
  return {
    ...orig,
    generateEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
  };
});

import { runToolLoop } from "../lib/chat/toolLoop";
import { generateEmbedding } from "../lib/memoryEngine";
import { useChatStorage } from "./useChatStorage";

const mockRunToolLoop = vi.mocked(runToolLoop);
const mockGenerateEmbedding = vi.mocked(generateEmbedding);

const EMAIL = "alice@example.com";
const USER_TEXT = `Please email me at ${EMAIL} about the quarterly report`;

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `embed-mask-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function responsesShape(text: string) {
  return {
    id: `resp-${Math.random().toString(36).slice(2)}`,
    model: "test-model",
    object: "response",
    output: [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text }],
        status: "completed",
      },
    ],
    usage: undefined,
  };
}

function embeddedTexts(): string[] {
  return mockGenerateEmbedding.mock.calls.map((c) => c[0]);
}

describe("useChatStorage per-call embedding masking (expo)", () => {
  let db: Database;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeDatabase();
    fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network"));
    mockRunToolLoop.mockResolvedValue({
      data: responsesShape("Sure, I will follow up."),
      error: null,
    } as never);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("masks the embedding input when a per-request piiRedaction:true overrides a hook-level OFF", async () => {
    const { result } = renderHook(() =>
      useChatStorage({ database: db, conversationId: "conv_mask", getToken: async () => "tok" })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: USER_TEXT }] }],
        model: "test-model",
        piiRedaction: true,
      });
    });

    await waitFor(() => expect(mockGenerateEmbedding).toHaveBeenCalled());

    const texts = embeddedTexts();
    expect(texts.some((t) => t.includes("[EMAIL]"))).toBe(true);
    expect(texts.some((t) => t.includes(EMAIL))).toBe(false);

    const stored = await result.current.getMessages("conv_mask");
    const userRow = stored.find((m) => m.role === "user");
    expect(userRow?.content).toBe(USER_TEXT);
  });

  it("leaves embedding input raw when redaction is off everywhere (OFF path unchanged)", async () => {
    const { result } = renderHook(() =>
      useChatStorage({ database: db, conversationId: "conv_off", getToken: async () => "tok" })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: USER_TEXT }] }],
        model: "test-model",
      });
    });

    await waitFor(() => expect(mockGenerateEmbedding).toHaveBeenCalled());

    const texts = embeddedTexts();
    expect(texts.some((t) => t.includes(EMAIL))).toBe(true);
    expect(texts.some((t) => t.includes("[EMAIL]"))).toBe(false);
  });
});

describe("useChatStorage embeddingCache passthrough (expo)", () => {
  let db: Database;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeDatabase();
    fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network"));
    mockRunToolLoop.mockResolvedValue({ data: responsesShape("done"), error: null } as never);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("shares the caller's cache, namespaced by the masking decision", async () => {
    const cache = new Map<string, Float32Array>();
    const { result } = renderHook(() =>
      useChatStorage({ database: db, conversationId: "conv_cache", getToken: async () => "tok" })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: USER_TEXT }] }],
        model: "test-model",
        serverTools: (_e: unknown, tools: { name: string }[]) => tools.map((t) => t.name),
        clientTools: [{ type: "function", function: { name: "client_a", description: "a" } }],
        embeddingCache: cache,
        piiRedaction: true,
      } as never);
    });

    await waitFor(() => expect(mockGenerateEmbedding).toHaveBeenCalled());
    const call = mockGenerateEmbedding.mock.calls.find(
      (c) => (c[1] as { cache?: unknown } | undefined)?.cache !== undefined
    );
    expect(call, "no embedding call received a cache").toBeDefined();

    const view = (call![1] as { cache: Map<string, Float32Array> }).cache;
    view.set(USER_TEXT, Float32Array.from([1, 2, 3]));
    expect([...cache.keys()]).toEqual([`m:${USER_TEXT}`]);
    expect(cache.get(`r:${USER_TEXT}`)).toBeUndefined();
  });
});
