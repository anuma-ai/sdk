// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Conversation, Message } from "../db/chat/models";
import {
  createConversationOp,
  createMessageOp,
  type StorageOperationsContext,
  updateMessageChunksOp,
  updateMessageEmbeddingOp,
} from "../db/chat/operations";
import type { MessageOrigin } from "../db/chat/types";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../db/schema";
import { chunkAndEmbedAllMessages } from "./embeddings";

let ctx: StorageOperationsContext;
const options = { apiKey: "test", baseUrl: "https://portal.test", model: "model-a" };
const chunk = { text: "a searchable message", vector: [1, 2], startOffset: 0, endOffset: 20 };

beforeEach(async () => {
  const database = new Database({
    adapter: new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `discarded-repair-${Math.random().toString(36).slice(2)}`,
    }),
    modelClasses: sdkModelClasses,
  });
  ctx = {
    database,
    messagesCollection: database.get<Message>("history"),
    conversationsCollection: database.get<Conversation>("conversations"),
  };
  await createConversationOp(ctx, { conversationId: "conversation" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: unknown, init?: RequestInit) => {
      const { input } = JSON.parse(String(init?.body)) as { input: string | string[] };
      const inputs = Array.isArray(input) ? input : [input];
      return new Response(
        JSON.stringify({
          data: inputs.map((text, index) => ({ index, embedding: [text.length, 1] })),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    })
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function seed(content = "a searchable message", origin?: MessageOrigin) {
  await createMessageOp(ctx, {
    uniqueId: "message",
    conversationId: "conversation",
    role: "user",
    content,
    origin,
  });
  return ctx.messagesCollection.find("message");
}

describe("discarded history repair", () => {
  it.each([
    ["whole-message vector", "a searchable message"],
    ["chunk vectors", "a searchable message with context. ".repeat(50)],
  ])("permits a later model migration after an explicit %s repair", async (_kind, content) => {
    const row = await seed(content, "chunks_discarded");
    expect(await chunkAndEmbedAllMessages(ctx, options)).toBe(0);

    expect(await chunkAndEmbedAllMessages(ctx, options, { reembedDiscarded: true })).toBe(1);
    expect(row.origin).toBeNull();
    expect(row.embeddingModel).toBe("model-a");
    const hadChunks = Boolean(row.chunks?.length);

    expect(await chunkAndEmbedAllMessages(ctx, { ...options, model: "model-b" })).toBe(1);
    expect(row.embeddingModel).toBe("model-b");
    expect(Boolean(row.chunks?.length)).toBe(hadChunks);
    expect(row.vector?.length || row.chunks?.[0]?.vector.length).toBeGreaterThan(0);
  });

  it.each(["vector", "chunks"])("clears the marker in the successful %s writer", async (kind) => {
    const row = await seed(undefined, "chunks_discarded");
    if (kind === "vector") await updateMessageEmbeddingOp(ctx, row.id, [1, 2], "model-a");
    else await updateMessageChunksOp(ctx, row.id, [chunk], "model-a");
    expect(row.origin).toBeNull();
    expect(row.embeddingModel).toBe("model-a");
  });

  it("retains the marker when no index data is stored", async () => {
    const row = await seed(undefined, "chunks_discarded");
    await updateMessageEmbeddingOp(ctx, row.id, [], "model-a");
    expect(row.origin).toBe("chunks_discarded");
    await updateMessageChunksOp(ctx, row.id, [], "model-a");
    expect(row.origin).toBe("chunks_discarded");
    await updateMessageChunksOp(ctx, row.id, [{ ...chunk, vector: [] }], "model-a");
    expect(row.origin).toBe("chunks_discarded");
  });

  it.each(["tool_result", undefined] as const)(
    "preserves the ordinary origin %s",
    async (origin) => {
      const row = await seed(undefined, origin);
      const before = row.origin;
      await updateMessageEmbeddingOp(ctx, row.id, [1, 2], "model-a");
      await updateMessageChunksOp(ctx, row.id, [chunk], "model-b");
      expect(row.origin).toBe(before);
    }
  );

  it("keeps tool results outside an explicit repair", async () => {
    const row = await seed(undefined, "tool_result");
    expect(await chunkAndEmbedAllMessages(ctx, options, { reembedDiscarded: true })).toBe(0);
    expect(row.origin).toBe("tool_result");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retains the marker after an embedding failure", async () => {
    const row = await seed(undefined, "chunks_discarded");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 403 }))
    );
    await expect(
      chunkAndEmbedAllMessages(ctx, options, { reembedDiscarded: true })
    ).rejects.toThrow();
    expect(row.origin).toBe("chunks_discarded");
    expect(row.vector ?? []).toEqual([]);
  });

  it.each(["vector", "chunks"])(
    "retains the marker when the %s writer cannot start",
    async (kind) => {
      const row = await seed(undefined, "chunks_discarded");
      vi.spyOn(ctx.database, "write").mockRejectedValueOnce(new Error("database unavailable"));
      const result =
        kind === "vector"
          ? updateMessageEmbeddingOp(ctx, row.id, [1, 2], "model-a")
          : updateMessageChunksOp(ctx, row.id, [chunk], "model-a");
      await expect(result).rejects.toThrow("database unavailable");
      expect(row.origin).toBe("chunks_discarded");
    }
  );
});
