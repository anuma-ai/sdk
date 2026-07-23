import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/entities/operations", () => ({
  // Echo the requested entities (non-null = persisted); tests override with
  // null to simulate the in-write guard skipping.
  replaceMemoryEntitiesGuardedOp: vi.fn(
    async (_ctx: unknown, _id: string, entities: unknown[]) => entities
  ),
}));

// vaultMemoryToStored is exercised by its own tests — here it just surfaces the
// mock record's content. stampTopicsExtractedAtOp echoes the ids it was given
// (individual tests override to simulate declined stamps).
vi.mock("../db/memoryVault/operations", () => ({
  vaultMemoryToStored: vi.fn(async (record: { content: string }) => ({
    content: record.content,
  })),
  stampTopicsExtractedAtOp: vi.fn(async (_ctx: unknown, ids: readonly string[]) => [...ids]),
}));

import { replaceMemoryEntitiesGuardedOp } from "../db/entities/operations";
import {
  stampTopicsExtractedAtOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import {
  extractAndLinkEntitiesForMemoriesOp,
  extractEntitiesForMemories,
  TOPIC_EXTRACTION_BATCH_SIZE,
  type TopicExtractionInput,
} from "./topicExtract";

function topicResponse(memories: Array<{ id: string; entities?: unknown[] }>): string {
  return JSON.stringify({ memories });
}

function mockFetch(content: string): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  }) as unknown as typeof fetch;
}

describe("extractEntitiesForMemories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an empty map for empty input without calling the LLM", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const result = await extractEntitiesForMemories([], { apiKey: "k", fetchFn });
    expect(result.size).toBe(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("forwards endpointOverride to the request path (baseUrl + override)", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: topicResponse([{ id: "mem_1", entities: [] }]) } }],
      }),
    });
    await extractEntitiesForMemories([{ id: "mem_1", content: "fact" }], {
      apiKey: "k",
      baseUrl: "https://portal.test",
      endpointOverride: "/api/v1/utility/chat/completions",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(fetchFn.mock.calls[0][0]).toBe("https://portal.test/api/v1/utility/chat/completions");
  });

  it("parses entities per memory; omitted ids stay ABSENT (unanswered)", async () => {
    const fetchFn = mockFetch(
      topicResponse([
        { id: "mem_1", entities: [{ name: "ZetaChain", kind: "organization" }] },
        { id: "mem_2", entities: [] },
        { id: "mem_bogus", entities: [{ name: "Dropped" }] },
      ])
    );
    const result = await extractEntitiesForMemories(
      [
        { id: "mem_1", content: "Works at ZetaChain" },
        { id: "mem_2", content: "Likes tea" },
        { id: "mem_omitted", content: "Enjoys walks" },
      ],
      { apiKey: "k", fetchFn }
    );
    expect(result.get("mem_1")).toEqual([{ name: "ZetaChain", kind: "organization" }]);
    // Explicitly answered empty → present with [].
    expect(result.get("mem_2")).toEqual([]);
    // Omitted by the model → UNANSWERED, absent (never stamped-as-empty).
    expect(result.has("mem_omitted")).toBe(false);
    // Ids not in the batch are dropped.
    expect(result.has("mem_bogus")).toBe(false);
  });

  it("keeps the FIRST answer when the model duplicates an id", async () => {
    const fetchFn = mockFetch(
      topicResponse([
        { id: "mem_1", entities: [{ name: "First", kind: "concept" }] },
        { id: "mem_1", entities: [{ name: "Second", kind: "concept" }] },
      ])
    );
    const result = await extractEntitiesForMemories([{ id: "mem_1", content: "fact" }], {
      apiKey: "k",
      fetchFn,
    });
    expect(result.get("mem_1")).toEqual([{ name: "First", kind: "concept" }]);
  });

  it("chunks into batches of TOPIC_EXTRACTION_BATCH_SIZE", async () => {
    const memories: TopicExtractionInput[] = Array.from(
      { length: TOPIC_EXTRACTION_BATCH_SIZE + 2 },
      (_, i) => ({ id: `mem_${i}`, content: `fact ${i}` })
    );
    // Each call answers every id it was sent (echo-all), so both batches count.
    const fetchFn = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as {
        messages: Array<{ role: string; content: string }>;
      };
      const userMessage = body.messages.find((m) => m.role === "user")!.content;
      const ids = [...userMessage.matchAll(/\[(mem_\d+)\]/g)].map((m) => m[1]);
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: topicResponse(ids.map((id) => ({ id, entities: [] }))),
              },
            },
          ],
        }),
      };
    }) as unknown as typeof fetch;
    const result = await extractEntitiesForMemories(memories, { apiKey: "k", fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result.size).toBe(memories.length);
  });

  it("leaves memories of a failed batch ABSENT (not answered-empty)", async () => {
    const fetchFn = mockFetch("not-valid-json");
    const result = await extractEntitiesForMemories([{ id: "mem_1", content: "fact" }], {
      apiKey: "k",
      fetchFn,
      maxAttempts: 1,
    });
    expect(result.has("mem_1")).toBe(false);
    expect(result.size).toBe(0);
  });

  it("treats valid-JSON-but-wrong-shape as a failed batch, not answered-empty", async () => {
    // Parseable JSON with no `memories` array — stamping these as "no
    // entities" would make the whole batch permanently topic-less.
    const fetchFn = mockFetch(JSON.stringify({ topics: [{ id: "mem_1" }] }));
    const result = await extractEntitiesForMemories([{ id: "mem_1", content: "fact" }], {
      apiKey: "k",
      fetchFn,
      maxAttempts: 1,
    });
    expect(result.has("mem_1")).toBe(false);
    expect(result.size).toBe(0);
  });

  it("includes the existing-vocabulary note in the prompt when provided", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: topicResponse([]) } }],
      }),
    }) as unknown as typeof fetch;
    await extractEntitiesForMemories([{ id: "mem_1", content: "Uses Linear at work" }], {
      apiKey: "k",
      fetchFn,
      existingEntityNames: ["ZetaChain", "Linear"],
    });
    const body = JSON.parse(
      (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
    ) as { messages: Array<{ role: string; content: string }> };
    const userMessage = body.messages.find((m) => m.role === "user")!.content;
    expect(userMessage).toContain("ZetaChain, Linear");
    expect(userMessage).toContain("EXACT existing name");
  });

  it("omits the vocabulary note when no names are provided", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: topicResponse([]) } }],
      }),
    }) as unknown as typeof fetch;
    await extractEntitiesForMemories([{ id: "mem_1", content: "fact" }], {
      apiKey: "k",
      fetchFn,
    });
    const body = JSON.parse(
      (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
    ) as { messages: Array<{ role: string; content: string }> };
    const userMessage = body.messages.find((m) => m.role === "user")!.content;
    expect(userMessage).not.toContain("existing topics");
  });

  it("redacts PII from memory contents before the LLM call", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: topicResponse([]) } }],
      }),
    }) as unknown as typeof fetch;
    await extractEntitiesForMemories(
      [{ id: "mem_1", content: "Contact is sara@example.com for the project" }],
      { apiKey: "k", fetchFn, piiRedaction: true }
    );
    const rawBody = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string;
    expect(rawBody).not.toContain("sara@example.com");
  });

  it("redacts PII in the existing-vocabulary names too", async () => {
    // Vocabulary names are restored REAL values — under redaction they must
    // not reach the LLM verbatim (same redactor ⇒ same placeholders as content).
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: topicResponse([]) } }],
      }),
    }) as unknown as typeof fetch;
    await extractEntitiesForMemories(
      [{ id: "mem_1", content: "Emailed sara@example.com about the launch" }],
      {
        apiKey: "k",
        fetchFn,
        piiRedaction: true,
        existingEntityNames: ["sara@example.com", "ZetaChain"],
      }
    );
    const rawBody = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string;
    expect(rawBody).not.toContain("sara@example.com");
    expect(rawBody).toContain("ZetaChain");
  });
});

// ---------------------------------------------------------------------------
// extractAndLinkEntitiesForMemoriesOp
// ---------------------------------------------------------------------------

function mockVaultRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "mem_1",
    content: "Works at ZetaChain",
    isDeleted: false,
    userId: null,
    topicsUserManaged: null,
    ...overrides,
  };
}

function makeOpCtx(records: Record<string, ReturnType<typeof mockVaultRecord>>) {
  return {
    database: { write: vi.fn(async (cb: () => unknown) => cb()) },
    vaultMemoryCollection: {
      find: vi.fn(async (id: string) => {
        const record = records[id];
        if (!record) throw new Error("not found");
        return record;
      }),
    },
    entityCtx: {},
  } as unknown as VaultMemoryOperationsContext;
}

describe("extractAndLinkEntitiesForMemoriesOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws without ctx.entityCtx", async () => {
    const ctx = makeOpCtx({}) as { entityCtx?: unknown };
    delete ctx.entityCtx;
    await expect(
      extractAndLinkEntitiesForMemoriesOp(ctx as VaultMemoryOperationsContext, ["mem_1"], {
        apiKey: "k",
      })
    ).rejects.toThrow(/entityCtx/);
  });

  it("replaces entity links (guarded) and stamps the watermark", async () => {
    const ctx = makeOpCtx({
      mem_1: mockVaultRecord({ id: "mem_1" }),
      mem_2: mockVaultRecord({ id: "mem_2", content: "Likes tea" }),
    });
    const fetchFn = mockFetch(
      topicResponse([
        { id: "mem_1", entities: [{ name: "ZetaChain", kind: "organization" }] },
        { id: "mem_2", entities: [] },
      ])
    );

    const result = await extractAndLinkEntitiesForMemoriesOp(ctx, ["mem_1", "mem_2"], {
      apiKey: "k",
      fetchFn,
      now: 1_700_000_000_000,
    });

    // BOTH memories get the replace write — an answered-empty result must
    // still remove stale links from the previous content.
    expect(replaceMemoryEntitiesGuardedOp).toHaveBeenCalledTimes(2);
    expect(replaceMemoryEntitiesGuardedOp).toHaveBeenCalledWith(
      (ctx as { entityCtx: unknown }).entityCtx,
      "mem_1",
      [{ name: "ZetaChain", kind: "organization" }]
    );
    expect(replaceMemoryEntitiesGuardedOp).toHaveBeenCalledWith(
      (ctx as { entityCtx: unknown }).entityCtx,
      "mem_2",
      []
    );
    // BOTH memories stamped — zero-entity results count as extracted.
    expect(stampTopicsExtractedAtOp).toHaveBeenCalledWith(
      ctx,
      ["mem_1", "mem_2"],
      1_700_000_000_000
    );
    expect(result.stampedIds).toEqual(["mem_1", "mem_2"]);
    expect(result.skippedIds).toEqual([]);
    expect(result.entitiesByMemory.get("mem_1")).toEqual([
      { name: "ZetaChain", kind: "organization" },
    ]);
  });

  it("does not stamp a memory the replace guard skipped (null return)", async () => {
    const ctx = makeOpCtx({
      mem_1: mockVaultRecord({ id: "mem_1" }),
      mem_2: mockVaultRecord({ id: "mem_2", content: "Likes tea" }),
    });
    // Guard skipped mem_1 (user-managed/deleted mid-run, or fail-closed read
    // fault) — nothing persisted, so it must not be stamped.
    (replaceMemoryEntitiesGuardedOp as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const fetchFn = mockFetch(
      topicResponse([
        { id: "mem_1", entities: [{ name: "ZetaChain", kind: "organization" }] },
        { id: "mem_2", entities: [] },
      ])
    );

    const result = await extractAndLinkEntitiesForMemoriesOp(ctx, ["mem_1", "mem_2"], {
      apiKey: "k",
      fetchFn,
      now: 1,
    });

    expect(result.skippedIds).toEqual(["mem_1"]);
    expect(result.stampedIds).toEqual(["mem_2"]);
    expect(result.entitiesByMemory.has("mem_1")).toBe(false);
  });

  it("skips a memory whose decryption fails without aborting the sweep", async () => {
    const ctx = makeOpCtx({
      mem_bad: mockVaultRecord({ id: "mem_bad" }),
      mem_ok: mockVaultRecord({ id: "mem_ok", content: "Likes tea" }),
    });
    const { vaultMemoryToStored } = await import("../db/memoryVault/operations");
    (vaultMemoryToStored as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("decrypt failed")
    );
    const fetchFn = mockFetch(topicResponse([{ id: "mem_ok", entities: [] }]));

    const result = await extractAndLinkEntitiesForMemoriesOp(ctx, ["mem_bad", "mem_ok"], {
      apiKey: "k",
      fetchFn,
      now: 1,
    });

    expect(result.skippedIds).toEqual(["mem_bad"]);
    expect(result.stampedIds).toEqual(["mem_ok"]);
    // The undecryptable memory never reached the LLM.
    const rawBody = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string;
    expect(rawBody).not.toContain("mem_bad");
  });

  it("skips missing, deleted, foreign-user, and user-managed memories up front", async () => {
    const ctx = makeOpCtx({
      mem_deleted: mockVaultRecord({ id: "mem_deleted", isDeleted: true, userId: "me" }),
      mem_managed: mockVaultRecord({ id: "mem_managed", topicsUserManaged: true, userId: "me" }),
      mem_foreign: mockVaultRecord({ id: "mem_foreign", userId: "other_user" }),
      mem_ok: mockVaultRecord({ id: "mem_ok", userId: "me" }),
    });
    (ctx as { userId?: string }).userId = "me";
    const fetchFn = mockFetch(topicResponse([{ id: "mem_ok", entities: [] }]));

    const result = await extractAndLinkEntitiesForMemoriesOp(
      ctx,
      ["mem_missing", "mem_deleted", "mem_managed", "mem_foreign", "mem_ok"],
      { apiKey: "k", fetchFn, now: 1 }
    );

    expect(result.skippedIds).toEqual(["mem_missing", "mem_deleted", "mem_managed", "mem_foreign"]);
    expect(result.stampedIds).toEqual(["mem_ok"]);
    // The LLM only saw the eligible memory.
    const rawBody = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string;
    expect(rawBody).toContain("mem_ok");
    expect(rawBody).not.toContain("mem_managed");
  });

  it("does not stamp memories from a failed LLM batch (retried next sweep)", async () => {
    const ctx = makeOpCtx({ mem_1: mockVaultRecord({ id: "mem_1" }) });
    const fetchFn = mockFetch("not-valid-json");

    const result = await extractAndLinkEntitiesForMemoriesOp(ctx, ["mem_1"], {
      apiKey: "k",
      fetchFn,
      maxAttempts: 1,
      now: 1,
    });

    expect(result.skippedIds).toEqual(["mem_1"]);
    expect(result.stampedIds).toEqual([]);
    expect(replaceMemoryEntitiesGuardedOp).not.toHaveBeenCalled();
    expect(stampTopicsExtractedAtOp).toHaveBeenCalledWith(ctx, [], 1);
  });

  it("does not stamp a memory whose link write failed", async () => {
    const ctx = makeOpCtx({
      mem_1: mockVaultRecord({ id: "mem_1" }),
      mem_2: mockVaultRecord({ id: "mem_2", content: "Likes tea" }),
    });
    (replaceMemoryEntitiesGuardedOp as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("write failed")
    );
    const fetchFn = mockFetch(
      topicResponse([
        { id: "mem_1", entities: [{ name: "ZetaChain", kind: "organization" }] },
        { id: "mem_2", entities: [] },
      ])
    );

    const result = await extractAndLinkEntitiesForMemoriesOp(ctx, ["mem_1", "mem_2"], {
      apiKey: "k",
      fetchFn,
      now: 1,
    });

    expect(result.skippedIds).toEqual(["mem_1"]);
    expect(result.stampedIds).toEqual(["mem_2"]);
    expect(result.entitiesByMemory.has("mem_1")).toBe(false);
  });

  it("reports ids the stamp op declined (user-managed flipped mid-run) as skipped", async () => {
    const ctx = makeOpCtx({
      mem_1: mockVaultRecord({ id: "mem_1" }),
      mem_2: mockVaultRecord({ id: "mem_2", content: "Likes tea" }),
    });
    // Stamp op declines mem_1 — e.g. setMemoryEntitiesOp landed mid-run.
    (stampTopicsExtractedAtOp as ReturnType<typeof vi.fn>).mockResolvedValueOnce(["mem_2"]);
    const fetchFn = mockFetch(
      topicResponse([
        { id: "mem_1", entities: [{ name: "ZetaChain", kind: "organization" }] },
        { id: "mem_2", entities: [] },
      ])
    );

    const result = await extractAndLinkEntitiesForMemoriesOp(ctx, ["mem_1", "mem_2"], {
      apiKey: "k",
      fetchFn,
      now: 1,
    });

    expect(result.stampedIds).toEqual(["mem_2"]);
    expect(result.skippedIds).toEqual(["mem_1"]);
    expect(result.entitiesByMemory.has("mem_1")).toBe(false);
  });
});
