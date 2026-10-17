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

  type RawRow = Record<string, unknown> & { id: string; opensTo?: string };

  function rawRow(overrides: Partial<RawRow> & { id: string }): RawRow {
    return {
      role: "user",
      content: ciphertext,
      chunks: null,
      vector: null,
      origin: null,
      embedding_model: null,
      ...overrides,
    };
  }

  function stored(raw: RawRow): StoredMessage {
    const content = raw.opensTo ?? (raw.content as string);
    return makeMessage({
      uniqueId: raw.id,
      content,
      chunks: raw.chunks
        ? (JSON.parse(raw.chunks as string) as StoredMessage["chunks"])
        : undefined,
    });
  }

  function serveThroughRawFilter(rows: RawRow[]): void {
    vi.mocked(getMessagesOp).mockImplementation(async (_ctx, _convId, opts) =>
      rows.filter((raw) => opts?.rawFilter?.(raw) ?? true).map(stored)
    );
    vi.mocked(getMessageOp).mockImplementation(async (_ctx, id) => {
      const raw = rows.find((r) => r.id === id);
      return raw ? stored(raw) : null;
    });
  }

  const embedded = JSON.stringify([{ vector: [1, 2, 3], startOffset: 0, endOffset: 6 }]);

  it("chunkAndEmbedAllMessages reports the skip on the error channel with structured counts", async () => {
    stubFetchOk();
    serveThroughRawFilter([
      rawRow({ id: "sealed" }),
      rawRow({ id: "prose", content: longText("readable") }),
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

  it("reports sealed rows the pre-filter drops when the key cannot open them", async () => {
    stubFetchOk();
    serveThroughRawFilter([rawRow({ id: "sealed-and-chunked", chunks: embedded })]);

    expect(await chunkAndEmbedAllMessages(ctx, { apiKey: "k", baseUrl: BASE })).toBe(0);

    expect(getMessageOp).toHaveBeenCalledTimes(1);
    expect(errors).toHaveLength(1);
    const [, , context] = errors[0];
    expect(context).toEqual({
      stillEncrypted: 0,
      considered: 0,
      sealedRowsSeen: 1,
      rowsSeen: 1,
    });
  });

  it("stays quiet for a fully indexed vault whose key opens the probed row", async () => {
    stubFetchOk();
    serveThroughRawFilter([
      rawRow({ id: "a", chunks: embedded, opensTo: longText("readable") }),
      rawRow({ id: "b", chunks: embedded, opensTo: longText("also readable") }),
    ]);

    expect(await chunkAndEmbedAllMessages(ctx, { apiKey: "k", baseUrl: BASE })).toBe(0);

    expect(getMessageOp).toHaveBeenCalledTimes(1);
    expect(errors).toEqual([]);
  });

  it("skips the probe when a decrypted candidate already proved the key", async () => {
    stubFetchOk();
    serveThroughRawFilter([
      rawRow({ id: "indexed", chunks: embedded }),
      rawRow({ id: "fresh", opensTo: longText("readable") }),
    ]);

    expect(await chunkAndEmbedAllMessages(ctx, { apiKey: "k", baseUrl: BASE })).toBe(1);

    expect(getMessageOp).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
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

describe("chunkAndEmbedAllMessages raw pre-filter (decrypt only what may need embedding)", () => {
  const ctx = {} as StorageOperationsContext;
  const MODEL = "qwen/qwen3-embedding-8b";
  const sealed = (hexLength: number): string => `enc:v3:${"a".repeat(hexLength)}`;

  async function capturedRawFilter(
    filter?: Parameters<typeof chunkAndEmbedAllMessages>[2]
  ): Promise<(raw: Record<string, unknown>) => boolean> {
    vi.mocked(getConversationsOp).mockResolvedValue([
      { conversationId: "c1" } as StoredConversation,
    ]);
    vi.mocked(getMessagesOp).mockResolvedValue([]);
    await chunkAndEmbedAllMessages(ctx, { apiKey: "k", baseUrl: BASE, model: MODEL }, filter);
    const opts = vi.mocked(getMessagesOp).mock.calls[0][2] as {
      rawFilter: (raw: Record<string, unknown>) => boolean;
    };
    return opts.rawFilter;
  }

  const row = (overrides: Record<string, unknown>): Record<string, unknown> => ({
    role: "user",
    content: sealed(400),
    chunks: null,
    vector: null,
    origin: null,
    embedding_model: null,
    ...overrides,
  });

  it("drops rows that already hold chunks or a vector, plain or sealed, before decrypting", async () => {
    const keep = await capturedRawFilter();

    expect(keep(row({ chunks: JSON.stringify([{ vector: [1], startOffset: 0 }]) }))).toBe(false);
    expect(keep(row({ vector: JSON.stringify([0.1, 0.2]) }))).toBe(false);
    expect(keep(row({ vector: sealed(4000) }))).toBe(false);
    expect(keep(row({ chunks: sealed(4000) }))).toBe(false);
  });

  it("drops system rows and non-embeddable origins", async () => {
    const keep = await capturedRawFilter();

    expect(keep(row({ role: "system" }))).toBe(false);
    expect(keep(row({ origin: "tool_result" }))).toBe(false);
    expect(keep(row({ origin: CHUNKS_DISCARDED_ORIGIN }))).toBe(false);
  });

  it("keeps rows with nothing embedded, an empty array, or a sealed column too short to judge", async () => {
    const keep = await capturedRawFilter();

    expect(keep(row({}))).toBe(true);
    expect(keep(row({ chunks: "[]", vector: "[]" }))).toBe(true);
    expect(keep(row({ vector: sealed(60) }))).toBe(true);
  });

  it("keeps an embedded row built with a different model (stale) and honours rechunkExisting", async () => {
    const keep = await capturedRawFilter({ rechunkExisting: true });

    expect(keep(row({ chunks: "[1]", embedding_model: "old-model" }))).toBe(true);
    expect(keep(row({ vector: "[0.1]" }))).toBe(true);
    expect(keep(row({ chunks: "[1]", embedding_model: MODEL }))).toBe(false);
  });

  it("honours the roles filter", async () => {
    const keep = await capturedRawFilter({ roles: ["assistant"] });

    expect(keep(row({ role: "user" }))).toBe(false);
    expect(keep(row({ role: "assistant" }))).toBe(true);
  });
});

describe("legacy tool-result rows without origin are not embedded", () => {
  const ctx = {} as StorageOperationsContext;

  beforeEach(() => {
    vi.mocked(getConversationsOp).mockResolvedValue([
      { conversationId: "c1" } as StoredConversation,
    ]);
    vi.mocked(updateMessageEmbeddingOp).mockResolvedValue(null);
    vi.mocked(updateMessageChunksOp).mockResolvedValue(null);
  });

  it("skips a decrypted legacy tool-result dump but still chunks real prose", async () => {
    const fetchMock = stubFetchOk();
    const now = new Date();
    vi.mocked(getMessagesOp).mockResolvedValue([
      {
        uniqueId: "legacy-dump",
        messageId: 1,
        conversationId: "c1",
        role: "user",
        content: `[Tool Execution Results]\n\n${'Tool "gmail_search" returned: {"id":"abc"}\n'.repeat(80)}`,
        createdAt: now,
        updatedAt: now,
      },
      {
        uniqueId: "prose",
        messageId: 2,
        conversationId: "c1",
        role: "user",
        content: "a long thing the user wrote. ".repeat(120),
        createdAt: now,
        updatedAt: now,
      },
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
    expect(JSON.stringify(recorded)).not.toContain("[Tool Execution Results]");
  });

  it("still embeds a user message that merely quotes the [Tool Execution Results] heading", async () => {
    const fetchMock = stubFetchOk();
    const now = new Date();
    vi.mocked(getMessagesOp).mockResolvedValue([
      {
        uniqueId: "quoted",
        messageId: 1,
        conversationId: "c1",
        role: "user",
        content: "[Tool Execution Results] what does this heading in my export mean?",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    expect(await chunkAndEmbedAllMessages(ctx, { apiKey: "k", baseUrl: BASE })).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateMessageEmbeddingOp).toHaveBeenCalledWith(
      ctx,
      "quoted",
      expect.any(Array),
      expect.any(String)
    );
  });
});
