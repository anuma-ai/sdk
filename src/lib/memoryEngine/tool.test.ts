/**
 * Contract tests for createMemoryEngineTool.
 *
 * This factory is PUBLIC API — it is re-exported from the react, expo, and
 * server barrels, so an external consumer wires the returned ToolConfig
 * straight into a chat completion. Yet it had zero direct or indirect tests
 * (issue #630). These tests exercise the surface a consumer actually sees: the
 * tool schema shape, argument validation, the retrieval/dedup/formatting
 * pipeline, and — importantly — the error contract (this executor returns
 * error *strings* to the LLM rather than throwing).
 *
 * The network and DB are faked at the module seams, the same pattern
 * retain.test.ts / embeddings.test.ts use: `../db/chat/operations` and
 * `./embeddings` are module-mocked so no real WatermelonDB or portal call
 * happens. Because every op that touches the storage context is mocked, a
 * cast-empty `{} as StorageOperationsContext` is a safe stand-in — nothing ever
 * dereferences it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/chat/operations", () => ({
  getMessagesOp: vi.fn(),
  searchChunksOp: vi.fn(),
}));

vi.mock("./embeddings", () => ({
  generateEmbedding: vi.fn(),
}));

import type { ToolConfig } from "../chat/useChat/types";
import {
  getMessagesOp,
  searchChunksOp,
  type StorageOperationsContext,
} from "../db/chat/operations";
import type { ChunkSearchResult, StoredMessage } from "../db/chat/types";
import { DEFAULT_API_EMBEDDING_MODEL } from "./constants";
import { generateEmbedding } from "./embeddings";
import { createMemoryEngineTool } from "./tool";

/**
 * Structural view of the tool schema. LlmapiChatCompletionTool is typed as a
 * permissive index signature (`{ [key: string]: unknown }`), so `tool.function`
 * is `unknown` at compile time — this cast target names the fields the schema
 * actually carries so the assertions read cleanly.
 */
interface ToolSchemaView {
  type: string;
  function: {
    name: string;
    description: string;
    arguments: {
      type: string;
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required: string[];
    };
  };
}

const schema = (tool: ToolConfig): ToolSchemaView => tool as unknown as ToolSchemaView;

/** The executor is typed loosely (ToolExecutor → Promise<unknown> | unknown);
 * at runtime it always resolves to a string, so narrow it here for the asserts. */
const run = (tool: ToolConfig, args: Record<string, unknown>): Promise<string> =>
  tool.executor!(args) as Promise<string>;

const ctx = {} as StorageOperationsContext;

function makeMessage(overrides: Partial<StoredMessage>): StoredMessage {
  return {
    uniqueId: "m-default",
    messageId: 1,
    conversationId: "c1",
    role: "user",
    content: "default content",
    createdAt: new Date("2026-03-15T10:30:00.000Z"),
    updatedAt: new Date("2026-03-15T10:30:00.000Z"),
    ...overrides,
  };
}

function makeChunk(
  conversationId: string,
  uniqueId: string,
  similarity: number,
  role: StoredMessage["role"] = "user",
  content?: string
): ChunkSearchResult {
  return {
    chunkText: content ?? `chunk ${uniqueId}`,
    similarity,
    message: makeMessage({
      conversationId,
      uniqueId,
      role,
      content: content ?? `chunk ${uniqueId}`,
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // A benign default embedding so the happy paths don't have to set it up.
  vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
});

describe("createMemoryEngineTool — schema", () => {
  it("returns a function tool named search_memory that is removed after execution", () => {
    const tool = createMemoryEngineTool(ctx, {});
    const s = schema(tool);
    expect(s.type).toBe("function");
    expect(s.function.name).toBe("search_memory");
    // removeAfterExecution keeps a small model from re-calling the same search
    // on every continuation — part of the tool's advertised contract.
    expect(tool.removeAfterExecution).toBe(true);
  });

  it("requires only `query` and exposes the documented parameter surface", () => {
    const s = schema(createMemoryEngineTool(ctx, {}));
    expect(s.function.arguments.required).toEqual(["query"]);
    expect(Object.keys(s.function.arguments.properties).sort()).toEqual(
      ["end_date", "include_assistant", "query", "sort_by", "start_date", "top_k"].sort()
    );
  });

  it("advertises sort_by as a similarity|chronological enum", () => {
    const s = schema(createMemoryEngineTool(ctx, {}));
    expect(s.function.arguments.properties.sort_by.enum).toEqual(["similarity", "chronological"]);
  });

  it("surfaces custom defaults into the property descriptions the LLM reads", () => {
    // The per-call defaults must be visible to the model in the schema text, or
    // it cannot know what behavior it gets when it omits a field.
    const s = schema(
      createMemoryEngineTool(ctx, {}, { topK: 3, includeAssistant: true, sortBy: "chronological" })
    );
    expect(s.function.arguments.properties.top_k.description).toContain("Default: 3");
    expect(s.function.arguments.properties.include_assistant.description).toContain(
      "Default: true"
    );
    expect(s.function.arguments.properties.sort_by.description).toContain("Default: chronological");
  });
});

describe("createMemoryEngineTool — argument validation and error paths", () => {
  it("rejects a missing, empty, or non-string query before doing any work", async () => {
    const tool = createMemoryEngineTool(ctx, {});
    const expected = "Error: A search query is required.";
    expect(await run(tool, {})).toBe(expected);
    expect(await run(tool, { query: "" })).toBe(expected);
    expect(await run(tool, { query: 42 })).toBe(expected);
    // Validation precedes embedding, so the network seam is never touched.
    expect(generateEmbedding).not.toHaveBeenCalled();
  });

  it("returns the embedding error AS A STRING (does not throw) when embedding fails", async () => {
    // NOTE(#630): unlike recallTool (which re-throws with a cause after #730),
    // this executor surfaces failures to the LLM as prose. That is the current,
    // intentional contract here — pinned so a future change to re-throw is a
    // deliberate decision, not an accident.
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("portal down"));
    const tool = createMemoryEngineTool(ctx, {});
    expect(await run(tool, { query: "q" })).toBe("Error searching conversations: portal down");
  });

  it("returns the search error as a string when the chunk search fails", async () => {
    vi.mocked(searchChunksOp).mockRejectedValue(new Error("db offline"));
    const tool = createMemoryEngineTool(ctx, {});
    expect(await run(tool, { query: "q" })).toBe("Error searching conversations: db offline");
  });

  it("labels a non-Error rejection as 'Unknown error'", async () => {
    vi.mocked(generateEmbedding).mockRejectedValue("boom");
    const tool = createMemoryEngineTool(ctx, {});
    expect(await run(tool, { query: "q" })).toBe("Error searching conversations: Unknown error");
  });

  it("returns the no-results message and never expands when the search is empty", async () => {
    vi.mocked(searchChunksOp).mockResolvedValue([]);
    const tool = createMemoryEngineTool(ctx, {});
    expect(await run(tool, { query: "q" })).toBe("No relevant past conversations found.");
    expect(getMessagesOp).not.toHaveBeenCalled();
  });
});

describe("createMemoryEngineTool — retrieval pipeline", () => {
  it("fetches an over-sized candidate pool and forwards similarity/model options", async () => {
    vi.mocked(searchChunksOp).mockResolvedValue([]);
    const tool = createMemoryEngineTool(ctx, {});
    await run(tool, { query: "q" });

    // Default topK 8, assistant excluded → multiplier 3 × 2 = 6 → limit 48.
    expect(searchChunksOp).toHaveBeenCalledTimes(1);
    expect(searchChunksOp).toHaveBeenCalledWith(
      ctx,
      [0.1, 0.2, 0.3],
      expect.objectContaining({
        limit: 48,
        minSimilarity: 0.3,
        embeddingModel: DEFAULT_API_EMBEDDING_MODEL,
      })
    );
  });

  it("halves the candidate multiplier when assistant messages are included", async () => {
    vi.mocked(searchChunksOp).mockResolvedValue([]);
    const tool = createMemoryEngineTool(ctx, {});
    await run(tool, { query: "q", include_assistant: true });
    // multiplier 3 × 1 = 3 → limit 24.
    expect(searchChunksOp).toHaveBeenCalledWith(
      ctx,
      [0.1, 0.2, 0.3],
      expect.objectContaining({ limit: 24 })
    );
  });

  it("forwards a custom embedding model to the chunk search", async () => {
    vi.mocked(searchChunksOp).mockResolvedValue([]);
    const tool = createMemoryEngineTool(ctx, { model: "custom-model" });
    await run(tool, { query: "q" });
    expect(searchChunksOp).toHaveBeenCalledWith(
      ctx,
      [0.1, 0.2, 0.3],
      expect.objectContaining({ embeddingModel: "custom-model" })
    );
  });

  it("formats matched conversations with a header, per-session relevance, and role labels", async () => {
    vi.mocked(searchChunksOp).mockResolvedValue([
      makeChunk("convA", "a1", 0.9, "user", "alpha one"),
      makeChunk("convA", "a2", 0.85, "user", "alpha two"),
      makeChunk("convB", "b1", 0.7, "user", "beta one"),
    ]);
    vi.mocked(getMessagesOp).mockImplementation(async (_ctx, convId) =>
      convId === "convA"
        ? [
            makeMessage({ conversationId: "convA", uniqueId: "a1", content: "alpha one" }),
            makeMessage({ conversationId: "convA", uniqueId: "a2", content: "alpha two" }),
          ]
        : [makeMessage({ conversationId: "convB", uniqueId: "b1", content: "beta one" })]
    );

    const out = await run(createMemoryEngineTool(ctx, {}), { query: "q" });

    expect(out.startsWith("Found 2 relevant past conversations:")).toBe(true);
    expect(out).toContain("=== Conversation from");
    // Similarity rendered via toFixed(2).
    expect(out).toContain("(relevance: 0.90)");
    expect(out).toContain("(relevance: 0.70)");
    expect(out).toContain("User: alpha one");
    // Default sort is by similarity descending: convA (0.90) precedes convB (0.70).
    expect(out.indexOf("alpha one")).toBeLessThan(out.indexOf("beta one"));
  });

  it("orders sessions oldest-first when sort_by is chronological", async () => {
    vi.mocked(searchChunksOp).mockResolvedValue([
      makeChunk("convA", "a1", 0.9, "user", "alpha"),
      makeChunk("convB", "b1", 0.7, "user", "beta"),
    ]);
    vi.mocked(getMessagesOp).mockImplementation(async (_ctx, convId) =>
      convId === "convA"
        ? [
            makeMessage({
              conversationId: "convA",
              uniqueId: "a1",
              content: "alpha",
              createdAt: new Date("2026-05-01T00:00:00.000Z"),
            }),
          ]
        : [
            makeMessage({
              conversationId: "convB",
              uniqueId: "b1",
              content: "beta",
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
            }),
          ]
    );

    const out = await run(createMemoryEngineTool(ctx, {}), {
      query: "q",
      sort_by: "chronological",
    });
    // convB is older, so despite convA's higher similarity it renders first.
    expect(out.indexOf("beta")).toBeLessThan(out.indexOf("alpha"));
  });

  it("shows only user turns by default and drops an all-assistant conversation entirely", async () => {
    vi.mocked(searchChunksOp).mockResolvedValue([
      makeChunk("convA", "a1", 0.9, "user", "matched user chunk"),
      makeChunk("convB", "b1", 0.8, "user", "matched user chunk"),
    ]);
    vi.mocked(getMessagesOp).mockImplementation(async (_ctx, convId) =>
      convId === "convA"
        ? [
            makeMessage({ conversationId: "convA", uniqueId: "a1", content: "the user line" }),
            makeMessage({
              conversationId: "convA",
              uniqueId: "a9",
              role: "assistant",
              content: "the assistant line",
            }),
          ]
        : // convB expands to only assistant messages → nothing to render → dropped.
          [
            makeMessage({
              conversationId: "convB",
              uniqueId: "b1",
              role: "assistant",
              content: "assistant only",
            }),
          ]
    );

    const out = await run(createMemoryEngineTool(ctx, {}), { query: "q" });
    expect(out.startsWith("Found 1 relevant past conversations:")).toBe(true);
    expect(out).toContain("User: the user line");
    expect(out).not.toContain("the assistant line"); // assistant turn filtered out
    expect(out).not.toContain("assistant only"); // whole convB dropped
  });

  it("drops a conversation matched only on an assistant chunk before expanding it", async () => {
    // convA matched on a USER chunk; convB matched ONLY on an ASSISTANT chunk.
    // The chunk-stage role filter must drop convB's candidate up front — before
    // getMessagesOp is ever called for it — so this exercises the early filter
    // (a conversation surfaced solely by an assistant turn), distinct from the
    // post-expansion filter the previous test covers.
    vi.mocked(searchChunksOp).mockResolvedValue([
      makeChunk("convA", "a1", 0.9, "user", "matched user chunk"),
      makeChunk("convB", "b1", 0.8, "assistant", "matched assistant chunk"),
    ]);
    const expanded: string[] = [];
    vi.mocked(getMessagesOp).mockImplementation(async (_ctx, convId) => {
      expanded.push(convId);
      return [
        makeMessage({
          conversationId: convId,
          uniqueId: convId === "convA" ? "a1" : "b1",
          content: `${convId} user line`,
        }),
      ];
    });

    const out = await run(createMemoryEngineTool(ctx, {}), { query: "q" });
    expect(out.startsWith("Found 1 relevant past conversations:")).toBe(true);
    expect(out).toContain("convA user line");
    expect(out).not.toContain("convB user line");
    // The decisive assertion: convB was filtered at the chunk stage, so it was
    // never expanded. A regression that moved the role filter after expansion
    // (or dropped it) would fetch convB here and this would fail.
    expect(expanded).not.toContain("convB");
  });

  it("includes assistant turns when include_assistant is set", async () => {
    vi.mocked(searchChunksOp).mockResolvedValue([makeChunk("convA", "a1", 0.9, "user", "matched")]);
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ conversationId: "convA", uniqueId: "a1", content: "the user line" }),
      makeMessage({
        conversationId: "convA",
        uniqueId: "a9",
        role: "assistant",
        content: "the assistant line",
      }),
    ]);

    const out = await run(createMemoryEngineTool(ctx, {}), {
      query: "q",
      include_assistant: true,
    });
    expect(out).toContain("User: the user line");
    expect(out).toContain("Assistant: the assistant line");
  });

  it("round-robins across conversations so a low-scoring one still gets a slot", async () => {
    // convA dominates on raw similarity (0.9/0.8/0.7) but round-robin takes one
    // chunk per conversation per round, so convB (0.6) also surfaces at top_k 2.
    vi.mocked(searchChunksOp).mockResolvedValue([
      makeChunk("convA", "a1", 0.9, "user", "alpha one"),
      makeChunk("convA", "a2", 0.8, "user", "alpha two"),
      makeChunk("convA", "a3", 0.7, "user", "alpha three"),
      makeChunk("convB", "b1", 0.6, "user", "beta one"),
    ]);
    vi.mocked(getMessagesOp).mockImplementation(async (_ctx, convId) =>
      convId === "convA"
        ? [makeMessage({ conversationId: "convA", uniqueId: "a1", content: "alpha one" })]
        : [makeMessage({ conversationId: "convB", uniqueId: "b1", content: "beta one" })]
    );

    const out = await run(createMemoryEngineTool(ctx, {}), { query: "q", top_k: 2 });
    expect(out.startsWith("Found 2 relevant past conversations:")).toBe(true);
    expect(out).toContain("alpha one");
    expect(out).toContain("beta one");
  });

  it("expands context around the matched message according to contextMessages", async () => {
    const convMessages = [
      makeMessage({ conversationId: "convA", uniqueId: "m0", content: "m-zero" }),
      makeMessage({ conversationId: "convA", uniqueId: "m1", content: "m-one" }),
      makeMessage({ conversationId: "convA", uniqueId: "m2", content: "m-two" }),
      makeMessage({ conversationId: "convA", uniqueId: "m3", content: "m-three" }),
      makeMessage({ conversationId: "convA", uniqueId: "m4", content: "m-four" }),
    ];
    // The chunk matches the MIDDLE message (m2).
    vi.mocked(searchChunksOp).mockResolvedValue([makeChunk("convA", "m2", 0.9, "user")]);
    vi.mocked(getMessagesOp).mockResolvedValue(convMessages);

    // contextMessages 0 → only the matched message.
    const only = await run(createMemoryEngineTool(ctx, {}, { contextMessages: 0 }), {
      query: "q",
    });
    expect(only).toContain("m-two");
    expect(only).not.toContain("m-one");
    expect(only).not.toContain("m-three");

    // contextMessages 1 → the immediate neighbors too, but not the far ends.
    const windowed = await run(createMemoryEngineTool(ctx, {}, { contextMessages: 1 }), {
      query: "q",
    });
    expect(windowed).toContain("m-one");
    expect(windowed).toContain("m-two");
    expect(windowed).toContain("m-three");
    expect(windowed).not.toContain("m-zero");
    expect(windowed).not.toContain("m-four");

    // Default (undefined) → the whole conversation.
    const full = await run(createMemoryEngineTool(ctx, {}), { query: "q" });
    expect(full).toContain("m-zero");
    expect(full).toContain("m-four");
  });

  it("excludes a conversation via searchOptions and raises the fetch multiplier", async () => {
    vi.mocked(searchChunksOp).mockResolvedValue([
      makeChunk("convX", "x1", 0.9, "user", "excluded content"),
      makeChunk("convY", "y1", 0.8, "user", "kept content"),
    ]);
    vi.mocked(getMessagesOp).mockImplementation(async (_ctx, convId) =>
      convId === "convY"
        ? [makeMessage({ conversationId: "convY", uniqueId: "y1", content: "kept content" })]
        : [makeMessage({ conversationId: "convX", uniqueId: "x1", content: "excluded content" })]
    );

    const out = await run(createMemoryEngineTool(ctx, {}, { excludeConversationId: "convX" }), {
      query: "q",
    });
    // convX chunks are filtered out before expansion.
    expect(out).toContain("kept content");
    expect(out).not.toContain("excluded content");
    // The excluded-conversation multiplier is 3 × 2 × 1.5 = 9 → ceil(8 × 9) = 72.
    expect(searchChunksOp).toHaveBeenCalledWith(
      ctx,
      [0.1, 0.2, 0.3],
      expect.objectContaining({ limit: 72 })
    );
  });

  it("fires onRetrieve once with exactly the conversation ids that rendered", async () => {
    vi.mocked(searchChunksOp).mockResolvedValue([
      makeChunk("convA", "a1", 0.9, "user", "alpha"),
      makeChunk("convB", "b1", 0.8, "user", "beta"),
      makeChunk("convC", "c1", 0.7, "user", "gamma"),
    ]);
    vi.mocked(getMessagesOp).mockImplementation(async (_ctx, convId) => {
      if (convId === "convC") {
        // convC renders no user turns → dropped → must be absent from onRetrieve.
        return [
          makeMessage({ conversationId: "convC", uniqueId: "c1", role: "assistant", content: "x" }),
        ];
      }
      return [makeMessage({ conversationId: convId, uniqueId: `${convId}-u`, content: convId })];
    });

    const onRetrieve = vi.fn();
    await run(createMemoryEngineTool(ctx, {}, {}, { onRetrieve }), { query: "q" });
    expect(onRetrieve).toHaveBeenCalledTimes(1);
    expect(onRetrieve).toHaveBeenCalledWith(["convA", "convB"]);
  });

  it("ignores start_date/end_date: same search args and output with or without them", async () => {
    // NOTE(#630): the schema advertises start_date/end_date (the source labels
    // them "currently disabled"), but the executor never reads them — so the
    // LLM can believe it filtered by date when it did not. Pinned by proving the
    // dated call is byte-identical to the undated one. Correct behavior is
    // either to honor the filters or to remove them from the schema.
    vi.mocked(searchChunksOp).mockResolvedValue([makeChunk("convA", "a1", 0.9, "user", "alpha")]);
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ conversationId: "convA", uniqueId: "a1", content: "alpha" }),
    ]);
    const tool = createMemoryEngineTool(ctx, {});

    const withDates = await run(tool, {
      query: "q",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
    });
    const searchArgsWithDates = vi.mocked(searchChunksOp).mock.calls[0];

    vi.clearAllMocks();
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(searchChunksOp).mockResolvedValue([makeChunk("convA", "a1", 0.9, "user", "alpha")]);
    vi.mocked(getMessagesOp).mockResolvedValue([
      makeMessage({ conversationId: "convA", uniqueId: "a1", content: "alpha" }),
    ]);

    const withoutDates = await run(tool, { query: "q" });
    const searchArgsWithoutDates = vi.mocked(searchChunksOp).mock.calls[0];

    expect(withDates).toBe(withoutDates);
    expect(searchArgsWithDates).toEqual(searchArgsWithoutDates);
  });
});
