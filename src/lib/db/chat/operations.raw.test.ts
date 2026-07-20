// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAllEncryptionKeys,
  requestEncryptionKey,
  type SignMessageFn,
} from "../../../react/useEncryption";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation } from "./models";
import {
  createConversationOp,
  createMessageOp,
  getConversationsByProjectOp,
  getConversationsLazyOp,
  getConversationsOp,
  getMessagesOp,
  getMessagesPageOp,
  getMessageSkeletonsOp,
  type StorageOperationsContext,
} from "./operations";

declare const global: typeof globalThis;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
const mockSignMessage = vi.fn(
  async (message: string) => `0x${Buffer.from(message).toString("hex").padStart(130, "0")}`
) as unknown as SignMessageFn;

function ensureCrypto(): void {
  if (!global.crypto) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { webcrypto } = require("node:crypto");
    Object.defineProperty(global, "crypto", {
      value: webcrypto as Crypto,
      writable: true,
      configurable: true,
    });
  }
}

/**
 * These ops read the whole collection/thread. PR5 switched them from `.fetch()`
 * (which builds and pins a WatermelonDB Model per row in the never-evicted
 * RecordCache) to `.unsafeFetchRaw()` + a raw-row → Stored mapper. The wiring
 * suite proves no Model is built (fetch is never called); the parity suite proves
 * the raw path decrypts to exactly the stored plaintext on a real adapter.
 */

describe("chat read ops — use unsafeFetchRaw, never fetch (no Model retained)", () => {
  // A mock collection whose query() exposes BOTH readers: fetch() throws if ever
  // reached (it would pin Models), unsafeFetchRaw() serves the raw rows.
  function spyCtx(rows: Record<string, unknown>[]) {
    const fetchSpy = vi.fn(async () => {
      throw new Error("fetch() must not be called on a bulk read op — use unsafeFetchRaw");
    });
    const unsafeSpy = vi.fn(async () => rows);
    const collection = {
      query: () => ({ fetch: fetchSpy, unsafeFetchRaw: unsafeSpy }),
    } as never;
    const ctx = {
      database: {} as never,
      messagesCollection: collection,
      conversationsCollection: collection,
    } as StorageOperationsContext;
    return { ctx, fetchSpy, unsafeSpy };
  }

  const rawConv = (): Record<string, unknown> => ({
    id: "row_1",
    conversation_id: "conv_1",
    title: "Title",
    project_id: null,
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_000,
    is_deleted: false,
    pinned_at: null,
  });
  const rawMsg = (): Record<string, unknown> => ({
    id: "msg_1",
    message_id: 1,
    conversation_id: "conv_1",
    role: "user",
    content: "hello",
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_000,
  });

  it("getConversationsOp reads via unsafeFetchRaw", async () => {
    const { ctx, fetchSpy, unsafeSpy } = spyCtx([rawConv()]);
    const out = await getConversationsOp(ctx);
    expect(unsafeSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(out[0].conversationId).toBe("conv_1");
    expect(out[0].isDeleted).toBe(false);
  });

  it("getConversationsByProjectOp reads via unsafeFetchRaw", async () => {
    const { ctx, fetchSpy, unsafeSpy } = spyCtx([rawConv()]);
    const out = await getConversationsByProjectOp(ctx, null);
    expect(unsafeSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(out).toHaveLength(1);
  });

  it("getConversationsLazyOp reads via unsafeFetchRaw", async () => {
    const { ctx, fetchSpy, unsafeSpy } = spyCtx([rawConv()]);
    const out = await getConversationsLazyOp(ctx);
    expect(unsafeSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(out[0].encryptedTitle).toBe("Title");
  });

  it("getMessagesOp reads via unsafeFetchRaw", async () => {
    const { ctx, fetchSpy, unsafeSpy } = spyCtx([rawMsg()]);
    const out = await getMessagesOp(ctx, "conv_1");
    expect(unsafeSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(out[0].content).toBe("hello");
  });

  it("getMessagesPageOp reads via unsafeFetchRaw", async () => {
    const { ctx, fetchSpy, unsafeSpy } = spyCtx([rawMsg()]);
    const out = await getMessagesPageOp(ctx, "conv_1", { limit: 5 });
    expect(unsafeSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(out[0].uniqueId).toBe("msg_1");
  });

  it("getMessageSkeletonsOp reads via unsafeFetchRaw", async () => {
    const { ctx, fetchSpy, unsafeSpy } = spyCtx([rawMsg()]);
    const out = await getMessageSkeletonsOp(ctx, "conv_1");
    expect(unsafeSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(out[0].role).toBe("user");
  });

  it("maps a NULL timestamp to null, not epoch/Invalid Date (matches the @date getter)", async () => {
    // A legacy / partially-migrated row can carry a null created_at/updated_at. The old @date
    // getter returns null; the raw path must too — never new Date(null)=epoch or new Date(undefined).
    const { ctx } = spyCtx([{ ...rawMsg(), created_at: null, updated_at: null }]);
    const [msg] = await getMessagesOp(ctx, "conv_1");
    expect(msg.createdAt).toBeNull();
    expect(msg.updatedAt).toBeNull();
  });
});

describe("chat read ops — unsafeFetchRaw decrypt parity (real adapter, encrypted)", () => {
  function makeDatabase(): Database {
    const adapter = new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `raw-test-${Math.random().toString(36).slice(2)}`,
    });
    return new Database({ adapter, modelClasses: sdkModelClasses });
  }

  function makeEncryptedCtx(db: Database): StorageOperationsContext {
    return {
      database: db,
      messagesCollection: db.get("history"),
      conversationsCollection: db.get<Conversation>("conversations"),
      walletAddress: TEST_ADDRESS,
      signMessage: mockSignMessage,
    };
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    clearAllEncryptionKeys();
    ensureCrypto();
    await requestEncryptionKey(TEST_ADDRESS, mockSignMessage);
  });

  it("getConversationsOp decrypts the title stored as ciphertext", async () => {
    const ctx = makeEncryptedCtx(makeDatabase());
    await createConversationOp(ctx, { conversationId: "conv-1", title: "My Secret Chat" });

    // Stored at rest as ciphertext, not plaintext.
    const rows = (await ctx.conversationsCollection.query().unsafeFetchRaw()) as Record<
      string,
      unknown
    >[];
    expect(String(rows[0].title).startsWith("enc:")).toBe(true);

    const convs = await getConversationsOp(ctx);
    expect(convs).toHaveLength(1);
    expect(convs[0].title).toBe("My Secret Chat");
    expect(convs[0].conversationId).toBe("conv-1");
    expect(convs[0].isDeleted).toBe(false);
  });

  it("getMessagesOp decrypts content + thinking through the raw path", async () => {
    const ctx = makeEncryptedCtx(makeDatabase());
    await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "assistant",
      content: "secret body",
      thinking: "secret reasoning",
      uniqueId: "m1",
    });

    // Ciphertext at rest.
    const rows = (await ctx.messagesCollection.query().unsafeFetchRaw()) as Record<
      string,
      unknown
    >[];
    expect(String(rows[0].content).startsWith("enc:")).toBe(true);

    const msgs = await getMessagesOp(ctx, "conv-1");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe("secret body");
    expect(msgs[0].thinking).toBe("secret reasoning");
    expect(msgs[0].role).toBe("assistant");
    expect(msgs[0].messageId).toBe(1);
  });

  it("getMessagesPageOp decrypts content but drops vector/chunks (skipEmbeddings)", async () => {
    const ctx = makeEncryptedCtx(makeDatabase());
    await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "assistant",
      content: "with embedding",
      vector: [0.1, 0.2, 0.3],
      uniqueId: "m1",
    });

    const page = await getMessagesPageOp(ctx, "conv-1", { limit: 5 });
    expect(page).toHaveLength(1);
    expect(page[0].content).toBe("with embedding");
    expect(page[0].vector).toBeUndefined();
    expect(page[0].chunks).toBeUndefined();
  });

  it("getMessageSkeletonsOp decrypts ONLY user-parented-by-user content via the raw path", async () => {
    const ctx = makeEncryptedCtx(makeDatabase());
    await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "user",
      content: "original prompt",
      uniqueId: "u1",
    });
    // Regeneration artifact: a user message parented by another user message.
    await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "user",
      content: "[Tool Execution Results] ...",
      uniqueId: "u2",
      parentMessageId: "u1",
    });
    // Assistant child of a user row — must NOT carry content.
    await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "assistant",
      content: "assistant reply",
      uniqueId: "a1",
      parentMessageId: "u1",
    });

    const skeletons = await getMessageSkeletonsOp(ctx, "conv-1");
    const byId = new Map(skeletons.map((s) => [s.uniqueId, s]));
    // Decrypted, not the "enc:" ciphertext.
    expect(byId.get("u2")?.content).toBe("[Tool Execution Results] ...");
    expect(byId.get("u1")?.content).toBeUndefined();
    expect(byId.get("a1")?.content).toBeUndefined();
    expect(byId.get("a1")?.parentMessageId).toBe("u1");
  });

  it("getConversationsOp preserves plaintext (legacy/unencrypted) titles unchanged", async () => {
    // No encryption context: createConversationOp stores plaintext; the raw read
    // path must pass it through byte-for-byte.
    const ctx: StorageOperationsContext = {
      database: makeEncryptedCtx(makeDatabase()).database,
      messagesCollection: {} as never,
      conversationsCollection: {} as never,
    } as StorageOperationsContext;
    const plainCtx = {
      ...ctx,
      conversationsCollection: (ctx.database as Database).get<Conversation>("conversations"),
      walletAddress: undefined,
      signMessage: undefined,
    } as StorageOperationsContext;

    await createConversationOp(plainCtx, { conversationId: "conv-plain", title: "Legacy Title" });
    const convs = await getConversationsOp(plainCtx);
    expect(convs).toHaveLength(1);
    expect(convs[0].title).toBe("Legacy Title");
  });
});
