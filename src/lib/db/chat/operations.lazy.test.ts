import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAllEncryptionKeys,
  requestEncryptionKey,
  type SignMessageFn,
} from "../../../react/useEncryption";
import { encryptField } from "../encryption-utils";
import { decryptConversationTitle } from "./lazyDecrypt";
import type { Conversation } from "./models";
import { getConversationsByProjectLazyOp, getConversationsLazyOp } from "./operations";
import type { StorageOperationsContext } from "./operations";

declare const global: typeof globalThis;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;

const mockSignMessage = vi.fn(async (message: string) => {
  return `0x${Buffer.from(message).toString("hex").padStart(130, "0")}`;
}) as unknown as SignMessageFn;

/**
 * Build a minimal Conversation-shaped record. The lazy op only reads
 * id, conversationId, title, projectId, createdAt, updatedAt, isDeleted —
 * everything else (relations, _raw, _getRaw) is unused on this path.
 */
function fakeConversation(overrides: Partial<Conversation>): Conversation {
  const defaults = {
    id: "row_xxx",
    conversationId: "conv_xxx",
    title: "Title",
    projectId: undefined as string | undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  };
  return { ...defaults, ...overrides } as unknown as Conversation;
}

/**
 * Build a fake context with a stub conversationsCollection. The stub
 * captures the query call and returns the rows we hand it. Lets us
 * test the lazy op end-to-end without instantiating WatermelonDB.
 */
function makeCtx(rows: Conversation[]): {
  ctx: StorageOperationsContext;
  queryCalls: unknown[][];
} {
  const queryCalls: unknown[][] = [];
  const ctx = {
    // Other ctx fields are unused by the lazy ops.
    database: {} as never,
    messagesCollection: {} as never,
    conversationsCollection: {
      query: (...args: unknown[]) => {
        queryCalls.push(args);
        return {
          fetch: async () => rows,
        };
      },
    } as never,
    walletAddress: "0x1234567890123456789012345678901234567890",
    signMessage: mockSignMessage,
  } as StorageOperationsContext;
  return { ctx, queryCalls };
}

describe("getConversationsLazyOp", () => {
  const testAddress = "0x1234567890123456789012345678901234567890";

  beforeEach(async () => {
    vi.clearAllMocks();
    clearAllEncryptionKeys();

    if (!global.crypto) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { webcrypto } = require("node:crypto");
      Object.defineProperty(global, "crypto", {
        value: webcrypto as Crypto,
        writable: true,
        configurable: true,
      });
    }
  });

  it("returns conversations with encryptedTitle preserved verbatim", async () => {
    await requestEncryptionKey(testAddress, mockSignMessage);
    const enc1 = await encryptField("First", testAddress, mockSignMessage);
    const enc2 = await encryptField("Second", testAddress, mockSignMessage);

    const { ctx } = makeCtx([
      fakeConversation({ id: "row_1", conversationId: "conv_1", title: enc1 }),
      fakeConversation({ id: "row_2", conversationId: "conv_2", title: enc2 }),
    ]);

    const result = await getConversationsLazyOp(ctx);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      uniqueId: "row_1",
      conversationId: "conv_1",
      encryptedTitle: enc1,
      isDeleted: false,
    });
    expect(result[1].encryptedTitle).toBe(enc2);
    // Critical: no `title` field on the lazy result.
    expect((result[0] as Record<string, unknown>).title).toBeUndefined();
  });

  it("does not call crypto.subtle.decrypt on the lazy path", async () => {
    await requestEncryptionKey(testAddress, mockSignMessage);
    const enc = await encryptField("Secret title", testAddress, mockSignMessage);

    const { ctx } = makeCtx([
      fakeConversation({ id: "row_1", conversationId: "conv_1", title: enc }),
    ]);

    const decryptSpy = vi.spyOn(crypto.subtle, "decrypt");

    const result = await getConversationsLazyOp(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].encryptedTitle).toBe(enc);
    // Eager path would have called decrypt once per row.
    expect(decryptSpy).not.toHaveBeenCalled();

    decryptSpy.mockRestore();
  });

  it("round-trips through decryptConversationTitle on demand", async () => {
    await requestEncryptionKey(testAddress, mockSignMessage);
    const plaintext = "Round-tripped title";
    const enc = await encryptField(plaintext, testAddress, mockSignMessage);

    const { ctx } = makeCtx([
      fakeConversation({ id: "row_1", conversationId: "conv_1", title: enc }),
    ]);

    const [row] = await getConversationsLazyOp(ctx);
    const decrypted = await decryptConversationTitle(row.encryptedTitle, testAddress);

    expect(decrypted).toBe(plaintext);
  });

  it("preserves plaintext titles for legacy/unencrypted conversations", async () => {
    const { ctx } = makeCtx([
      fakeConversation({ id: "row_1", conversationId: "conv_1", title: "Legacy" }),
    ]);

    const [row] = await getConversationsLazyOp(ctx);
    expect(row.encryptedTitle).toBe("Legacy");
    // decryptConversationTitle should pass plaintext through unchanged
    // even without a key loaded — no eager decrypt happened anywhere.
    const result = await decryptConversationTitle(row.encryptedTitle, testAddress);
    expect(result).toBe("Legacy");
  });
});

describe("getConversationsByProjectLazyOp", () => {
  const testAddress = "0x1234567890123456789012345678901234567890";

  beforeEach(async () => {
    vi.clearAllMocks();
    clearAllEncryptionKeys();
  });

  it("returns lazy projections without decrypting on the project path", async () => {
    await requestEncryptionKey(testAddress, mockSignMessage);
    const enc = await encryptField("Project title", testAddress, mockSignMessage);

    const { ctx } = makeCtx([
      fakeConversation({
        id: "row_p1",
        conversationId: "conv_p1",
        title: enc,
        projectId: "proj_1",
      }),
    ]);

    const decryptSpy = vi.spyOn(crypto.subtle, "decrypt");

    const result = await getConversationsByProjectLazyOp(ctx, "proj_1");

    expect(result).toHaveLength(1);
    expect(result[0].encryptedTitle).toBe(enc);
    expect(result[0].projectId).toBe("proj_1");
    expect(decryptSpy).not.toHaveBeenCalled();

    decryptSpy.mockRestore();
  });

  it("treats null projectId as the unfiled bucket via the empty-string sentinel", async () => {
    const { ctx, queryCalls } = makeCtx([]);

    await getConversationsByProjectLazyOp(ctx, null);

    // The first arg to `query` is `Q.where("project_id", "")` for null.
    // We can't introspect the WatermelonDB Q result deeply here, but we
    // can confirm a query was issued — i.e. the op didn't bail out.
    expect(queryCalls.length).toBe(1);
  });
});
