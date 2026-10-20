import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearAllEncryptionKeys, seedEncryptionKeys } from "../../../react/useEncryption";
import { cleanupConversationSummary, maybeSummarizeHistory } from "../../chat/summarize";
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
      seedEncryptionKeys(walletAddress, { current: "ab".repeat(32) });
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
