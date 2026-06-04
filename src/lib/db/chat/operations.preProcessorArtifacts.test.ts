// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it } from "vitest";

import type { PreProcessorArtifact } from "../../chat/preProcessor";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation } from "./models";
import { createMessageOp, getMessagesOp, makeSyntheticStoredMessage } from "./operations";
import type { StorageOperationsContext } from "./operations";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `pp-art-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

async function makeCtx(): Promise<StorageOperationsContext> {
  const database = makeDatabase();
  const conversationsCollection = database.get<Conversation>("conversations");
  // Seed a conversation row so createMessageOp's conversation lookup succeeds.
  await database.write(async () => {
    await conversationsCollection.create((c) => {
      c._setRaw("conversation_id", "conv-1");
      c._setRaw("title", "test");
      c._setRaw("created_at", Date.now());
      c._setRaw("updated_at", Date.now());
      c._setRaw("is_deleted", false);
    });
  });
  return {
    database,
    messagesCollection: database.get("history"),
    conversationsCollection,
  };
}

const artifact: PreProcessorArtifact = {
  type: "weather",
  payload: { forecasts: [{ location: { name: "Lisbon" } }] },
  key: "lisbon",
};

describe("createMessageOp / getMessagesOp pre_processor_artifacts round-trip", () => {
  beforeEach(() => {
    /* fresh DB per test via makeCtx */
  });

  it("persists and rehydrates a single artifact intact", async () => {
    const ctx = await makeCtx();
    const created = await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "assistant",
      content: "hello",
      preProcessorArtifacts: [artifact],
    });

    expect(created.preProcessorArtifacts).toEqual([artifact]);

    const rows = await getMessagesOp(ctx, "conv-1");
    expect(rows).toHaveLength(1);
    expect(rows[0].preProcessorArtifacts).toEqual([artifact]);
  });

  it("persists multiple artifacts in the same row", async () => {
    const ctx = await makeCtx();
    const a2: PreProcessorArtifact = { type: "crypto_chart", payload: { quotes: [] } };
    await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "assistant",
      content: "hi",
      preProcessorArtifacts: [artifact, a2],
    });

    const rows = await getMessagesOp(ctx, "conv-1");
    expect(rows[0].preProcessorArtifacts).toEqual([artifact, a2]);
  });

  it("stores undefined when no artifacts are passed (no column value written)", async () => {
    const ctx = await makeCtx();
    await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "assistant",
      content: "no-art",
    });

    const rows = await getMessagesOp(ctx, "conv-1");
    expect(rows[0].preProcessorArtifacts).toBeUndefined();
  });

  it("treats an empty artifacts array as 'no artifacts' (column stays null on read)", async () => {
    const ctx = await makeCtx();
    await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "assistant",
      content: "empty",
      preProcessorArtifacts: [],
    });

    const rows = await getMessagesOp(ctx, "conv-1");
    expect(rows[0].preProcessorArtifacts).toBeUndefined();
  });

  it("makeSyntheticStoredMessage passes preProcessorArtifacts through (queued-write parity)", () => {
    const synthetic = makeSyntheticStoredMessage({
      conversationId: "conv-1",
      role: "assistant",
      content: "x",
      preProcessorArtifacts: [artifact],
    });
    expect(synthetic.preProcessorArtifacts).toEqual([artifact]);
  });
});
