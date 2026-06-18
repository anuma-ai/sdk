import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./retain", () => ({
  retain: vi.fn(),
}));

vi.mock("../db/entities/operations", () => ({
  linkMemoryEntitiesOp: vi.fn().mockResolvedValue([]),
}));

import { linkMemoryEntitiesOp } from "../db/entities/operations";

import { retain } from "./retain";

import { extractAndRetain, extractFacts, type AutoExtractMessage } from "./autoExtract";

function mockFetch(content: string, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => ({
      choices: [{ message: { content } }],
    }),
  }) as unknown as typeof fetch;
}

const messages: AutoExtractMessage[] = [
  { id: "m1", role: "user", content: "I just adopted a golden retriever named Biscuit." },
  { id: "m2", role: "assistant", content: "Congrats! How old is Biscuit?" },
  { id: "m3", role: "user", content: "She's 3. We live in Portland." },
];

describe("extractFacts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] for empty messages", async () => {
    const result = await extractFacts([], {
      apiKey: "k",
      fetchFn: vi.fn() as unknown as typeof fetch,
    });
    expect(result).toEqual([]);
  });

  it("parses well-formed candidates", async () => {
    const candidates = {
      candidates: [
        {
          content: "Has a golden retriever named Biscuit",
          type: "relationship",
          confidence: 0.95,
          sourceMessageIds: ["m1"],
          entities: ["Biscuit"],
        },
        {
          content: "Lives in Portland",
          type: "identity",
          confidence: 0.85,
          sourceMessageIds: ["m3"],
          entities: ["Portland"],
        },
      ],
    };
    const result = await extractFacts(messages, {
      apiKey: "k",
      fetchFn: mockFetch(JSON.stringify(candidates)),
    });
    expect(result).toHaveLength(2);
    expect(result[0].content).toBe("Has a golden retriever named Biscuit");
    expect(result[0].type).toBe("relationship");
    expect(result[0].entities).toEqual(["Biscuit"]);
  });

  it("filters out candidates with hallucinated source IDs", async () => {
    const candidates = {
      candidates: [
        {
          content: "Real fact",
          type: "preference",
          confidence: 0.9,
          sourceMessageIds: ["m1"],
        },
        {
          content: "Hallucinated provenance",
          type: "preference",
          confidence: 0.9,
          sourceMessageIds: ["msg-that-doesnt-exist"],
        },
      ],
    };
    const result = await extractFacts(messages, {
      apiKey: "k",
      fetchFn: mockFetch(JSON.stringify(candidates)),
    });
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("Real fact");
  });

  it("filters out candidates exceeding the 200-char content cap", async () => {
    const longContent = "x".repeat(201);
    const candidates = {
      candidates: [
        {
          content: longContent,
          type: "other",
          confidence: 0.9,
          sourceMessageIds: ["m1"],
        },
      ],
    };
    const result = await extractFacts(messages, {
      apiKey: "k",
      fetchFn: mockFetch(JSON.stringify(candidates)),
    });
    expect(result).toEqual([]);
  });

  it("returns [] on malformed JSON", async () => {
    const result = await extractFacts(messages, {
      apiKey: "k",
      fetchFn: mockFetch("not-valid-json"),
    });
    expect(result).toEqual([]);
  });

  it("returns [] on HTTP error", async () => {
    const result = await extractFacts(messages, {
      apiKey: "k",
      fetchFn: mockFetch("{}", false),
    });
    expect(result).toEqual([]);
  });

  it("returns [] on network error (doesn't throw)", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("ECONNRESET")) as unknown as typeof fetch;
    const result = await extractFacts(messages, { apiKey: "k", fetchFn });
    expect(result).toEqual([]);
  });

  it("retries once on a failed/empty completion, then succeeds", async () => {
    // First call: empty completion content (null) → retry. Second: real facts.
    const candidates = {
      candidates: [
        {
          content: "Lives in Portland",
          type: "identity",
          confidence: 0.9,
          sourceMessageIds: ["m3"],
        },
      ],
    };
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "" } }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify(candidates) } }] }),
      }) as unknown as typeof fetch;
    const result = await extractFacts(messages, { apiKey: "k", fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("Lives in Portland");
  });

  it("does not retry a successful empty result ({candidates: []})", async () => {
    // A legit "no durable facts" is non-null and must not trigger a retry.
    const fetchFn = mockFetch(JSON.stringify({ candidates: [] }));
    const result = await extractFacts(messages, { apiKey: "k", fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });

  it("gives up after the retry when both attempts fail", async () => {
    const fetchFn = mockFetch("not-valid-json");
    const result = await extractFacts(messages, { apiKey: "k", fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result).toEqual([]);
  });

  it("falls back to type=other for unknown types", async () => {
    const candidates = {
      candidates: [
        {
          content: "Foo",
          type: "weird-unknown-type",
          confidence: 0.9,
          sourceMessageIds: ["m1"],
        },
      ],
    };
    const result = await extractFacts(messages, {
      apiKey: "k",
      fetchFn: mockFetch(JSON.stringify(candidates)),
    });
    expect(result[0].type).toBe("other");
  });

  it("requires non-empty sourceMessageIds (skips bare facts)", async () => {
    const candidates = {
      candidates: [
        { content: "Foo", type: "other", confidence: 0.9, sourceMessageIds: [] },
        { content: "Bar", type: "other", confidence: 0.9, sourceMessageIds: ["m1"] },
      ],
    };
    const result = await extractFacts(messages, {
      apiKey: "k",
      fetchFn: mockFetch(JSON.stringify(candidates)),
    });
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("Bar");
  });

  it("clamps confidence to [0, 1]", async () => {
    const candidates = {
      candidates: [
        { content: "x", type: "other", confidence: 1.5, sourceMessageIds: ["m1"] },
        { content: "y", type: "other", confidence: -0.2, sourceMessageIds: ["m1"] },
      ],
    };
    const result = await extractFacts(messages, {
      apiKey: "k",
      fetchFn: mockFetch(JSON.stringify(candidates)),
    });
    expect(result[0].confidence).toBe(1);
    expect(result[1].confidence).toBe(0);
  });
});

describe("extractAndRetain", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters by minConfidence and writes via retain", async () => {
    const candidates = {
      candidates: [
        {
          content: "Has a golden retriever named Biscuit",
          type: "relationship",
          confidence: 0.95,
          sourceMessageIds: ["m1"],
          entities: ["Biscuit"],
        },
        {
          content: "Maybe likes coffee",
          type: "preference",
          confidence: 0.5, // below default 0.7 threshold
          sourceMessageIds: ["m1"],
        },
      ],
    };
    vi.mocked(retain).mockResolvedValue({
      action: "create",
      memoryId: "new-id",
      proofCount: 1,
    });

    const result = await extractAndRetain(
      messages,
      {
        vaultCtx: {} as never,
        embeddingOptions: { apiKey: "embed-k" },
        vaultCache: new Map(),
      },
      { extract: { apiKey: "k", fetchFn: mockFetch(JSON.stringify(candidates)) } }
    );

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].content).toContain("Biscuit");
    expect(result.results).toHaveLength(1);
    expect(vi.mocked(retain)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(retain)).toHaveBeenCalledWith(
      "Has a golden retriever named Biscuit",
      expect.anything(),
      expect.objectContaining({
        source: "auto-extracted",
        sourceChunkIds: ["m1"],
      })
    );
  });

  it("survives a per-fact retain failure and continues", async () => {
    const candidates = {
      candidates: [
        { content: "fact 1", type: "other", confidence: 0.9, sourceMessageIds: ["m1"] },
        { content: "fact 2", type: "other", confidence: 0.9, sourceMessageIds: ["m1"] },
      ],
    };
    vi.mocked(retain)
      .mockRejectedValueOnce(new Error("transient db error"))
      .mockResolvedValueOnce({ action: "create", memoryId: "id2", proofCount: 1 });

    const result = await extractAndRetain(
      messages,
      {
        vaultCtx: {} as never,
        embeddingOptions: { apiKey: "k" },
        vaultCache: new Map(),
      },
      { extract: { apiKey: "k", fetchFn: mockFetch(JSON.stringify(candidates)) } }
    );

    // Candidates and results stay length-aligned: only the survivor of the
    // mid-batch retain failure is returned, so consumers can safely pair
    // candidates[i] with results[i].
    expect(result.candidates).toHaveLength(1);
    expect(result.results).toHaveLength(1);
    expect(result.candidates[0].content).toBe("fact 2");
    expect(result.results[0].memoryId).toBe("id2");
  });

  it("respects custom minConfidence", async () => {
    const candidates = {
      candidates: [
        { content: "high", type: "other", confidence: 0.95, sourceMessageIds: ["m1"] },
        { content: "mid", type: "other", confidence: 0.85, sourceMessageIds: ["m1"] },
      ],
    };
    vi.mocked(retain).mockResolvedValue({ action: "create", memoryId: "id", proofCount: 1 });

    const result = await extractAndRetain(
      messages,
      {
        vaultCtx: {} as never,
        embeddingOptions: { apiKey: "k" },
        vaultCache: new Map(),
      },
      {
        extract: { apiKey: "k", fetchFn: mockFetch(JSON.stringify(candidates)) },
        minConfidence: 0.9,
      }
    );

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].content).toBe("high");
  });

  it("links entities when entityCtx is provided", async () => {
    const candidates = {
      candidates: [
        {
          content: "Has a partner named Sara",
          type: "relationship",
          confidence: 0.95,
          sourceMessageIds: ["m1"],
          entities: ["Sara"],
        },
      ],
    };
    vi.mocked(retain).mockResolvedValue({
      action: "create",
      memoryId: "mem-1",
      proofCount: 1,
    });
    const entityCtx = { stub: true } as never;

    await extractAndRetain(
      messages,
      {
        vaultCtx: {} as never,
        embeddingOptions: { apiKey: "k" },
        vaultCache: new Map(),
      },
      {
        extract: { apiKey: "k", fetchFn: mockFetch(JSON.stringify(candidates)) },
        entityCtx,
      }
    );

    expect(vi.mocked(linkMemoryEntitiesOp)).toHaveBeenCalledWith(entityCtx, "mem-1", ["Sara"]);
  });

  it("does not call linkMemoryEntitiesOp when entityCtx is omitted", async () => {
    const candidates = {
      candidates: [
        {
          content: "x",
          type: "other",
          confidence: 0.9,
          sourceMessageIds: ["m1"],
          entities: ["foo"],
        },
      ],
    };
    vi.mocked(retain).mockResolvedValue({ action: "create", memoryId: "mem-2", proofCount: 1 });

    await extractAndRetain(
      messages,
      { vaultCtx: {} as never, embeddingOptions: { apiKey: "k" }, vaultCache: new Map() },
      { extract: { apiKey: "k", fetchFn: mockFetch(JSON.stringify(candidates)) } }
    );

    expect(vi.mocked(linkMemoryEntitiesOp)).not.toHaveBeenCalled();
  });

  it("skips entity linking when candidate has no entities", async () => {
    const candidates = {
      candidates: [
        { content: "x", type: "other", confidence: 0.9, sourceMessageIds: ["m1"], entities: [] },
      ],
    };
    vi.mocked(retain).mockResolvedValue({ action: "create", memoryId: "mem-3", proofCount: 1 });

    await extractAndRetain(
      messages,
      { vaultCtx: {} as never, embeddingOptions: { apiKey: "k" }, vaultCache: new Map() },
      {
        extract: { apiKey: "k", fetchFn: mockFetch(JSON.stringify(candidates)) },
        entityCtx: {} as never,
      }
    );

    expect(vi.mocked(linkMemoryEntitiesOp)).not.toHaveBeenCalled();
  });

  it("entity-link failure doesn't kill the rest of the batch", async () => {
    const candidates = {
      candidates: [
        {
          content: "fact 1",
          type: "other",
          confidence: 0.9,
          sourceMessageIds: ["m1"],
          entities: ["A"],
        },
        {
          content: "fact 2",
          type: "other",
          confidence: 0.9,
          sourceMessageIds: ["m1"],
          entities: ["B"],
        },
      ],
    };
    vi.mocked(retain)
      .mockResolvedValueOnce({ action: "create", memoryId: "id1", proofCount: 1 })
      .mockResolvedValueOnce({ action: "create", memoryId: "id2", proofCount: 1 });
    vi.mocked(linkMemoryEntitiesOp)
      .mockRejectedValueOnce(new Error("link failed"))
      .mockResolvedValueOnce([]);

    const result = await extractAndRetain(
      messages,
      { vaultCtx: {} as never, embeddingOptions: { apiKey: "k" }, vaultCache: new Map() },
      {
        extract: { apiKey: "k", fetchFn: mockFetch(JSON.stringify(candidates)) },
        entityCtx: {} as never,
      }
    );

    // Both retains succeeded even though one entity link failed.
    expect(result.results).toHaveLength(2);
    expect(vi.mocked(linkMemoryEntitiesOp)).toHaveBeenCalledTimes(2);
  });

  it("forwards consolidateOptions to each retain() call", async () => {
    const candidates = {
      candidates: [{ content: "fact", type: "other", confidence: 0.9, sourceMessageIds: ["m1"] }],
    };
    vi.mocked(retain).mockResolvedValue({ action: "create", memoryId: "id", proofCount: 1 });
    const onFallback = vi.fn();
    const consolidateOptions = { apiKey: "k", model: "openai/gpt-5-mini", onFallback };

    await extractAndRetain(
      messages,
      { vaultCtx: {} as never, embeddingOptions: { apiKey: "k" }, vaultCache: new Map() },
      {
        extract: { apiKey: "k", fetchFn: mockFetch(JSON.stringify(candidates)) },
        consolidateOptions,
      }
    );

    expect(vi.mocked(retain)).toHaveBeenCalledWith(
      "fact",
      expect.anything(),
      expect.objectContaining({ consolidateOptions })
    );
  });

  it("does not pass consolidateOptions to retain when omitted", async () => {
    const candidates = {
      candidates: [{ content: "fact", type: "other", confidence: 0.9, sourceMessageIds: ["m1"] }],
    };
    vi.mocked(retain).mockResolvedValue({ action: "create", memoryId: "id", proofCount: 1 });

    await extractAndRetain(
      messages,
      { vaultCtx: {} as never, embeddingOptions: { apiKey: "k" }, vaultCache: new Map() },
      { extract: { apiKey: "k", fetchFn: mockFetch(JSON.stringify(candidates)) } }
    );

    expect(vi.mocked(retain).mock.calls[0][2]).not.toHaveProperty("consolidateOptions");
  });
});

describe("extractFacts — PII redaction", () => {
  beforeEach(() => vi.clearAllMocks());

  /** Fetch mock that records each request body so we can assert what reached the wire. */
  function capturingFetch(content: string): { fetchFn: typeof fetch; bodies: string[] } {
    const bodies: string[] = [];
    const fetchFn = vi.fn().mockImplementation((_url: string, init?: { body?: unknown }) => {
      bodies.push(typeof init?.body === "string" ? init.body : "");
      return Promise.resolve({
        ok: true,
        json: async () => ({ choices: [{ message: { content } }] }),
      });
    }) as unknown as typeof fetch;
    return { fetchFn, bodies };
  }

  const piiMessages: AutoExtractMessage[] = [
    { id: "m1", role: "user", content: "Reach me at jane@example.com or 415-555-0199." },
  ];

  it("redacts the transcript before it reaches the extraction model", async () => {
    const { fetchFn, bodies } = capturingFetch(JSON.stringify({ candidates: [] }));
    await extractFacts(piiMessages, { apiKey: "k", fetchFn, piiRedaction: true });

    const sent = bodies.join("");
    expect(sent).not.toContain("jane@example.com");
    expect(sent).not.toContain("415-555-0199");
    expect(sent).toContain("[EMAIL_1]");
    expect(sent).toContain("[PHONE_1]");
  });

  it("de-anonymizes returned fact content and entities back to the real values", async () => {
    const llm = {
      candidates: [
        {
          content: "User's email is [EMAIL_1]",
          type: "identity",
          confidence: 0.95,
          sourceMessageIds: ["m1"],
          entities: ["[EMAIL_1]"],
        },
      ],
    };
    const { fetchFn } = capturingFetch(JSON.stringify(llm));
    const result = await extractFacts(piiMessages, { apiKey: "k", fetchFn, piiRedaction: true });

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("User's email is jane@example.com");
    expect(result[0].entities).toEqual(["jane@example.com"]);
  });

  it("leaves the transcript raw when redaction is disabled (default)", async () => {
    const { fetchFn, bodies } = capturingFetch(JSON.stringify({ candidates: [] }));
    await extractFacts(piiMessages, { apiKey: "k", fetchFn });
    expect(bodies.join("")).toContain("jane@example.com");
  });
});
