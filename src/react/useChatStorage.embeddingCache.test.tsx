// @vitest-environment happy-dom
/**
 * The send path must hand a caller-supplied `embeddingCache` to the user-message embedding, and it
 * must key that cache on the RAW text with `maskInput` applied only to the request body.
 *
 * Why both halves matter: a caller that needs the same vector (ranking tools itself, say) can only
 * share the cache if the keys coincide. Before this change the send pre-masked the argument, so the
 * key was the MASKED text while any caller holding the user's text would key on the raw string —
 * the Map would be shared and never hit, and the turn would still embed twice.
 *
 * Layering: this file asserts the THREADING (what the send passes down). That a populated cache
 * suppresses the HTTP request is `generateEmbedding`'s own behaviour and is asserted against the
 * real implementation at the bottom, with fetch stubbed, rather than re-implemented here.
 */

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

import { useChatStorage } from "./useChatStorage";

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

// Clears MIN_CONTENT_LENGTH_FOR_TOOLS, short enough to stay a single embedding.
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
    // Not the Map itself but a view onto it, namespaced by this send's masking decision (see
    // MaskScopedEmbeddingCache) -- reads and writes go through to the caller's Map.
    const view = embedCalls[0]!.options.cache as Map<string, Float32Array>;
    view.set("hello", Float32Array.from([1]));
    expect(view.get("hello")).toEqual(Float32Array.from([1]));
    expect([...cache.keys()]).toEqual(["r:hello"]);
  });

  it("keys the cache on the RAW text, masking only the request body", async () => {
    // PII in the text is what makes this discriminating: pre-masking the argument (the old shape)
    // would key on "[EMAIL]…" while a caller holding the user's text keys on the raw string, so the
    // shared Map would never hit. The body still goes out masked — via the maskInput option, which
    // generateEmbedding applies after the cache lookup.
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
    // The masker the send handed down is a real one on this path, not identity.
    expect(maskInput(withPii)).not.toContain(PII_EMAIL);
  });

  it("is unchanged when no cache is passed (back-compat)", async () => {
    const res = await send({});
    expect(res.error).toBeNull();
    expect(embedCalls).toHaveLength(1);
    expect(embedCalls[0]!.options.cache).toBeUndefined();
  });

  it("uses the stored user content as the key, not the injected wire text", async () => {
    // The wire turn carries injected context; storedUserContent is what the user typed. Tool
    // selection — and therefore the cache key a caller must match — follows the typed text.
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

// The other half of the contract, against the REAL generateEmbedding: a populated cache means no
// HTTP request. Network is faked at the fetch boundary, matching memoryEngine/embeddings.test.ts.
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
    // Same text, same key: masking is NOT part of generateEmbedding's key, and that is a pinned
    // contract (embeddings.test.ts, "keeps the cache keyed by original"). Which is exactly why the
    // send namespaces the Map it is handed rather than changing this -- see the suite below.
    await generateEmbedding(USER_TEXT, { ...base, maskInput: (x: string) => `[MASKED] ${x}` });
    expect(fetchCalls).toBe(1);
    expect(cache.size).toBe(1);
  });
});

// I-7: two callers sharing one Map must not be able to exchange a masked vector for an unmasked one.
// The send namespaces the Map it is handed, so the entries it writes carry the masking decision.
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

    // The mocked generateEmbedding never writes, so drive the returned view directly: what matters
    // is which key the send's cache view uses.
    const view = embedCalls[0]!.options.cache as Map<string, Float32Array>;
    view.set(USER_TEXT, Float32Array.from([1, 2, 3]));
    expect([...cache.keys()]).toEqual([`m:${USER_TEXT}`]);
    expect(view.get(USER_TEXT)).toEqual(Float32Array.from([1, 2, 3]));
    // An unmasked reader of the same Map does not see it.
    expect(cache.get(`r:${USER_TEXT}`)).toBeUndefined();
  });
});
