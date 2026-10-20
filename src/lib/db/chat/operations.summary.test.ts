import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it } from "vitest";

import { maybeSummarizeHistory } from "../../chat/summarize";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
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
import {
  createSummaryContext,
  getConversationSummaryOp,
  upsertConversationSummaryOp,
} from "./summaryOperations";

describe("conversation summary invalidation", () => {
  let ctx: StorageOperationsContext;
  let summaryCtx: ReturnType<typeof createSummaryContext>;

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
