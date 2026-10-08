import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/chat/operations", () => ({
  getConversationsOp: vi.fn(),
  getMessageOp: vi.fn(),
  getMessagesOp: vi.fn(),
  updateMessageChunksOp: vi.fn(),
  updateMessageEmbeddingOp: vi.fn(),
}));

import {
  getConversationsOp,
  getMessageOp,
  getMessagesOp,
  type StorageOperationsContext,
  updateMessageChunksOp,
  updateMessageEmbeddingOp,
} from "../db/chat/operations";
import type { StoredConversation, StoredMessage } from "../db/chat/types";

import {
  CHUNKS_DISCARDED_ORIGIN,
  chunkAndEmbedAllMessages,
  chunkAndEmbedMessage,
  EmbeddingHttpError,
  embedAllMessages,
  embedMessage,
  generateEmbedding,
  generateEmbeddings,
  isFatalEmbeddingError,
} from "./embeddings";
import { PiiRedactor } from "../pii/redactor";
import { type Logger, noopLogger, setLogger } from "../logger";

function embeddingFor(text: string): number[] {
  return [text.length, text.charCodeAt(0) ?? 0, 1];
}

interface RecordedRequest {
  url: string;
  headers: Headers;
  input: string | string[];
}

const recorded: RecordedRequest[] = [];

function stubFetchOk(usage?: {
  prompt_tokens?: number;
  total_tokens?: number;
}): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { input: string | string[] };
    recorded.push({
      url: String(url),
      headers: new Headers(init?.headers as HeadersInit),
      input: body.input,
    });
    const inputs = Array.isArray(body.input) ? body.input : [body.input];
    return new Response(
      JSON.stringify({
        data: inputs.map((t, index) => ({ embedding: embeddingFor(t), index })),
        ...(usage && { usage }),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function stubFetchError(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const BASE = "https://portal.test";

beforeEach(() => {
  vi.clearAllMocks();
  recorded.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateEmbedding", () => {
  it("returns the cached vector without hitting the API on cache hit", async () => {
    const fetchMock = stubFetchOk();
    const cache = new Map<string, Float32Array>([
      ["hello there world", Float32Array.from([9, 9, 9])],
    ]);

    const result = await generateEmbedding("hello there world", {
      apiKey: "k",
      baseUrl: BASE,
      cache,
    });

    expect(result).toEqual([9, 9, 9]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls the API on cache miss and stores the result in the cache", async () => {
    const fetchMock = stubFetchOk();
    const cache = new Map<string, Float32Array>();

    const first = await generateEmbedding("brand new text", { apiKey: "k", baseUrl: BASE, cache });

    expect(first).toEqual(embeddingFor("brand new text"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(recorded[0].url).toBe(`${BASE}/api/v1/embeddings`);
    expect(recorded[0].input).toBe("brand new text");
    expect(cache.get("brand new text")).toEqual(Float32Array.from(embeddingFor("brand new text")));

    const second = await generateEmbedding("brand new text", { apiKey: "k", baseUrl: BASE, cache });
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses X-API-Key auth when apiKey is provided", async () => {
    stubFetchOk();
    await generateEmbedding("some text", { apiKey: "secret-key", baseUrl: BASE });
    expect(recorded[0].headers.get("X-API-Key")).toBe("secret-key");
    expect(recorded[0].headers.get("Authorization")).toBeNull();
  });

  it("uses Bearer auth via getToken when no apiKey is provided", async () => {
    stubFetchOk();
    await generateEmbedding("some text", {
      getToken: async () => "tok-123",
      baseUrl: BASE,
    });
    expect(recorded[0].headers.get("Authorization")).toBe("Bearer tok-123");
  });

  it("throws when neither apiKey nor getToken is provided, or token is null", async () => {
    const fetchMock = stubFetchOk();
    await expect(generateEmbedding("text", { baseUrl: BASE })).rejects.toThrow(
      /apiKey or getToken/
    );
    await expect(
      generateEmbedding("text", { getToken: async () => null, baseUrl: BASE })
    ).rejects.toThrow(/No token available/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws the API error message on a non-OK response and does not cache", async () => {
    stubFetchError(500, { error: "gateway exploded" });
    const cache = new Map<string, Float32Array>();
    await expect(generateEmbedding("text", { apiKey: "k", baseUrl: BASE, cache })).rejects.toThrow(
      "gateway exploded"
    );
    expect(cache.size).toBe(0);
  });

  it("throws a generic error when the non-OK body has no error field", async () => {
    stubFetchError(500, { message: "nope" });
    await expect(generateEmbedding("text", { apiKey: "k", baseUrl: BASE })).rejects.toThrow(
      "API embedding failed"
    );
  });

  it("throws an EmbeddingHttpError carrying the HTTP status on a 402", async () => {
    stubFetchError(402, { error: "insufficient balance" });
    await expect(generateEmbedding("text", { apiKey: "k", baseUrl: BASE })).rejects.toMatchObject({
      status: 402,
      message: "insufficient balance",
    });
  });

  it("does not retry a 402 (non-retryable) — one request, not EMBED_MAX_ATTEMPTS", async () => {
    const fetchMock = stubFetchError(402, { error: "insufficient balance" });
    await expect(generateEmbedding("text", { apiKey: "k", baseUrl: BASE })).rejects.toBeInstanceOf(
      EmbeddingHttpError
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when the API returns no embedding payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
      )
    );
    await expect(generateEmbedding("text", { apiKey: "k", baseUrl: BASE })).rejects.toThrow(
      "No embedding returned from API"
    );
  });

  it("retries when fetch itself throws (network error) and succeeds on a later attempt", async () => {
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls++;
      if (calls < 2) throw new Error("ECONNRESET");
      return new Response(
        JSON.stringify({ data: [{ embedding: embeddingFor("net"), index: 0 }] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await generateEmbedding("net", { apiKey: "k", baseUrl: BASE });
    expect(result).toEqual(embeddingFor("net"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("re-throws after exhausting retries when fetch keeps throwing", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateEmbedding("text", { apiKey: "k", baseUrl: BASE })).rejects.toThrow(
      "ECONNRESET"
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("fires onUsage with mapped token counts when the API reports usage", async () => {
    stubFetchOk({ prompt_tokens: 7, total_tokens: 9 });
    const onUsage = vi.fn();
    await generateEmbedding("text", { apiKey: "k", baseUrl: BASE, onUsage });
    expect(onUsage).toHaveBeenCalledTimes(1);
    expect(onUsage).toHaveBeenCalledWith({ promptTokens: 7, totalTokens: 9 });
  });

  it("does not fire onUsage when the API omits usage", async () => {
    stubFetchOk();
    const onUsage = vi.fn();
    await generateEmbedding("text", { apiKey: "k", baseUrl: BASE, onUsage });
    expect(onUsage).not.toHaveBeenCalled();
  });

  it("applies maskInput to the request body but keeps the cache keyed by original", async () => {
    const fetchMock = stubFetchOk();
    const cache = new Map<string, Float32Array>();
    const maskInput = (t: string) => t.replace("bob@acme.com", "[EMAIL]");

    await generateEmbedding("email bob@acme.com", { apiKey: "k", baseUrl: BASE, cache, maskInput });

    expect(recorded[0].input).toBe("email [EMAIL]");
    expect(cache.has("email bob@acme.com")).toBe(true);
    await generateEmbedding("email bob@acme.com", { apiKey: "k", baseUrl: BASE, cache, maskInput });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("generateEmbeddings (batch)", () => {
  it("returns [] for empty input without calling the API", async () => {
    const fetchMock = stubFetchOk();
    expect(await generateEmbeddings([], { apiKey: "k", baseUrl: BASE })).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends only uncached texts and preserves input order in the result", async () => {
    const fetchMock = stubFetchOk();
    const cache = new Map<string, Float32Array>([["beta", Float32Array.from([42, 42, 42])]]);

    const result = await generateEmbeddings(["alpha", "beta", "gamma"], {
      apiKey: "k",
      baseUrl: BASE,
      cache,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(recorded[0].input).toEqual(["alpha", "gamma"]);
    expect(result).toEqual([embeddingFor("alpha"), [42, 42, 42], embeddingFor("gamma")]);
    expect(cache.get("alpha")).toEqual(Float32Array.from(embeddingFor("alpha")));
    expect(cache.get("gamma")).toEqual(Float32Array.from(embeddingFor("gamma")));
  });

  it("masks repeated PII to the same stateless token across batched chunks", async () => {
    stubFetchOk();
    const redactor = new PiiRedactor();
    const maskInput = (t: string) => redactor.maskText(t);

    await generateEmbeddings(["contact bob@acme.com now", "email bob@acme.com again"], {
      apiKey: "k",
      baseUrl: BASE,
      maskInput,
    });

    expect(recorded[0].input).toEqual(["contact [EMAIL] now", "email [EMAIL] again"]);
  });

  it("returns entirely from cache without an API call when all texts are cached", async () => {
    const fetchMock = stubFetchOk();
    const cache = new Map<string, Float32Array>([
      ["a", Float32Array.from([1])],
      ["b", Float32Array.from([2])],
    ]);
    const result = await generateEmbeddings(["a", "b"], { apiKey: "k", baseUrl: BASE, cache });
    expect(result).toEqual([[1], [2]]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("splits inputs larger than batchSize into multiple API calls, order preserved", async () => {
    const fetchMock = stubFetchOk();
    const texts = ["t1", "t2", "t3", "t4", "t5"];

    const result = await generateEmbeddings(texts, { apiKey: "k", baseUrl: BASE, batchSize: 2 });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const sentInputs = recorded.map((r) => r.input);
    expect(sentInputs).toContainEqual(["t1", "t2"]);
    expect(sentInputs).toContainEqual(["t3", "t4"]);
    expect(sentInputs).toContainEqual(["t5"]);
    expect(result).toEqual(texts.map(embeddingFor));
  });

  it("propagates API errors", async () => {
    stubFetchError(500, { error: "boom" });
    await expect(generateEmbeddings(["a"], { apiKey: "k", baseUrl: BASE })).rejects.toThrow("boom");
  });

  it("fires onUsage per batch API call", async () => {
    stubFetchOk({ prompt_tokens: 3, total_tokens: 4 });
    const onUsage = vi.fn();
    await generateEmbeddings(["a", "b", "c"], {
      apiKey: "k",
      baseUrl: BASE,
      batchSize: 2,
      onUsage,
    });
    expect(onUsage).toHaveBeenCalledTimes(2);
    expect(onUsage).toHaveBeenCalledWith({ promptTokens: 3, totalTokens: 4 });
  });
});

describe("embedAllMessages content filtering", () => {
  const ctx = {} as StorageOperationsContext;

  function makeMessage(overrides: Partial<StoredMessage>): StoredMessage {
    return {
      uniqueId: "m-default",
      messageId: 1,
      conversationId: "c1",
      role: "user",
      content: "default content long enough",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.mocked(getConversationsOp).mockResolvedValue([
      { conversationId: "c1" } as StoredConversation,
    ]);
    vi.mocked(updateMessageEmbeddingOp).mockResolvedValue(null);
  });

  it("skips messages shorter than the default min length (10), system roles, and already-embedded", async () => {
    const fetchMock = stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ uniqueId: "short", content: "ok" }),
      makeMessage({ uniqueId: "system", role: "system", content: "a long system prompt here" }),
      makeMessage({ uniqueId: "embedded", content: "already has a vector", vector: [1, 2] }),
      makeMessage({ uniqueId: "eligible", content: "this one is plenty long to embed" }),
    ]);

    const count = await embedAllMessages(ctx, { apiKey: "k", baseUrl: BASE });

    expect(count).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(recorded[0].input).toBe("this one is plenty long to embed");
    expect(updateMessageEmbeddingOp).toHaveBeenCalledTimes(1);
    expect(updateMessageEmbeddingOp).toHaveBeenCalledWith(
      ctx,
      "eligible",
      embeddingFor("this one is plenty long to embed"),
      expect.any(String)
    );
  });

  it("respects a custom minContentLength filter", async () => {
    const fetchMock = stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ uniqueId: "borderline", content: "12 chars ok!" }),
    ]);

    const count = await embedAllMessages(
      ctx,
      { apiKey: "k", baseUrl: BASE },
      {
        minContentLength: 30,
      }
    );

    expect(count).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("aborts the whole pass on a 402 instead of re-firing per message (the prod storm)", async () => {
    const fetchMock = stubFetchError(402, { error: "insufficient balance" });
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ uniqueId: "m1", content: "first message plenty long to embed" }),
      makeMessage({ uniqueId: "m2", content: "second message plenty long to embed" }),
      makeMessage({ uniqueId: "m3", content: "third message plenty long to embed" }),
    ]);

    await expect(embedAllMessages(ctx, { apiKey: "k", baseUrl: BASE })).rejects.toBeInstanceOf(
      EmbeddingHttpError
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateMessageEmbeddingOp).not.toHaveBeenCalled();
  });

  it("does NOT abort on a non-fatal status (404) — logs and continues per message", async () => {
    const fetchMock = stubFetchError(404, { error: "not found" });
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ uniqueId: "m1", content: "first message plenty long to embed" }),
      makeMessage({ uniqueId: "m2", content: "second message plenty long to embed" }),
    ]);

    const count = await embedAllMessages(ctx, { apiKey: "k", baseUrl: BASE });
    expect(count).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("isFatalEmbeddingError", () => {
  it("is true for auth/payment/forbidden EmbeddingHttpErrors (non-retryable, corpus-wide)", () => {
    for (const status of [401, 402, 403]) {
      expect(isFatalEmbeddingError(new EmbeddingHttpError("x", status))).toBe(true);
    }
  });

  it("is false for transient statuses, unknown status, and non-EmbeddingHttpErrors", () => {
    expect(isFatalEmbeddingError(new EmbeddingHttpError("x", 429))).toBe(false);
    expect(isFatalEmbeddingError(new EmbeddingHttpError("x", 500))).toBe(false);
    expect(isFatalEmbeddingError(new EmbeddingHttpError("x", undefined))).toBe(false);
    expect(isFatalEmbeddingError(new Error("plain"))).toBe(false);
    expect(isFatalEmbeddingError(undefined)).toBe(false);
  });
});

describe("chunkAndEmbedAllMessages retry-storm guard", () => {
  const ctx = {} as StorageOperationsContext;

  function makeMessage(overrides: Partial<StoredMessage>): StoredMessage {
    return {
      uniqueId: "m-default",
      messageId: 1,
      conversationId: "c1",
      role: "user",
      content: "short message plenty long to embed",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.mocked(getConversationsOp).mockResolvedValue([
      { conversationId: "c1" } as StoredConversation,
    ]);
    vi.mocked(updateMessageEmbeddingOp).mockResolvedValue(null);
    vi.mocked(updateMessageChunksOp).mockResolvedValue(null);
  });

  it("aborts the pass on a 402 in the short-message batch after one request", async () => {
    const fetchMock = stubFetchError(402, { error: "insufficient balance" });
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ uniqueId: "a", content: "short message one, plenty long" }),
      makeMessage({ uniqueId: "b", content: "short message two, plenty long" }),
    ]);

    await expect(
      chunkAndEmbedAllMessages(ctx, { apiKey: "k", baseUrl: BASE })
    ).rejects.toBeInstanceOf(EmbeddingHttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateMessageEmbeddingOp).not.toHaveBeenCalled();
  });
});

describe("embedMessage / chunkAndEmbedMessage — O(1) indexed lookup (D4)", () => {
  const ctx = {} as StorageOperationsContext;

  it("embedMessage resolves the message by id (not a full-history scan)", async () => {
    stubFetchOk();
    vi.mocked(getMessageOp).mockResolvedValue({
      uniqueId: "m2",
      content: "hello world",
    } as unknown as StoredMessage);
    vi.mocked(updateMessageEmbeddingOp).mockResolvedValue({
      uniqueId: "m2",
    } as unknown as StoredMessage);

    await embedMessage(ctx, "m2", { apiKey: "k", baseUrl: BASE });

    expect(getMessageOp).toHaveBeenCalledWith(ctx, "m2");
    expect(getConversationsOp).not.toHaveBeenCalled();
    expect(getMessagesOp).not.toHaveBeenCalled();
    const [, id, vector] = vi.mocked(updateMessageEmbeddingOp).mock.calls[0];
    expect(id).toBe("m2");
    expect(vector).toEqual(embeddingFor("hello world"));
  });

  it("embedMessage skips the API when the message already has a vector", async () => {
    const fetchMock = stubFetchOk();
    vi.mocked(getMessageOp).mockResolvedValue({
      uniqueId: "m1",
      content: "hi",
      vector: [1, 2, 3],
    } as unknown as StoredMessage);

    const result = await embedMessage(ctx, "m1", { apiKey: "k", baseUrl: BASE });

    expect(result?.uniqueId).toBe("m1");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateMessageEmbeddingOp).not.toHaveBeenCalled();
  });

  it("embedMessage returns null for an unknown id", async () => {
    vi.mocked(getMessageOp).mockResolvedValue(null);
    expect(await embedMessage(ctx, "gone", { apiKey: "k", baseUrl: BASE })).toBeNull();
    expect(getMessagesOp).not.toHaveBeenCalled();
  });

  it("chunkAndEmbedMessage resolves by id and returns null when not found", async () => {
    vi.mocked(getMessageOp).mockResolvedValue(null);
    expect(await chunkAndEmbedMessage(ctx, "gone", { apiKey: "k", baseUrl: BASE })).toBeNull();
    expect(getMessageOp).toHaveBeenCalledWith(ctx, "gone");
    expect(getConversationsOp).not.toHaveBeenCalled();
  });
});

describe("origin: 'tool_result' is never embedded (sdk#861)", () => {
  const ctx = {} as StorageOperationsContext;

  const longText = (label: string): string => `${label}. `.repeat(120);

  function makeMessage(overrides: Partial<StoredMessage>): StoredMessage {
    return {
      uniqueId: "m-default",
      messageId: 1,
      conversationId: "c1",
      role: "user",
      content: "default content long enough",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.mocked(getConversationsOp).mockResolvedValue([
      { conversationId: "c1" } as StoredConversation,
    ]);
    vi.mocked(updateMessageEmbeddingOp).mockResolvedValue(null);
    vi.mocked(updateMessageChunksOp).mockResolvedValue(null);
  });

  it("chunkAndEmbedAllMessages skips the dump but still chunks a long real message", async () => {
    const fetchMock = stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({
        uniqueId: "dump",
        content: longText('Tool "gmail_search" returned'),
        origin: "tool_result",
      }),
      makeMessage({ uniqueId: "prose", content: longText("a long thing the user wrote") }),
    ]);

    const count = await chunkAndEmbedAllMessages(ctx, { apiKey: "k", baseUrl: BASE });

    expect(count).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateMessageChunksOp).toHaveBeenCalledTimes(1);
    expect(updateMessageChunksOp).toHaveBeenCalledWith(
      ctx,
      "prose",
      expect.any(Array),
      expect.any(String)
    );
  });

  it("chunkAndEmbedAllMessages still embeds a legacy row whose origin is unset", async () => {
    const fetchMock = stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ uniqueId: "legacy", content: longText("written before v44") }),
    ]);

    expect(await chunkAndEmbedAllMessages(ctx, { apiKey: "k", baseUrl: BASE })).toBe(1);
    expect(fetchMock).toHaveBeenCalled();
    expect(updateMessageChunksOp).toHaveBeenCalledWith(
      ctx,
      "legacy",
      expect.any(Array),
      expect.any(String)
    );
  });

  it("chunkAndEmbedMessage returns the dump unchanged without calling the API", async () => {
    const fetchMock = stubFetchOk();
    const dump = makeMessage({
      uniqueId: "dump",
      content: longText('Tool "github_api" returned'),
      origin: "tool_result",
    });
    vi.mocked(getMessageOp).mockResolvedValue(dump);

    expect(await chunkAndEmbedMessage(ctx, "dump", { apiKey: "k", baseUrl: BASE })).toBe(dump);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateMessageChunksOp).not.toHaveBeenCalled();
    expect(updateMessageEmbeddingOp).not.toHaveBeenCalled();
  });

  it("embedMessage leaves a tagged row's vector unset but still embeds an untagged one", async () => {
    const fetchMock = stubFetchOk();
    const dump = makeMessage({
      uniqueId: "dump",
      content: "tool output, long enough to embed",
      origin: "tool_result",
    });
    vi.mocked(getMessageOp).mockResolvedValue(dump);

    expect(await embedMessage(ctx, "dump", { apiKey: "k", baseUrl: BASE })).toBe(dump);
    expect(dump.vector).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateMessageEmbeddingOp).not.toHaveBeenCalled();

    const prose = makeMessage({ uniqueId: "prose", content: "something the user typed" });
    vi.mocked(getMessageOp).mockResolvedValue(prose);

    await embedMessage(ctx, "prose", { apiKey: "k", baseUrl: BASE });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateMessageEmbeddingOp).toHaveBeenCalledWith(
      ctx,
      "prose",
      embeddingFor("something the user typed"),
      expect.any(String)
    );
  });

  it("embedAllMessages skips the dump but still embeds a normal message", async () => {
    const fetchMock = stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ uniqueId: "dump", content: "tool output, long enough", origin: "tool_result" }),
      makeMessage({ uniqueId: "prose", content: "something the user typed" }),
    ]);

    expect(await embedAllMessages(ctx, { apiKey: "k", baseUrl: BASE })).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(recorded[0].input).toBe("something the user typed");
    expect(updateMessageEmbeddingOp).toHaveBeenCalledTimes(1);
    expect(updateMessageEmbeddingOp).toHaveBeenCalledWith(
      ctx,
      "prose",
      expect.any(Array),
      expect.any(String)
    );
  });
});

describe("origin: 'chunks_discarded' is never re-embedded (client#5618)", () => {
  const ctx = {} as StorageOperationsContext;

  const longText = (label: string): string => `${label}. `.repeat(120);

  function makeMessage(overrides: Partial<StoredMessage>): StoredMessage {
    return {
      uniqueId: "m-default",
      messageId: 1,
      conversationId: "c1",
      role: "user",
      content: "default content long enough",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.mocked(getConversationsOp).mockResolvedValue([
      { conversationId: "c1" } as StoredConversation,
    ]);
    vi.mocked(updateMessageEmbeddingOp).mockResolvedValue(null);
    vi.mocked(updateMessageChunksOp).mockResolvedValue(null);
  });

  it("chunkAndEmbedAllMessages skips a discarded row but still chunks a real one", async () => {
    const fetchMock = stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({
        uniqueId: "discarded",
        content: longText("an ordinary message whose chunks were binned"),
        origin: CHUNKS_DISCARDED_ORIGIN,
      }),
      makeMessage({ uniqueId: "prose", content: longText("a long thing the user wrote") }),
    ]);

    expect(await chunkAndEmbedAllMessages(ctx, { apiKey: "k", baseUrl: BASE })).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateMessageChunksOp).toHaveBeenCalledTimes(1);
    expect(updateMessageChunksOp).toHaveBeenCalledWith(
      ctx,
      "prose",
      expect.any(Array),
      expect.any(String)
    );
  });

  it("chunkAndEmbedMessage returns a discarded row unchanged without calling the API", async () => {
    const fetchMock = stubFetchOk();
    const discarded = makeMessage({
      uniqueId: "discarded",
      content: longText("an ordinary message"),
      origin: CHUNKS_DISCARDED_ORIGIN,
    });
    vi.mocked(getMessageOp).mockResolvedValue(discarded);

    expect(await chunkAndEmbedMessage(ctx, "discarded", { apiKey: "k", baseUrl: BASE })).toBe(
      discarded
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateMessageChunksOp).not.toHaveBeenCalled();
  });

  it("embedMessage skips a discarded row", async () => {
    const fetchMock = stubFetchOk();
    const discarded = makeMessage({
      uniqueId: "discarded",
      content: "an ordinary message, long enough",
      origin: CHUNKS_DISCARDED_ORIGIN,
    });
    vi.mocked(getMessageOp).mockResolvedValue(discarded);

    expect(await embedMessage(ctx, "discarded", { apiKey: "k", baseUrl: BASE })).toBe(discarded);
    expect(discarded.vector).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateMessageEmbeddingOp).not.toHaveBeenCalled();
  });

  it("embedAllMessages skips a discarded row but still embeds a normal one", async () => {
    const fetchMock = stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({
        uniqueId: "discarded",
        content: "an ordinary message, long enough",
        origin: CHUNKS_DISCARDED_ORIGIN,
      }),
      makeMessage({ uniqueId: "prose", content: "something the user typed" }),
    ]);

    expect(await embedAllMessages(ctx, { apiKey: "k", baseUrl: BASE })).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateMessageEmbeddingOp).toHaveBeenCalledTimes(1);
    expect(updateMessageEmbeddingOp).toHaveBeenCalledWith(
      ctx,
      "prose",
      expect.any(Array),
      expect.any(String)
    );
  });

  it("chunkAndEmbedAllMessages re-chunks a discarded row when reembedDiscarded is set", async () => {
    const fetchMock = stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({
        uniqueId: "discarded",
        content: longText("an ordinary message whose chunks were binned"),
        origin: CHUNKS_DISCARDED_ORIGIN,
      }),
    ]);

    expect(
      await chunkAndEmbedAllMessages(
        ctx,
        { apiKey: "k", baseUrl: BASE },
        { reembedDiscarded: true }
      )
    ).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateMessageChunksOp).toHaveBeenCalledWith(
      ctx,
      "discarded",
      expect.any(Array),
      expect.any(String)
    );
  });

  it("embedAllMessages re-embeds a discarded row when reembedDiscarded is set", async () => {
    const fetchMock = stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({
        uniqueId: "discarded",
        content: "an ordinary message, long enough",
        origin: CHUNKS_DISCARDED_ORIGIN,
      }),
    ]);

    expect(
      await embedAllMessages(ctx, { apiKey: "k", baseUrl: BASE }, { reembedDiscarded: true })
    ).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateMessageEmbeddingOp).toHaveBeenCalledWith(
      ctx,
      "discarded",
      expect.any(Array),
      expect.any(String)
    );
  });

  it("reembedDiscarded does NOT re-open tool-result rows on either sweep", async () => {
    const fetchMock = stubFetchOk();
    const dump = { uniqueId: "dump", origin: "tool_result" as StoredMessage["origin"] };

    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ ...dump, content: longText("tool output") }),
    ]);
    expect(
      await chunkAndEmbedAllMessages(
        ctx,
        { apiKey: "k", baseUrl: BASE },
        { reembedDiscarded: true }
      )
    ).toBe(0);

    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ ...dump, content: "tool output, long enough" }),
    ]);
    expect(
      await embedAllMessages(ctx, { apiKey: "k", baseUrl: BASE }, { reembedDiscarded: true })
    ).toBe(0);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateMessageChunksOp).not.toHaveBeenCalled();
    expect(updateMessageEmbeddingOp).not.toHaveBeenCalled();
  });

  it("reembedDiscarded still refuses a discarded row whose content is ciphertext", async () => {
    const fetchMock = stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({
        uniqueId: "sealed",
        content: `enc:v3:${"a1b2c3d4e5f6".repeat(80)}`,
        origin: CHUNKS_DISCARDED_ORIGIN,
      }),
    ]);

    expect(
      await chunkAndEmbedAllMessages(
        ctx,
        { apiKey: "k", baseUrl: BASE },
        { reembedDiscarded: true }
      )
    ).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateMessageChunksOp).not.toHaveBeenCalled();
  });

  it("does not make every origin non-embeddable", async () => {
    const fetchMock = stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({
        uniqueId: "other",
        content: "something the user typed",
        origin: "some_future_origin" as StoredMessage["origin"],
      }),
    ]);

    expect(await embedAllMessages(ctx, { apiKey: "k", baseUrl: BASE })).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("ciphertext is never chunked or embedded (sdk#864)", () => {
  const ctx = {} as StorageOperationsContext;
  let warnings: string[] = [];
  let errors: unknown[][] = [];

  const ciphertext = `enc:v3:${"a1b2c3d4e5f6".repeat(80)}`;

  const longText = (label: string): string => `${label}. `.repeat(120);

  function makeMessage(overrides: Partial<StoredMessage>): StoredMessage {
    return {
      uniqueId: "m-default",
      messageId: 1,
      conversationId: "c1",
      role: "user",
      content: "default content long enough",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.mocked(getConversationsOp).mockResolvedValue([
      { conversationId: "c1" } as StoredConversation,
    ]);
    vi.mocked(updateMessageEmbeddingOp).mockResolvedValue(null);
    vi.mocked(updateMessageChunksOp).mockResolvedValue(null);
    warnings = [];
    errors = [];
    const spy: Logger = {
      ...noopLogger,
      warn: (...args: unknown[]) => {
        warnings.push(String(args[0]));
      },
      error: (...args: unknown[]) => {
        errors.push(args);
      },
    };
    setLogger(spy);
  });
  afterEach(() => setLogger(noopLogger));

  it("chunkAndEmbedAllMessages skips the encrypted row but still chunks a plaintext one", async () => {
    const fetchMock = stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ uniqueId: "sealed", content: ciphertext }),
      makeMessage({ uniqueId: "prose", content: longText("a long thing the user wrote") }),
    ]);

    const count = await chunkAndEmbedAllMessages(ctx, { apiKey: "k", baseUrl: BASE });

    expect(count).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateMessageChunksOp).toHaveBeenCalledTimes(1);
    expect(updateMessageChunksOp).toHaveBeenCalledWith(
      ctx,
      "prose",
      expect.any(Array),
      expect.any(String)
    );
    expect(JSON.stringify(recorded)).not.toContain("enc:v3:");
  });

  it("chunkAndEmbedAllMessages reports the skip on the error channel with structured counts", async () => {
    stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ uniqueId: "sealed", content: ciphertext }),
      makeMessage({ uniqueId: "prose", content: longText("readable") }),
    ]);

    await chunkAndEmbedAllMessages(ctx, { apiKey: "k", baseUrl: BASE });

    expect(errors).toHaveLength(1);
    expect(warnings).toEqual([]);
    const [message, error, context] = errors[0];
    expect(String(message)).toContain("still encrypted");
    expect(error).toBeUndefined();
    expect(context).toEqual({
      stillEncrypted: 1,
      considered: 2,
      sealedRowsSeen: 1,
      rowsSeen: 2,
    });
  });

  it("reports a sealed row that never reaches the candidate counter", async () => {
    stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({
        uniqueId: "sealed-and-chunked",
        content: ciphertext,
        chunks: [{ text: "a1b2c3", vector: [1, 2, 3], startOffset: 0, endOffset: 6 }],
      }),
    ]);

    expect(await chunkAndEmbedAllMessages(ctx, { apiKey: "k", baseUrl: BASE })).toBe(0);

    expect(errors).toHaveLength(1);
    const [, , context] = errors[0];
    expect(context).toEqual({
      stillEncrypted: 0,
      considered: 0,
      sealedRowsSeen: 1,
      rowsSeen: 1,
    });
  });

  it("chunkAndEmbedAllMessages stays quiet when every row is readable", async () => {
    stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ uniqueId: "prose", content: longText("readable") }),
    ]);

    expect(await chunkAndEmbedAllMessages(ctx, { apiKey: "k", baseUrl: BASE })).toBe(1);
    expect(warnings).toEqual([]);
    expect(errors).toEqual([]);
  });

  it("chunkAndEmbedMessage returns the encrypted row unchanged without calling the API", async () => {
    const fetchMock = stubFetchOk();
    const sealed = makeMessage({ uniqueId: "sealed", content: ciphertext });
    vi.mocked(getMessageOp).mockResolvedValue(sealed);

    expect(await chunkAndEmbedMessage(ctx, "sealed", { apiKey: "k", baseUrl: BASE })).toBe(sealed);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateMessageChunksOp).not.toHaveBeenCalled();
    expect(updateMessageEmbeddingOp).not.toHaveBeenCalled();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("sealed");

    const prose = makeMessage({ uniqueId: "prose", content: longText("something the user typed") });
    vi.mocked(getMessageOp).mockResolvedValue(prose);

    await chunkAndEmbedMessage(ctx, "prose", { apiKey: "k", baseUrl: BASE });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateMessageChunksOp).toHaveBeenCalledWith(
      ctx,
      "prose",
      expect.any(Array),
      expect.any(String)
    );
  });

  it("chunkAndEmbedMessage still embeds a short plaintext row that merely looks prefixed", async () => {
    const fetchMock = stubFetchOk();
    const prose = makeMessage({
      uniqueId: "prose",
      content: "enc:v3: is the prefix we use for encrypted fields",
    });
    vi.mocked(getMessageOp).mockResolvedValue(prose);

    await chunkAndEmbedMessage(ctx, "prose", { apiKey: "k", baseUrl: BASE });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateMessageEmbeddingOp).toHaveBeenCalledTimes(1);
    expect(warnings).toEqual([]);
  });

  it("embedMessage returns the encrypted row unchanged without calling the API", async () => {
    const fetchMock = stubFetchOk();
    const sealed = makeMessage({ uniqueId: "sealed", content: ciphertext });
    vi.mocked(getMessageOp).mockResolvedValue(sealed);

    expect(await embedMessage(ctx, "sealed", { apiKey: "k", baseUrl: BASE })).toBe(sealed);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateMessageEmbeddingOp).not.toHaveBeenCalled();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("sealed");

    const prose = makeMessage({ uniqueId: "prose", content: "something the user actually typed" });
    vi.mocked(getMessageOp).mockResolvedValue(prose);

    await embedMessage(ctx, "prose", { apiKey: "k", baseUrl: BASE });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateMessageEmbeddingOp).toHaveBeenCalledWith(
      ctx,
      "prose",
      expect.any(Array),
      expect.any(String)
    );
    expect(JSON.stringify(recorded)).not.toContain("enc:v3:");
  });

  it("embedAllMessages skips the encrypted row and reports the skip with structured counts", async () => {
    const fetchMock = stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ uniqueId: "sealed", content: ciphertext }),
      makeMessage({ uniqueId: "prose", content: "something the user actually typed" }),
    ]);

    const count = await embedAllMessages(ctx, { apiKey: "k", baseUrl: BASE });

    expect(count).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateMessageEmbeddingOp).toHaveBeenCalledTimes(1);
    expect(updateMessageEmbeddingOp).toHaveBeenCalledWith(
      ctx,
      "prose",
      expect.any(Array),
      expect.any(String)
    );
    expect(JSON.stringify(recorded)).not.toContain("enc:v3:");

    expect(warnings).toEqual([]);
    expect(errors).toHaveLength(1);
    const [message, error, context] = errors[0];
    expect(String(message)).toContain("still encrypted");
    expect(error).toBeUndefined();
    expect(context).toEqual({
      stillEncrypted: 1,
      considered: 2,
      sealedRowsSeen: 1,
      rowsSeen: 2,
    });
  });

  it("embedAllMessages reports a sealed row that already has a vector", async () => {
    stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ uniqueId: "sealed-and-vectored", content: ciphertext, vector: [1, 2, 3] }),
    ]);

    expect(await embedAllMessages(ctx, { apiKey: "k", baseUrl: BASE })).toBe(0);

    expect(errors).toHaveLength(1);
    const [, , context] = errors[0];
    expect(context).toEqual({
      stillEncrypted: 0,
      considered: 0,
      sealedRowsSeen: 1,
      rowsSeen: 1,
    });
  });

  it("embedAllMessages stays quiet when every row is readable", async () => {
    stubFetchOk();
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ uniqueId: "prose", content: "something the user actually typed" }),
    ]);

    expect(await embedAllMessages(ctx, { apiKey: "k", baseUrl: BASE })).toBe(1);
    expect(warnings).toEqual([]);
    expect(errors).toEqual([]);
  });
});
