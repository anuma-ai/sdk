import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as encryption from "../../../react/useEncryption";
import { createChunkVectorCache } from "../../memory/chunkVectorCache";
import { decryptJsonField, isEncrypted } from "../encryption-utils";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation } from "./models";
import {
  createConversationOp,
  createMessageOp,
  decryptMessageEmbeddingFields,
  sealLegacyMessageEmbeddingsOp,
  searchChunksOp,
  searchMessagesOp,
  type StorageOperationsContext,
  updateMessageChunksOp,
  updateMessageEmbeddingOp,
} from "./operations";

const ADDRESS = "0x1234567890123456789012345678901234567890";
const CONTENT = "apples and oranges";
const VECTOR = [1, 0, 0];
const CHUNKS = [{ text: CONTENT, vector: VECTOR, startOffset: 0, endOffset: CONTENT.length }];
const MODEL = "test-model";
const signMessage = vi.fn((message: string) =>
  Promise.resolve(`0x${Buffer.from(message).toString("hex").padStart(130, "0")}`)
);

async function seed(): Promise<StorageOperationsContext> {
  const database = new Database({
    adapter: new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `embedding-encryption-${Math.random()}`,
    }),
    modelClasses: sdkModelClasses,
  });
  const ctx: StorageOperationsContext = {
    database,
    messagesCollection: database.get("history"),
    conversationsCollection: database.get<Conversation>("conversations"),
    walletAddress: ADDRESS,
    signMessage,
  };
  await createConversationOp(ctx, { conversationId: "conv" });
  await createMessageOp(ctx, {
    conversationId: "conv",
    uniqueId: "message",
    role: "user",
    content: CONTENT,
  });
  return ctx;
}

describe("message embedding encryption", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    signMessage.mockClear();
    encryption.clearAllEncryptionKeys();
  });

  it.each(["vector", "chunks"] as const)(
    "seals %s with the cached key and no signer request",
    async (column) => {
      const ctx = await seed();
      delete ctx.signMessage;
      signMessage.mockClear();
      const row = await ctx.messagesCollection.find("message");
      expect(isEncrypted(row.content)).toBe(true);
      const request = vi.spyOn(encryption, "requestEncryptionKey");
      const stored =
        column === "vector"
          ? await updateMessageEmbeddingOp(ctx, "message", VECTOR, MODEL)
          : await updateMessageChunksOp(ctx, "message", CHUNKS, MODEL);
      const raw = String(row._getRaw(column));
      expect(isEncrypted(raw)).toBe(true);
      expect(() => {
        JSON.parse(raw);
      }).toThrow();
      const expected =
        column === "vector" ? VECTOR : CHUNKS.map(({ text: _text, ...rest }) => rest);
      expect(await decryptJsonField(raw, ADDRESS)).toEqual(expected);
      expect(stored?.[column]).toEqual(expected);
      expect(request).not.toHaveBeenCalled();
      expect(signMessage).not.toHaveBeenCalled();
    }
  );

  it.each(["vector", "chunks"] as const)(
    "rejects a %s write if the cached key is missing",
    async (column) => {
      const ctx = await seed();
      const row = await ctx.messagesCollection.find("message");
      const before = { ...row._raw };
      encryption.clearAllEncryptionKeys();
      const request = vi.spyOn(encryption, "requestEncryptionKey");
      const result =
        column === "vector"
          ? updateMessageEmbeddingOp(ctx, "message", VECTOR, MODEL)
          : updateMessageChunksOp(ctx, "message", CHUNKS, MODEL);
      await expect(result).rejects.toBeInstanceOf(encryption.EncryptionKeyMissingError);
      expect(row._raw).toEqual(before);
      expect(request).not.toHaveBeenCalled();
    }
  );

  it.each(["vector", "chunks"] as const)(
    "keeps the sealed %s column unchanged if the cached key is missing",
    async (column) => {
      const ctx = await seed();
      const row = await ctx.messagesCollection.find("message");
      const value = column === "vector" ? VECTOR : CHUNKS;
      const sealed = `enc:v3:${await encryption.encryptData(JSON.stringify(value), ADDRESS)}`;
      await ctx.database.write(() => row.update((message) => message._setRaw(column, sealed)));
      expect(isEncrypted(String(row._getRaw(column)))).toBe(true);
      const before = { ...row._raw };
      encryption.clearAllEncryptionKeys();
      signMessage.mockClear();
      const request = vi.spyOn(encryption, "requestEncryptionKey");
      const replacement = [0, 1, 0];
      const result =
        column === "vector"
          ? updateMessageEmbeddingOp(ctx, "message", replacement, "replacement-model")
          : updateMessageChunksOp(
              ctx,
              "message",
              [{ ...CHUNKS[0], vector: replacement }],
              "replacement-model"
            );
      await expect(result).rejects.toBeInstanceOf(encryption.EncryptionKeyMissingError);
      expect(row._raw).toEqual(before);
      expect(request).not.toHaveBeenCalled();
      expect(signMessage).not.toHaveBeenCalled();
    }
  );

  it.each(["vector", "chunks"] as const)(
    "keeps the sealed %s column unchanged if the cached key is stale",
    async (column) => {
      const ctx = await seed();
      const row = await ctx.messagesCollection.find("message");
      const value = column === "vector" ? VECTOR : CHUNKS;
      const sealed = `enc:v3:${await encryption.encryptData(JSON.stringify(value), ADDRESS)}`;
      await ctx.database.write(() => row.update((message) => message._setRaw(column, sealed)));
      const before = { ...row._raw };
      encryption.seedEncryptionKeys(ADDRESS, { current: "ab".repeat(32) });
      const result =
        column === "vector"
          ? updateMessageEmbeddingOp(ctx, "message", [0, 1, 0], "replacement-model")
          : updateMessageChunksOp(
              ctx,
              "message",
              [{ ...CHUNKS[0], vector: [0, 1, 0] }],
              "replacement-model"
            );
      await expect(result).rejects.toThrow("cached wallet key");
      expect(row._raw).toEqual(before);
    }
  );

  it("ranks sealed chunks and vectors on cold and warm searches", async () => {
    const ctx = await seed();
    delete ctx.signMessage;
    await updateMessageEmbeddingOp(ctx, "message", VECTOR, MODEL);
    await updateMessageChunksOp(ctx, "message", CHUNKS, MODEL);
    const messages = await searchMessagesOp(ctx, VECTOR);
    expect(messages[0]?.content).toBe(CONTENT);
    expect(messages[0]?.similarity).toBeCloseTo(1);
    const chunkCache = createChunkVectorCache();
    const cold = await searchChunksOp(ctx, VECTOR, { chunkCache });
    expect(cold[0]?.chunkText).toBe(CONTENT);
    expect(chunkCache.get("message")?.chunks[0]).toEqual(Float32Array.from(VECTOR));
    expect(await searchChunksOp(ctx, VECTOR, { chunkCache })).toEqual(cold);
    expect(await searchChunksOp({ ...ctx, walletAddress: undefined }, VECTOR)).toEqual([]);
  });

  it("decrypts raw columns for client scoring without a signer request", async () => {
    const ctx = await seed();
    await updateMessageEmbeddingOp(ctx, "message", VECTOR, MODEL);
    await updateMessageChunksOp(ctx, "message", CHUNKS, MODEL);
    const row = await ctx.messagesCollection.find("message");
    const raw: Record<string, unknown> = { ...row._raw };
    const decrypted = await decryptMessageEmbeddingFields(raw, ADDRESS);
    expect(JSON.parse(String(decrypted.vector))).toEqual(VECTOR);
    expect(JSON.parse(String(decrypted.chunks))).toEqual(
      CHUNKS.map(({ text: _text, ...rest }) => rest)
    );
    expect(isEncrypted(String(raw.chunks))).toBe(true);
    encryption.clearAllEncryptionKeys();
    expect(await decryptMessageEmbeddingFields(raw, ADDRESS)).toMatchObject({
      vector: undefined,
      chunks: undefined,
    });
  });

  it("keeps plaintext rows readable with a wallet context", async () => {
    const ctx = await seed();
    const row = await ctx.messagesCollection.find("message");
    await ctx.database.write(() => row.update((message) => message._setRaw("content", CONTENT)));
    encryption.clearAllEncryptionKeys();
    await updateMessageEmbeddingOp(ctx, "message", VECTOR, MODEL);
    await updateMessageChunksOp(ctx, "message", CHUNKS, MODEL);
    expect(JSON.parse(String(row._getRaw("vector")))).toEqual(VECTOR);
    expect(JSON.parse(String(row._getRaw("chunks")))).toEqual(
      CHUNKS.map(({ text: _text, ...rest }) => rest)
    );
  });

  it("reuses cached vectors without a decrypt of losing rows", async () => {
    const ctx = await seed();
    await createMessageOp(ctx, {
      conversationId: "conv",
      uniqueId: "other",
      role: "user",
      content: CONTENT,
    });
    delete ctx.signMessage;
    await updateMessageChunksOp(ctx, "message", CHUNKS, MODEL);
    await updateMessageChunksOp(ctx, "other", [{ ...CHUNKS[0], vector: [0, 1, 0] }], MODEL);
    const chunkCache = createChunkVectorCache();
    const decrypt = vi.spyOn(encryption, "decryptData");
    const cold = await searchChunksOp(ctx, VECTOR, { chunkCache, minSimilarity: 0.99 });
    const coldCalls = decrypt.mock.calls.length;
    decrypt.mockClear();
    const warm = await searchChunksOp(ctx, VECTOR, { chunkCache, minSimilarity: 0.99 });
    expect(warm).toEqual(cold);
    expect(decrypt.mock.calls.length).toBe(coldCalls - 1);
  });

  it("seals legacy columns once and removes chunk text", async () => {
    const ctx = await seed();
    const row = await ctx.messagesCollection.find("message");
    await ctx.database.write(() =>
      row.update((message) => {
        message._setRaw("vector", JSON.stringify(VECTOR));
        message._setRaw("chunks", JSON.stringify(CHUNKS));
        message._setRaw("updated_at", 1000);
      })
    );
    const request = vi.spyOn(encryption, "requestEncryptionKey");
    expect(await sealLegacyMessageEmbeddingsOp(ctx)).toBe(1);
    expect(await sealLegacyMessageEmbeddingsOp(ctx)).toBe(0);
    expect(request).not.toHaveBeenCalled();
    expect(isEncrypted(String(row._getRaw("vector")))).toBe(true);
    expect(isEncrypted(String(row._getRaw("chunks")))).toBe(true);
    expect(await decryptJsonField(String(row._getRaw("chunks")), ADDRESS)).toEqual(
      CHUNKS.map(({ text: _text, ...rest }) => rest)
    );
    expect(Number(row._getRaw("updated_at"))).toBe(1000);
    delete ctx.signMessage;
    expect((await searchChunksOp(ctx, VECTOR))[0]?.chunkText).toBe(CONTENT);
  });

  it("discards legacy chunks built from ciphertext offsets", async () => {
    const ctx = await seed();
    const row = await ctx.messagesCollection.find("message");
    await ctx.database.write(() =>
      row.update((message) => {
        message._setRaw(
          "chunks",
          JSON.stringify([{ ...CHUNKS[0], endOffset: message.content.length }])
        );
        message._setRaw("vector", JSON.stringify(VECTOR));
        message._setRaw("updated_at", 1000);
      })
    );
    expect(await sealLegacyMessageEmbeddingsOp(ctx)).toBe(1);
    expect(Number(row._getRaw("updated_at"))).toBeGreaterThan(1000);
    expect(row._getRaw("chunks")).toBeNull();
    expect(row._getRaw("vector")).toBeNull();
    expect(row.origin).toBe("chunks_discarded");
    expect(await sealLegacyMessageEmbeddingsOp(ctx)).toBe(0);
  });

  it("leaves legacy columns unchanged if the cached key is missing", async () => {
    const ctx = await seed();
    const row = await ctx.messagesCollection.find("message");
    await ctx.database.write(() =>
      row.update((message) => message._setRaw("vector", JSON.stringify(VECTOR)))
    );
    const before = { ...row._raw };
    expect(await sealLegacyMessageEmbeddingsOp({ ...ctx, walletAddress: undefined })).toBe(0);
    encryption.clearAllEncryptionKeys();
    const request = vi.spyOn(encryption, "requestEncryptionKey");
    await expect(sealLegacyMessageEmbeddingsOp(ctx)).rejects.toThrow("cached wallet key");
    expect(row._raw).toEqual(before);
    expect(request).not.toHaveBeenCalled();
  });

  it("skips a legacy row sealed under another key and seals the rest", async () => {
    const ctx = await seed();
    const row = await ctx.messagesCollection.find("message");
    const otherAddress = "0x0987654321098765432109876543210987654321";
    encryption.seedEncryptionKeys(otherAddress, { current: "ab".repeat(32) });
    const foreignContent = `enc:v3:${await encryption.encryptData(CONTENT, otherAddress)}`;
    await createMessageOp(
      { ...ctx, walletAddress: undefined },
      { conversationId: "conv", uniqueId: "foreign", role: "user", content: CONTENT }
    );
    const foreign = await ctx.messagesCollection.find("foreign");
    await ctx.database.write(async () => {
      await foreign.update((message) => {
        message._setRaw("content", foreignContent);
        message._setRaw("vector", JSON.stringify(VECTOR));
      });
      await row.update((message) => message._setRaw("vector", JSON.stringify(VECTOR)));
    });
    const foreignBefore = { ...foreign._raw };
    expect(await sealLegacyMessageEmbeddingsOp(ctx)).toBe(1);
    expect(isEncrypted(String(row._getRaw("vector")))).toBe(true);
    expect(foreign._raw).toEqual(foreignBefore);
    expect(await sealLegacyMessageEmbeddingsOp(ctx)).toBe(0);
  });

  it("seals legacy columns across more than one page", async () => {
    const ctx = await seed();
    const content = (await ctx.messagesCollection.find("message")).content;
    for (let i = 0; i < 51; i++) {
      await createMessageOp(
        { ...ctx, signMessage: undefined },
        {
          conversationId: "conv",
          uniqueId: `legacy-${i}`,
          role: "user",
          content,
          vector: VECTOR,
        }
      );
    }
    expect(await sealLegacyMessageEmbeddingsOp(ctx)).toBe(51);
    expect(await sealLegacyMessageEmbeddingsOp(ctx)).toBe(0);
  });

  it("skips candidates deleted before their page is sealed", async () => {
    const ctx = await seed();
    const row = await ctx.messagesCollection.find("message");
    await ctx.database.write(() =>
      row.update((message) => message._setRaw("vector", JSON.stringify(VECTOR)))
    );
    const query = ctx.messagesCollection.query.bind(ctx.messagesCollection);
    vi.spyOn(ctx.messagesCollection, "query").mockImplementationOnce((...clauses) => {
      const candidates = query(...clauses);
      return Object.assign(Object.create(candidates) as typeof candidates, {
        fetchIds: async () => [...(await candidates.fetchIds()), "deleted"],
      });
    });
    expect(await sealLegacyMessageEmbeddingsOp(ctx)).toBe(1);
    expect(isEncrypted(String(row._getRaw("vector")))).toBe(true);
  });
});
