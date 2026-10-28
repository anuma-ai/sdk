import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearAllEncryptionKeys, seedEncryptionKeys } from "../../../react/useEncryption";
import { cleanupConversationSummary, maybeSummarizeHistory } from "../../chat/summarize";
import { PiiRedactor } from "../../pii/redactor";
import { localChatBackend } from "../../storage/WatermelonChatStorageAdapter";
import { encryptField, isEncrypted } from "../encryption-utils";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation, Message } from "./models";
import {
  clearMessagesOp,
  createMessageOp,
  deleteMessageOp,
  getMessageOp,
  getMessagesOp,
  type StorageOperationsContext,
  updateMessageFileIdsOp,
  upsertMessageOp,
} from "./operations";
import { chatStorageMigrations, chatStorageSchema } from "./schema";
import {
  createSummaryContext,
  deleteConversationSummaryOp,
  getConversationSummaryOp,
  upsertConversationSummaryOp,
} from "./summaryOperations";

describe("conversation summary invalidation", () => {
  let ctx: StorageOperationsContext;
  let summaryCtx: ReturnType<typeof createSummaryContext>;

  afterEach(async () => {
    vi.unstubAllGlobals();
    clearAllEncryptionKeys();
    await cleanupConversationSummary(ctx.database, "conv_1");
  });

  beforeEach(async () => {
    const database = new Database({
      adapter: new LokiJSAdapter({
        schema: sdkSchema,
        migrations: sdkMigrations,
        useWebWorker: false,
        useIncrementalIndexedDB: false,
        dbName: `summary-invalidation-${Math.random()}`,
      }),
      modelClasses: sdkModelClasses,
    });
    ctx = {
      database,
      messagesCollection: database.get("history"),
      conversationsCollection: database.get("conversations"),
    };
    summaryCtx = createSummaryContext(database);
    for (const [uniqueId, content] of [
      ["m1", "I live in Paris."],
      ["m2", "I work at Acme."],
      ["m3", "What do you remember?"],
    ]) {
      await createMessageOp(ctx, { conversationId: "conv_1", uniqueId, role: "user", content });
    }
    await upsertConversationSummaryOp(
      summaryCtx,
      "conv_1",
      "Lives in Paris. Works at Acme.",
      "m2",
      9
    );
    await upsertConversationSummaryOp(summaryCtx, "conv_2", "Another conversation.", "other", 6);
  });

  it.each(["summary", "compaction"])("encrypts the %s after PII restoration", async (mode) => {
    const walletAddress = "0x1234567890123456789012345678901234567890";
    seedEncryptionKeys(walletAddress, { legacy: "cd".repeat(32), current: "ab".repeat(32) });
    const backend = localChatBackend(ctx.database)({
      walletAddress,
      signMessage: vi.fn(() => Promise.resolve("test-signature")),
    });
    await backend.upsertMessage({
      conversationId: "conv_1",
      uniqueId: "m1",
      role: "user",
      content: `My email is bob@acme.com. ${"context ".repeat(100)}`,
    });
    expect(isEncrypted((await ctx.messagesCollection.find("m1")).content)).toBe(true);
    if (mode === "compaction") {
      const initial = await backend.upsertSummary(
        "conv_1",
        "The email is bob@acme.com.",
        "m2",
        100
      );
      expect(initial.summary).toBe("The email is bob@acme.com.");
    }
    const fetchMock = vi.fn((_url: unknown, _init?: RequestInit) =>
      Promise.resolve(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "The email is [EMAIL_1]." } }] })
        )
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const messages = await backend.getMessages("conv_1");
    const options = {
      database: ctx.database,
      summaries: backend,
      conversationId: "conv_1",
      messages,
      summarizeHistory: true,
      summaryTokenThreshold: 100,
      summaryMinWindowMessages: 1,
      summaryModel: "test",
      token: "test-token",
      redactor: new PiiRedactor(),
    };

    const result = await maybeSummarizeHistory(options);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.body).toContain("[EMAIL_1]");
    expect(fetchMock.mock.calls[0][1]?.body).not.toContain("bob@acme.com");
    expect(JSON.stringify(result.summarySystemMessage)).toContain("bob@acme.com");
    const summary = await backend.getSummary("conv_1");
    expect(summary?.summary).toBe("The email is bob@acme.com.");
    const record = await summaryCtx.summariesCollection.find(summary!.uniqueId);
    expect(isEncrypted(record.summary)).toBe(true);
    expect(record.summary).not.toContain("bob@acme.com");
    expect(record.tokenCount).toBe(Math.ceil(summary!.summary.length / 4));
    expect(record.summarizedUpTo).toBe(summary!.summarizedUpTo);

    for (const history of [messages, messages.slice(-1)]) {
      const cached = await maybeSummarizeHistory({
        ...options,
        messages: history,
        summaryTokenThreshold: 10_000,
      });
      expect(JSON.stringify(cached.summarySystemMessage)).toContain("bob@acme.com");
      expect(JSON.stringify(cached.summarySystemMessage)).not.toContain("enc:v3:");
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("decrypts an existing summary through the local backend", async () => {
    const walletAddress = "0x1234567890123456789012345678901234567890";
    seedEncryptionKeys(walletAddress, { legacy: "cd".repeat(32), current: "ab".repeat(32) });
    const signer = { walletAddress, signMessage: vi.fn(() => Promise.resolve("test-signature")) };
    const backend = localChatBackend(ctx.database)(signer);
    expect((await backend.getSummary("conv_1"))?.summary).toBe("Lives in Paris. Works at Acme.");
    const ciphertext = await encryptField("Lives in Paris.", walletAddress, signer.signMessage);
    await upsertConversationSummaryOp(summaryCtx, "conv_1", ciphertext, "m2", 4);

    const summary = await backend.getSummary("conv_1");

    expect(summary).toMatchObject({
      summary: "Lives in Paris.",
      summarizedUpTo: "m2",
      tokenCount: 4,
    });
    expect((await summaryCtx.summariesCollection.find(summary!.uniqueId)).summary).toBe(ciphertext);
  });

  it("encrypts a legacy summary on read and preserves the summary metadata", async () => {
    const walletAddress = "0x1234567890123456789012345678901234567890";
    seedEncryptionKeys(walletAddress, { legacy: "cd".repeat(32), current: "ab".repeat(32) });
    const backend = localChatBackend(ctx.database)({
      walletAddress,
      signMessage: vi.fn(() => Promise.resolve("test-signature")),
    });
    const before = await getConversationSummaryOp(summaryCtx, "conv_1");

    expect(await backend.getSummary("conv_1")).toEqual(before);
    const record = await summaryCtx.summariesCollection.find(before!.uniqueId);
    const ciphertext = record.summary;
    expect(isEncrypted(ciphertext)).toBe(true);
    expect(ciphertext).not.toContain("Paris");
    expect(await backend.getSummary("conv_1")).toMatchObject({
      summary: before!.summary,
      summarizedUpTo: before!.summarizedUpTo,
      tokenCount: before!.tokenCount,
    });
    expect(record.summary).toBe(ciphertext);
  });

  it("preserves a readable legacy summary when the wallet rejects the key request", async () => {
    const signMessage = vi.fn(() => Promise.reject(new Error("Signature rejected")));
    const backend = localChatBackend(ctx.database)({
      walletAddress: "0x1234567890123456789012345678901234567890",
      signMessage,
    });
    const before = await getConversationSummaryOp(summaryCtx, "conv_1");

    expect(await backend.getSummary("conv_1")).toEqual(before);
    expect(signMessage).toHaveBeenCalledTimes(1);
    expect(await getConversationSummaryOp(summaryCtx, "conv_1")).toEqual(before);
  });

  it.each(["update", "delete"])(
    "preserves a concurrent summary %s during legacy encryption",
    async (mutation) => {
      let resolveSignature!: (signature: string) => void;
      const signature = new Promise<string>((resolve) => {
        resolveSignature = resolve;
      });
      let markStarted!: () => void;
      const started = new Promise<void>((resolve) => {
        markStarted = resolve;
      });
      const backend = localChatBackend(ctx.database)({
        walletAddress: "0x1234567890123456789012345678901234567890",
        signMessage: () => {
          markStarted();
          return signature;
        },
      });
      const pending = backend.getSummary("conv_1");
      await started;

      if (mutation === "update") {
        await upsertConversationSummaryOp(summaryCtx, "conv_1", "Current summary.", "m3", 4);
      } else {
        await deleteConversationSummaryOp(summaryCtx, "conv_1");
      }
      resolveSignature(`0x${"ab".repeat(65)}`);
      await pending;

      expect(await getConversationSummaryOp(summaryCtx, "conv_1")).toEqual(
        mutation === "update" ? expect.objectContaining({ summary: "Current summary." }) : null
      );
    }
  );

  it("returns the supplied summary after an encrypted write without a decrypt", async () => {
    const walletAddress = "0x1234567890123456789012345678901234567890";
    seedEncryptionKeys(walletAddress, { legacy: "cd".repeat(32), current: "ab".repeat(32) });
    const backend = localChatBackend(ctx.database)({
      walletAddress,
      signMessage: vi.fn(() => Promise.resolve("test-signature")),
    });
    const decrypt = vi.spyOn(crypto.subtle, "decrypt");
    try {
      expect(await backend.upsertSummary("conv_1", "New private fact.", "m3", 4)).toMatchObject({
        summary: "New private fact.",
        summarizedUpTo: "m3",
        tokenCount: 4,
      });
      expect(decrypt).not.toHaveBeenCalled();
    } finally {
      decrypt.mockRestore();
    }
  });

  it.each(["write", "edit", "delete", "clear"])(
    "permits a database %s during a summary key request",
    async (mutation) => {
      let resolveSignature!: (signature: string) => void;
      const signature = new Promise<string>((resolve) => {
        resolveSignature = resolve;
      });
      let markStarted!: () => void;
      const started = new Promise<void>((resolve) => {
        markStarted = resolve;
      });
      const backend = localChatBackend(ctx.database)({
        walletAddress: "0x1234567890123456789012345678901234567890",
        signMessage: () => {
          markStarted();
          return signature;
        },
      });
      const pending = backend.upsertSummary("conv_1", "New private fact.", "m2", 4);
      await started;

      if (mutation === "write") {
        await ctx.database.write(async () => {});
      } else if (mutation === "edit") {
        await upsertMessageOp(ctx, {
          conversationId: "conv_1",
          uniqueId: "m1",
          role: "user",
          content: "I live in Rome.",
        });
      } else if (mutation === "delete") {
        await deleteMessageOp(ctx, "m1");
      } else {
        await clearMessagesOp(ctx, "conv_1");
      }
      resolveSignature(`0x${"ab".repeat(65)}`);

      if (mutation === "write") {
        expect(await pending).toMatchObject({ summary: "New private fact." });
      } else {
        await expect(pending).rejects.toThrow("The conversation changed");
        expect(await getConversationSummaryOp(summaryCtx, "conv_1")).toBeNull();
      }
    }
  );

  it("preserves the stored summary if encryption fails", async () => {
    const walletAddress = "0x1234567890123456789012345678901234567890";
    seedEncryptionKeys(walletAddress, { legacy: "cd".repeat(32), current: "ab".repeat(32) });
    const backend = localChatBackend(ctx.database)({
      walletAddress,
      signMessage: vi.fn(() => Promise.resolve("test-signature")),
    });
    const before = await getConversationSummaryOp(summaryCtx, "conv_1");
    const encrypt = vi
      .spyOn(crypto.subtle, "encrypt")
      .mockRejectedValueOnce(new Error("Cannot encrypt"));
    try {
      await expect(backend.upsertSummary("conv_1", "New private fact.", "m3", 4)).rejects.toThrow(
        "Cannot encrypt"
      );
      expect(await getConversationSummaryOp(summaryCtx, "conv_1")).toEqual(before);
    } finally {
      encrypt.mockRestore();
    }
  });

  async function expectCurrentHistory(): Promise<void> {
    const messages = await getMessagesOp(ctx, "conv_1");
    const result = await maybeSummarizeHistory({
      database: ctx.database,
      conversationId: "conv_1",
      messages,
      summarizeHistory: true,
      summaryTokenThreshold: 10_000,
      summaryMinWindowMessages: 1,
      summaryModel: "test",
      token: "test-token",
    });

    expect(result.summarySystemMessage).toBeNull();
    expect(result.messagesToConvert).toEqual(messages);
    expect(await getConversationSummaryOp(summaryCtx, "conv_1")).toBeNull();
    expect(await getConversationSummaryOp(summaryCtx, "conv_2")).toMatchObject({
      summary: "Another conversation.",
    });
  }

  it.each(["m1", "m2"])("invalidates the summary after deletion of %s", async (uniqueId) => {
    expect(await deleteMessageOp(ctx, uniqueId)).toBe(uniqueId);
    expect(await getMessageOp(ctx, uniqueId)).toBeNull();

    await expectCurrentHistory();
  });

  it("invalidates the summary after all messages are deleted", async () => {
    await clearMessagesOp(ctx, "conv_1");
    expect(await getMessagesOp(ctx, "conv_1")).toEqual([]);

    await expectCurrentHistory();
  });

  it("excludes deleted facts from the next request after a new message", async () => {
    const options = {
      database: ctx.database,
      conversationId: "conv_1",
      summarizeHistory: true,
      summaryTokenThreshold: 10_000,
      summaryMinWindowMessages: 1,
      summaryModel: "test",
      token: "test-token",
    };
    const before = await maybeSummarizeHistory({
      ...options,
      messages: await getMessagesOp(ctx, "conv_1"),
    });
    expect(before.summarySystemMessage?.role).toBe("system");
    expect(JSON.stringify(before.summarySystemMessage)).toContain("Lives in Paris.");

    await deleteMessageOp(ctx, "m1");
    await createMessageOp(ctx, {
      conversationId: "conv_1",
      uniqueId: "m4",
      role: "user",
      content: "Where do I live?",
    });
    const after = await maybeSummarizeHistory({
      ...options,
      messages: await getMessagesOp(ctx, "conv_1"),
    });

    expect(after.summarySystemMessage).toBeNull();
    expect(after.messagesToConvert.map(({ uniqueId }) => uniqueId)).toEqual(["m2", "m3", "m4"]);
    expect(after.messagesToConvert.map(({ content }) => content).join(" ")).not.toContain("Paris");
  });

  it.each(["I live in Rome.", ""])(
    "invalidates the summary after a content update to %j",
    async (content) => {
      const updated = await upsertMessageOp(ctx, {
        conversationId: "conv_1",
        uniqueId: "m1",
        role: "user",
        content,
      });
      expect(updated.content).toBe(content);

      await expectCurrentHistory();
    }
  );

  it.each(["I live in Paris.", "I live in Rome.", ""])(
    "preserves the summary only for unchanged encrypted content: %j",
    async (content) => {
      const walletAddress = "0x1234567890123456789012345678901234567890";
      seedEncryptionKeys(walletAddress, { legacy: "cd".repeat(32), current: "ab".repeat(32) });
      const encryptedCtx = {
        ...ctx,
        walletAddress,
        signMessage: vi.fn(() => Promise.resolve("test-signature")),
      };
      await upsertMessageOp(encryptedCtx, {
        conversationId: "conv_1",
        uniqueId: "m1",
        role: "user",
        content: "I live in Paris.",
      });
      await upsertConversationSummaryOp(
        summaryCtx,
        "conv_1",
        "Lives in Paris. Works at Acme.",
        "m2",
        9
      );
      const summary = await getConversationSummaryOp(summaryCtx, "conv_1");
      const encryptedContent = (await ctx.messagesCollection.find("m1")).content;
      expect(encryptedContent).toMatch(/^enc:/);

      const updated = await upsertMessageOp(encryptedCtx, {
        conversationId: "conv_1",
        uniqueId: "m1",
        role: "user",
        content,
      });

      expect(updated.content).toBe(content);
      expect((await ctx.messagesCollection.find("m1")).content).not.toBe(encryptedContent);
      expect(await getConversationSummaryOp(summaryCtx, "conv_1")).toEqual(
        content === "I live in Paris." ? summary : null
      );
    }
  );

  it.each([
    ["summary", "delete"],
    ["summary", "edit"],
    ["summary", "clear"],
    ["compaction", "delete"],
    ["compaction", "edit"],
    ["compaction", "clear"],
  ])("rejects a pending %s after a message %s", async (mode, mutation) => {
    const threshold = mode === "compaction" ? 10 : 100;
    await upsertMessageOp(ctx, {
      conversationId: "conv_1",
      uniqueId: "m3",
      role: "user",
      content: "What do you remember? ".repeat(100),
    });
    await createMessageOp(ctx, {
      conversationId: "conv_1",
      uniqueId: "m4",
      role: "user",
      content: "Where do I live?",
    });
    await upsertConversationSummaryOp(
      summaryCtx,
      "conv_1",
      "Lives in Paris. Works at Acme.",
      "m2",
      9
    );
    let resolveResponse!: (response: Response) => void;
    const response = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const fetchMock = vi.fn(() => {
      markStarted();
      return response;
    });
    vi.stubGlobal("fetch", fetchMock);
    const options = {
      database: ctx.database,
      conversationId: "conv_1",
      summarizeHistory: true,
      summaryTokenThreshold: threshold,
      summaryMinWindowMessages: 1,
      summaryModel: "test",
      token: "test-token",
    };
    const pending = maybeSummarizeHistory({
      ...options,
      messages: await getMessagesOp(ctx, "conv_1"),
    });
    await started;

    if (mutation === "delete") {
      await deleteMessageOp(ctx, "m1");
    } else if (mutation === "clear") {
      await clearMessagesOp(ctx, "conv_1");
    } else {
      await upsertMessageOp(ctx, {
        conversationId: "conv_1",
        uniqueId: "m1",
        role: "user",
        content: "I live in Rome.",
      });
    }
    resolveResponse(
      new Response(JSON.stringify({ choices: [{ message: { content: "Lives in Paris." } }] }))
    );

    await expect(pending).rejects.toThrow("The conversation changed");
    expect(await getConversationSummaryOp(summaryCtx, "conv_1")).toBeNull();
    const currentMessages = await getMessagesOp(ctx, "conv_1");
    const nextRequest = await maybeSummarizeHistory({
      ...options,
      summaryTokenThreshold: 10_000,
      messages: currentMessages,
    });
    expect(nextRequest.summarySystemMessage).toBeNull();
    expect(nextRequest.messagesToConvert).toEqual(currentMessages);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["edit", "delete"])(
    "preserves the summary after a %s of a message past the summary",
    async (mutation) => {
      const summary = await getConversationSummaryOp(summaryCtx, "conv_1");

      if (mutation === "delete") {
        expect(await deleteMessageOp(ctx, "m3")).toBe("m3");
      } else {
        const updated = await upsertMessageOp(ctx, {
          conversationId: "conv_1",
          uniqueId: "m3",
          role: "user",
          content: "What else do you remember?",
        });
        expect(updated.content).toBe("What else do you remember?");
      }

      expect(await getConversationSummaryOp(summaryCtx, "conv_1")).toEqual(summary);
    }
  );

  it("invalidates the summary after an edit when the summary boundary is missing", async () => {
    await upsertConversationSummaryOp(summaryCtx, "conv_1", "Lives in Paris.", "missing", 4);

    await upsertMessageOp(ctx, {
      conversationId: "conv_1",
      uniqueId: "m3",
      role: "user",
      content: "What else do you remember?",
    });

    expect(await getConversationSummaryOp(summaryCtx, "conv_1")).toBeNull();
  });

  it("preserves the summary after an attachment update", async () => {
    const summary = await getConversationSummaryOp(summaryCtx, "conv_1");

    expect((await updateMessageFileIdsOp(ctx, "m1", ["file_1"]))?.fileIds).toEqual(["file_1"]);

    expect(await getConversationSummaryOp(summaryCtx, "conv_1")).toEqual(summary);
  });

  it("preserves the summary when the message does not exist", async () => {
    const summary = await getConversationSummaryOp(summaryCtx, "conv_1");

    expect(await deleteMessageOp(ctx, "missing")).toBeNull();
    expect(await updateMessageFileIdsOp(ctx, "missing", [])).toBeNull();

    expect(await getConversationSummaryOp(summaryCtx, "conv_1")).toEqual(summary);
  });

  it("preserves the summary after a new message is created", async () => {
    const summary = await getConversationSummaryOp(summaryCtx, "conv_1");

    await upsertMessageOp(ctx, {
      conversationId: "conv_1",
      uniqueId: "m4",
      role: "user",
      content: "A new question.",
    });

    expect(await getConversationSummaryOp(summaryCtx, "conv_1")).toEqual(summary);
  });
});

describe("message changes with the chat storage schema", () => {
  it.each(["delete", "clear", "edit"])(
    "allows a message %s without a summary table",
    async (action) => {
      const database = new Database({
        adapter: new LokiJSAdapter({
          schema: chatStorageSchema,
          migrations: chatStorageMigrations,
          useWebWorker: false,
          useIncrementalIndexedDB: false,
          dbName: `chat-only-${Math.random()}`,
        }),
        modelClasses: [Message, Conversation],
      });
      const ctx: StorageOperationsContext = {
        database,
        messagesCollection: database.get("history"),
        conversationsCollection: database.get("conversations"),
      };
      await createMessageOp(ctx, {
        conversationId: "conv_1",
        uniqueId: "m1",
        role: "user",
        content: "Original content.",
      });

      if (action === "edit") {
        const updated = await upsertMessageOp(ctx, {
          conversationId: "conv_1",
          uniqueId: "m1",
          role: "user",
          content: "Updated content.",
        });
        expect(updated.content).toBe("Updated content.");
        expect((await getMessageOp(ctx, "m1"))?.content).toBe("Updated content.");
      } else {
        if (action === "delete") {
          expect(await deleteMessageOp(ctx, "m1")).toBe("m1");
        } else {
          await clearMessagesOp(ctx, "conv_1");
        }
        expect(await getMessagesOp(ctx, "conv_1")).toEqual([]);
      }
    }
  );
});
