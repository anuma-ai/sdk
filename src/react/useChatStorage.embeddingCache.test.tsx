// @vitest-environment happy-dom

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import type { ServerTool } from "../lib/tools";

type EmbedCall = { text: string; options: Record<string, unknown> };
const embedCalls: EmbedCall[] = [];

vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...orig, runToolLoop: vi.fn() };
});

vi.mock("../lib/memoryEngine/generate", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/memoryEngine/generate")>();
  return {
    ...orig,
    generateEmbedding: (text: string, options: Record<string, unknown>) => {
      embedCalls.push({ text, options });
      return Promise.resolve([0.1, 0.2, 0.3]);
    },
    generateEmbeddings: async (texts: string[]) => texts.map(() => [0.1, 0.2, 0.3]),
  };
});

vi.mock("../lib/tools", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/tools")>();
  return { ...orig, getServerTools: async () => [] as ServerTool[] };
});

import { runToolLoop } from "../lib/chat/toolLoop";

import { maskScopedEmbeddingCache, useChatStorage } from "./useChatStorage";

const mockRunToolLoop = vi.mocked(runToolLoop);

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `embedding-cache-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

const USER_TEXT = "book me a table for four tonight";
const PII_EMAIL = "alice@example.com";
const USER_MESSAGE = [{ role: "user" as const, content: [{ type: "text", text: USER_TEXT }] }];
const CLIENT_TOOLS = [
  { type: "function" as const, function: { name: "client_a", description: "a" } },
];

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

describe("useChatStorage embeddingCache passthrough", () => {
  let db: Database;

  beforeEach(() => {
    vi.clearAllMocks();
    embedCalls.length = 0;
    db = makeDatabase();
    mockRunToolLoop.mockResolvedValue({
      data: responsesShape("done"),
      error: null,
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function send(args: Record<string, unknown>) {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: `conv_${Math.random().toString(36).slice(2)}`,
        getToken: async () => "tok",
      })
    );
    return result.current.sendMessage({
      messages: USER_MESSAGE,
      model: "test-model",
      clientTools: CLIENT_TOOLS,
      ...args,
    } as never);
  }

  it("passes the caller's cache to the user-message embedding", async () => {
    const cache = new Map<string, Float32Array>();
    const res = await send({ embeddingCache: cache });
    expect(res.error).toBeNull();

    expect(embedCalls).toHaveLength(1);
    const view = embedCalls[0]!.options.cache as Map<string, Float32Array>;
    view.set("hello", Float32Array.from([1]));
    expect(view.get("hello")).toEqual(Float32Array.from([1]));
    expect([...cache.keys()]).toEqual(["r:hello"]);
  });

  it("keys the cache on the RAW text, masking only the request body", async () => {
    const withPii = `email me at ${PII_EMAIL} about the report`;
    const cache = new Map<string, Float32Array>();
    await send({
      messages: [{ role: "user" as const, content: [{ type: "text", text: withPii }] }],
      embeddingCache: cache,
      piiRedaction: true,
    });

    expect(embedCalls).toHaveLength(1);
    expect(embedCalls[0]!.text).toBe(withPii);
    expect(embedCalls[0]!.text).toContain(PII_EMAIL);
    const maskInput = embedCalls[0]!.options.maskInput as (t: string) => string;
    expect(typeof maskInput).toBe("function");
    expect(maskInput(withPii)).not.toContain(PII_EMAIL);
  });

  it("is unchanged when no cache is passed (back-compat)", async () => {
    const res = await send({});
    expect(res.error).toBeNull();
    expect(embedCalls).toHaveLength(1);
    expect(embedCalls[0]!.options.cache).toBeUndefined();
  });

  it("uses the stored user content as the key, not the injected wire text", async () => {
    const cache = new Map<string, Float32Array>();
    await send({
      messages: [
        {
          role: "user" as const,
          content: [
            { type: "text", text: "Relevant memories:\nlikes window seats" },
            { type: "text", text: USER_TEXT },
          ],
        },
      ],
      storedUserContent: USER_TEXT,
      embeddingCache: cache,
    });

    expect(embedCalls).toHaveLength(1);
    expect(embedCalls[0]!.text).toBe(USER_TEXT);
  });
});

describe("generateEmbedding with a shared cache", () => {
  let fetchCalls: number;

  beforeEach(() => {
    fetchCalls = 0;
    vi.stubGlobal("fetch", async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not issue a second request for the same text", async () => {
    const { generateEmbedding } = await vi.importActual<
      typeof import("../lib/memoryEngine/generate")
    >("../lib/memoryEngine/generate");
    const cache = new Map<string, Float32Array>();
    const options = { getToken: async () => "tok", cache };

    const first = await generateEmbedding(USER_TEXT, options);
    expect(fetchCalls).toBe(1);

    const second = await generateEmbedding(USER_TEXT, options);
    expect(fetchCalls).toBe(1);
    expect(second).toEqual(first);
  });

  it("keys on the text alone -- the caller namespaces, not this helper", async () => {
    const { generateEmbedding } = await vi.importActual<
      typeof import("../lib/memoryEngine/generate")
    >("../lib/memoryEngine/generate");
    const cache = new Map<string, Float32Array>();
    const base = { getToken: async () => "tok", cache };

    await generateEmbedding(USER_TEXT, base);
    await generateEmbedding(USER_TEXT, { ...base, maskInput: (x: string) => `[MASKED] ${x}` });
    expect(fetchCalls).toBe(1);
    expect(cache.size).toBe(1);
  });
});

describe("shared cache is namespaced by masking decision", () => {
  let db: Database;

  beforeEach(() => {
    vi.clearAllMocks();
    embedCalls.length = 0;
    db = makeDatabase();
    mockRunToolLoop.mockResolvedValue({
      data: responsesShape("done"),
      error: null,
    } as never);
  });

  it("writes under a different key when redaction is on", async () => {
    const cache = new Map<string, Float32Array>();

    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_mask_scope",
        getToken: async () => "tok",
      })
    );
    await result.current.sendMessage({
      messages: USER_MESSAGE,
      model: "test-model",
      clientTools: CLIENT_TOOLS,
      embeddingCache: cache,
      piiRedaction: true,
    } as never);

    const view = embedCalls[0]!.options.cache as Map<string, Float32Array>;
    view.set(USER_TEXT, Float32Array.from([1, 2, 3]));
    expect([...cache.keys()]).toEqual([`m:${USER_TEXT}`]);
    expect(view.get(USER_TEXT)).toEqual(Float32Array.from([1, 2, 3]));
    expect(cache.get(`r:${USER_TEXT}`)).toBeUndefined();
  });

  it("shares with a caller that wraps the same Map via maskScopedEmbeddingCache", async () => {
    const shared = new Map<string, Float32Array>();
    const vector = Float32Array.from([9, 9, 9]);

    maskScopedEmbeddingCache(shared, false).set(USER_TEXT, vector);

    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_mask_share",
        getToken: async () => "tok",
      })
    );
    await result.current.sendMessage({
      messages: USER_MESSAGE,
      model: "test-model",
      clientTools: CLIENT_TOOLS,
      embeddingCache: shared,
    } as never);

    const view = embedCalls[0]!.options.cache as Map<string, Float32Array>;
    expect(view.get(USER_TEXT)).toEqual(vector);
    expect([...shared.keys()]).toEqual([`r:${USER_TEXT}`]);
  });

  it("does not cross masking decisions, even through the exported view", async () => {
    const shared = new Map<string, Float32Array>();
    maskScopedEmbeddingCache(shared, true).set(USER_TEXT, Float32Array.from([1]));

    expect(maskScopedEmbeddingCache(shared, false).get(USER_TEXT)).toBeUndefined();
    expect(maskScopedEmbeddingCache(shared, true).get(USER_TEXT)).toEqual(Float32Array.from([1]));
  });
});
