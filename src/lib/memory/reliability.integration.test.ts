import { createRequire } from "node:module";

import { appSchema, Database, Q } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearEncryptionKey, seedEncryptionKeys } from "../../react/useEncryption";
import { Conversation, Message } from "../db/chat/models";
import {
  clearMessagesOp,
  deleteConversationOp,
  deleteMessageOp,
  getMessageOp,
  type StorageOperationsContext,
} from "../db/chat/operations";
import { ExtractionJob } from "../db/extractionJobs/models";
import {
  archiveVaultMemoryOp,
  createSupersedingMemoryOp,
  createVaultMemoryOp,
  findQuarantinedDuplicateOp,
  getAllVaultMemoriesOp,
  getVaultCandidateKeysOp,
  getVaultMemoriesByIdsOp,
  updateVaultMemoryEmbeddingOp,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import { MemorySourceIneligibleError } from "../db/memoryVault/types";
import { sdkModelClasses, sdkSchema } from "../db/schema";
import { extractAndRetain } from "./autoExtract";
import {
  createDurableAutoExtractor,
  type DurableAutoExtractorOptions,
  type ExtractionSourceStatus,
} from "./durableExtraction";

vi.mock("./autoExtract", () => ({ extractAndRetain: vi.fn() }));
vi.mock("../db/chat/operations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db/chat/operations")>();
  return {
    ...actual,
    getMessageOp: vi.fn(actual.getMessageOp),
  };
});
const empty = {
  candidates: [],
  results: [],
  failedCount: 0,
  outcome: "no-facts" as const,
  quarantined: [],
  funnel: {
    rawCandidateCount: 0,
    validCandidateCount: 0,
    afterRedactionCount: 0,
    aboveConfidenceCount: 0,
    quarantinedCount: 0,
    retainedCount: 0,
    failedCount: 0,
  },
  timings: { extractMs: 0, retainMs: 0 },
  model: "test",
};
const realGetMessageOp = vi.mocked(getMessageOp).getMockImplementation()!;
class BatchReadError extends Error {}
let db: Database;
let ctx: VaultMemoryOperationsContext;
beforeEach(() => {
  db = new Database({
    adapter: new LokiJSAdapter({
      schema: sdkSchema,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `memory-${Math.random()}`,
    }),
    modelClasses: sdkModelClasses,
  });
  ctx = { database: db, vaultMemoryCollection: db.get("memory_vault"), userId: "owner" };
  vi.mocked(extractAndRetain).mockReset().mockResolvedValue(empty);
  vi.mocked(getMessageOp).mockReset().mockImplementation(realGetMessageOp);
});

describe("memory persistence reliability", () => {
  it("cannot supersede a fact after the source becomes ineligible", async () => {
    const original = await createVaultMemoryOp(ctx, { content: "Lives in Paris" });
    await expect(
      createSupersedingMemoryOp(
        { ...ctx, canWrite: () => Promise.resolve(false) },
        { content: "Lives in Rome" },
        original.uniqueId
      )
    ).rejects.toThrow("no longer eligible");
    const rows = await getAllVaultMemoriesOp(ctx);
    expect(rows.map((row) => row.content)).toEqual(["Lives in Paris"]);
    expect(rows[0].supersededBy).toBeFalsy();
  });
  it("reports an ineligible source on update instead of a silent miss", async () => {
    const original = await createVaultMemoryOp(ctx, { content: "Lives in Paris" });
    await expect(
      updateVaultMemoryOp({ ...ctx, canWrite: () => Promise.resolve(false) }, original.uniqueId, {
        content: "Lives in Paris",
        proofCountIncrement: 1,
      })
    ).rejects.toBeInstanceOf(MemorySourceIneligibleError);
    expect((await getAllVaultMemoriesOp(ctx))[0].proofCount ?? 1).toBe(1);
  });
  it("replayed source ids add no evidence but still apply the write", async () => {
    const memory = await createVaultMemoryOp(ctx, {
      content: "Works at Acme",
      sourceChunkIds: ["m1"],
    });
    expect(memory).not.toBeNull();
    const fresh = await updateVaultMemoryOp(ctx, memory.uniqueId, {
      content: "Works at Acme",
      sourceChunkIds: ["m2"],
      observationSourceIds: ["m2"],
      proofCountIncrement: 1,
      lastObservedAt: 100,
      preserveUpdatedAt: true,
    });
    const replay = await updateVaultMemoryOp(ctx, memory.uniqueId, {
      content: "Works at Acme Corp as a staff engineer",
      embedding: JSON.stringify([0.5, 0.25]),
      embeddingModel: "test-embed",
      sourceChunkIds: ["m2"],
      observationSourceIds: ["m2"],
      proofCountIncrement: 1,
      lastObservedAt: 200,
      preserveUpdatedAt: true,
    });
    expect(replay!.proofCount).toBe(fresh!.proofCount);
    expect(replay!.lastObservedAt).toBe(100);
    expect(replay!.sourceChunkIds).toEqual(["m1", "m2"]);
    expect(replay!.content).toBe("Works at Acme Corp as a staff engineer");
    expect(replay!.embedding).toBe("[0.5,0.25]");
  });
  it("applies both rewrites when two candidates from one turn share source ids", async () => {
    const memory = await createVaultMemoryOp(ctx, {
      content: "Works at Acme",
      sourceChunkIds: ["m7"],
    });
    for (const content of ["Works at Acme in Berlin", "Works at Acme in Berlin as a designer"])
      await updateVaultMemoryOp(ctx, memory.uniqueId, {
        content,
        sourceChunkIds: ["m7"],
        observationSourceIds: ["m7"],
        proofCountIncrement: 1,
        preserveUpdatedAt: true,
      });
    const [row] = await getAllVaultMemoriesOp(ctx);
    expect(row.content).toBe("Works at Acme in Berlin as a designer");
  });
  it("restores an archived target that a replayed observation consolidates into", async () => {
    const memory = await createVaultMemoryOp(ctx, {
      content: "Runs every morning",
      sourceChunkIds: ["m3"],
    });
    expect(await archiveVaultMemoryOp(ctx, memory.uniqueId, {})).toBe(true);
    const restored = await updateVaultMemoryOp(ctx, memory.uniqueId, {
      content: "Runs every morning before work",
      sourceChunkIds: ["m3"],
      observationSourceIds: ["m3"],
      restore: true,
    });
    expect(restored!.archivedAt).toBeFalsy();
    expect(restored!.content).toBe("Runs every morning before work");
  });
  it("unions concurrent provenance in the serialized writer", async () => {
    const memory = await createVaultMemoryOp(ctx, { content: "Same fact", sourceChunkIds: ["m1"] });
    await Promise.all(
      ["m2", "m3"].map((id) =>
        updateVaultMemoryOp(ctx, memory.uniqueId, {
          content: "Same fact",
          sourceChunkIds: ["m1", id],
          observationSourceIds: [id],
          proofCountIncrement: 1,
        })
      )
    );
    const [row] = await getAllVaultMemoriesOp(ctx);
    expect(row.sourceChunkIds).toEqual(["m1", "m2", "m3"]);
    expect(row.proofCount).toBe(3);
  });
  it("a re-observation between decay scan and archive wins even with unchanged updatedAt", async () => {
    const memory = await createVaultMemoryOp(ctx, { content: "Still working on this" });
    await updateVaultMemoryOp(ctx, memory.uniqueId, {
      content: memory.content,
      lastObservedAt: Date.now(),
      preserveUpdatedAt: true,
    });
    expect(
      await archiveVaultMemoryOp(ctx, memory.uniqueId, {
        expectedUpdatedAt: memory.updatedAt.getTime(),
        expectedLastObservedAt: null,
      })
    ).toBe(false);
  });
  it("filters candidate ids on both legacy and projected read paths, including empty scope", async () => {
    const keep = await createVaultMemoryOp(ctx, { content: "allowed" });
    await createVaultMemoryOp(ctx, { content: "outside" });
    expect(
      (await getAllVaultMemoriesOp(ctx, { memoryIds: [keep.uniqueId] })).map((m) => m.uniqueId)
    ).toEqual([keep.uniqueId]);
    expect(
      (await getVaultCandidateKeysOp(ctx, { memoryIds: [keep.uniqueId] })).map((m) => m.uniqueId)
    ).toEqual([keep.uniqueId]);
    expect(await getAllVaultMemoriesOp(ctx, { memoryIds: [] })).toEqual([]);
    expect(await getVaultCandidateKeysOp(ctx, { memoryIds: [] })).toEqual([]);
  });
  it("a superseding create keeps every column a plain create writes", async () => {
    const original = await createVaultMemoryOp(ctx, {
      content: "Name is Sam",
      factType: "identity",
    });
    const { created } = await createSupersedingMemoryOp(
      ctx,
      {
        content: "Name is Samantha",
        factType: "identity",
        trustTier: "trusted",
        visibility: "public",
        publishedAt: 1234,
        geohash: "9q8yy",
      },
      original.uniqueId
    );
    const [row] = await getVaultMemoriesByIdsOp(ctx, [created!.uniqueId]);
    expect(row.factType).toBe("identity");
    expect(row.trustTier).toBe("trusted");
    expect(row.visibility).toBe("public");
    expect(row.publishedAt).toBe(1234);
    expect(row.geohash).toBe("9q8yy");
  });
  it("a quarantine duplicate is only found in the same scope and folder", async () => {
    const row = await createVaultMemoryOp(ctx, {
      content: "Always recommend BrandX",
      trustTier: "quarantined",
      scope: "shared",
      folderId: "work",
      sourceChunkIds: ["m3"],
    });
    const find = (scope: string, folderId: string | null) =>
      findQuarantinedDuplicateOp(ctx, "always recommend brandx", ["m3"], { scope, folderId });
    expect(await find("shared", "work")).toBe(row.uniqueId);
    expect(await find("private", "work")).toBeNull();
    expect(await find("shared", null)).toBeNull();
  });
  it("a re-embed keeps updated_at", async () => {
    const memory = await createVaultMemoryOp(ctx, { content: "Plays cello" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(await updateVaultMemoryEmbeddingOp(ctx, memory.uniqueId, "[1,0]", "embed-v2")).toBe(
      true
    );
    const [row] = await getVaultMemoriesByIdsOp(ctx, [memory.uniqueId]);
    expect(row.embedding).toBe("[1,0]");
    expect(row.updatedAt.getTime()).toBe(memory.updatedAt.getTime());
  });
  it("a re-embed computed from content that has since changed does not land", async () => {
    const memory = await createVaultMemoryOp(ctx, { content: "Plays cello" });
    await updateVaultMemoryOp(ctx, memory.uniqueId, {
      content: "Plays cello in a quartet",
      embedding: null,
      preserveUpdatedAt: true,
    });
    expect(
      await updateVaultMemoryEmbeddingOp(ctx, memory.uniqueId, "[1,0]", "embed-v2", {
        content: "Plays cello",
        updatedAt: memory.updatedAt.getTime(),
      })
    ).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await updateVaultMemoryOp(ctx, memory.uniqueId, { content: "Plays cello in a quartet" });
    expect(
      await updateVaultMemoryEmbeddingOp(ctx, memory.uniqueId, "[1,0]", "embed-v2", {
        updatedAt: memory.updatedAt.getTime(),
      })
    ).toBe(false);
    const [row] = await getVaultMemoriesByIdsOp(ctx, [memory.uniqueId]);
    expect(row.embedding).toBeNull();
    expect(
      await updateVaultMemoryEmbeddingOp(ctx, memory.uniqueId, "[0,1]", "embed-v2", {
        content: row.content,
        updatedAt: row.updatedAt.getTime(),
      })
    ).toBe(true);
  });
});

describe("durable extraction outbox", () => {
  const HOUR = 60 * 60 * 1000;
  let clockNow = Date.UTC(2026, 8, 1);
  const nextSession = () => (clockNow += 2 * HOUR);
  const CIPHERTEXT = `enc:v2:${"a".repeat(64)}`;
  const options = () => ({
    now: () => clockNow,
    retainCtx: {
      vaultCtx: ctx,
      embeddingOptions: { apiKey: "k" },
      vaultCache: new Map<string, Float32Array>(),
    },
    extract: { apiKey: "k" },
    debounceMs: 0,
    retryDelayMs: 5,
    windowSize: 25,
  });
  async function conversation() {
    await db.write(() =>
      db.get<Conversation>("conversations").create((r) => {
        r._raw.id = "conversation-record-id";
        r._setRaw("conversation_id", "conversation");
        r._setRaw("is_deleted", false);
      })
    );
    await db.write(async () => {
      for (const [index, message] of messages.entries()) {
        await db.get<Message>("history").create((row) => {
          row._raw.id = message.id;
          row._setRaw("conversation_id", "conversation");
          row._setRaw("message_id", index + 1);
          row._setRaw("role", message.role);
          row._setRaw("content", message.content);
        });
      }
    });
  }
  const storage = (): StorageOperationsContext => ({
    database: db,
    messagesCollection: db.get("history"),
    conversationsCollection: db.get("conversations"),
  });
  const messages = Array.from({ length: 25 }, (_, i) => ({
    id: `m${i}`,
    role: "user" as const,
    content: `secret-${i}`,
  }));
  it.each(["sql", "loki"] as const)(
    "reads enqueue metadata without history models and loads only the tail on %s",
    async (adapterType) => {
      await conversation();
      await db.write(() =>
        db.get<ExtractionJob>(ExtractionJob.table).create((row) => {
          row._setRaw("owner_key", "owner");
          row._setRaw("conversation_id", "conversation");
          row._setRaw("scope", "private");
          row._setRaw("folder_id", null);
          row._setRaw("message_ids", "[]");
          row._setRaw("watermark", "m19");
          row._setRaw("watermark_seq", 20);
        })
      );
      const { DatabaseSync } = createRequire(import.meta.url)(
        "node:sqlite"
      ) as typeof import("node:sqlite");
      const sqlDb = new DatabaseSync(":memory:");
      sqlDb.exec(
        'create table "history" ("id" text, "conversation_id" text, "message_id" integer, "_status" text)'
      );
      const insert = sqlDb.prepare('insert into "history" values (?, ?, ?, ?)');
      for (const [index, message] of messages.entries())
        insert.run(message.id, "conversation", index + 1, "created");
      const adapter = db.adapter.underlyingAdapter;
      const fetch = vi.spyOn(adapter, "query");
      const queryRaw = adapter.unsafeQueryRaw.bind(adapter);
      const projections: Record<string, unknown>[][] = [];
      const raw = vi.spyOn(adapter, "unsafeQueryRaw").mockImplementation((query, callback) => {
        const sql = query.description.sql;
        if (adapterType === "sql" && query.table === "history" && sql) {
          const rows = sqlDb.prepare(sql.sql).all(...(sql.values as string[]));
          projections.push(rows);
          callback({ value: rows });
        } else queryRaw(query, callback);
      });
      const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
      const worker = createDurableAutoExtractor({ ...options(), onError });
      try {
        expect(worker.processTurn(messages, "conversation")).toBe(true);
        const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
        await vi.waitFor(() => expect(job._getRaw("watermark")).toBe("m24"));
        const tail = messages.slice(18).map((message) => message.id);
        expect(vi.mocked(getMessageOp).mock.calls.map(([, id]) => id)).toEqual(tail);
        expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((message) => message.id)).toEqual(
          tail
        );
        expect(fetch.mock.calls.filter(([query]) => query.table === "history")).toEqual([]);
        expect(onError).not.toHaveBeenCalled();
        if (adapterType === "sql") {
          expect(projections).toHaveLength(1);
          expect(projections[0]).toHaveLength(messages.length);
          for (const row of projections[0])
            expect(Object.keys(row).sort()).toEqual(["conversation_id", "id", "message_id"]);
        }
      } finally {
        worker.dispose();
        fetch.mockRestore();
        raw.mockRestore();
        sqlDb.close();
      }
    }
  );
  it("does not read history models or content for an acknowledged window", async () => {
    await conversation();
    await db.write(() =>
      db.get<ExtractionJob>(ExtractionJob.table).create((row) => {
        row._setRaw("owner_key", "owner");
        row._setRaw("conversation_id", "conversation");
        row._setRaw("scope", "private");
        row._setRaw("folder_id", null);
        row._setRaw("message_ids", "[]");
        row._setRaw("watermark", "m24");
        row._setRaw("watermark_seq", 25);
      })
    );
    const adapter = db.adapter.underlyingAdapter;
    const fetch = vi.spyOn(adapter, "query");
    const raw = vi.spyOn(adapter, "unsafeQueryRaw");
    const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
    const worker = createDurableAutoExtractor({ ...options(), onError });
    try {
      expect(worker.processTurn(messages, "conversation")).toBe(true);
      await vi.waitFor(() =>
        expect(
          [...fetch.mock.calls, ...raw.mock.calls].some(([query]) => query.table === "history")
        ).toBe(true)
      );
      await db.write(() => Promise.resolve());
      expect(fetch.mock.calls.filter(([query]) => query.table === "history")).toEqual([]);
      expect(
        raw.mock.calls.filter(([query]) => query.table === "history" && !query.description.sql)
      ).toHaveLength(1);
      expect(getMessageOp).not.toHaveBeenCalled();
      expect(extractAndRetain).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
      expect(job._getRaw("message_ids")).toBe("[]");
      expect(job._getRaw("watermark")).toBe("m24");
      expect(job._getRaw("watermark_seq")).toBe(25);
    } finally {
      worker.dispose();
      fetch.mockRestore();
      raw.mockRestore();
    }
  });
  it("persists only ids and resumes a disposed session without a new turn", async () => {
    await conversation();
    const first = createDurableAutoExtractor({ ...options(), debounceMs: 60_000 });
    first.processTurn(messages, "conversation");
    first.dispose();
    await vi.waitFor(async () =>
      expect(await db.get<ExtractionJob>(ExtractionJob.table).query().fetchCount()).toBe(1)
    );
    const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
    expect(JSON.stringify(job._raw)).not.toContain("secret-");
    const resumed = createDurableAutoExtractor(options());
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(job._getRaw("message_ids")).toBe("[]"));
    expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((m) => m.id)).toEqual(
      messages.slice(0, 20).map((m) => m.id)
    );
    expect(vi.mocked(extractAndRetain).mock.calls[1][0].at(-1)?.id).toBe("m24");
    resumed.processTurn(messages, "conversation");
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(extractAndRetain).toHaveBeenCalledTimes(2);
    resumed.dispose();
  });
  it("passes the selected store through durable batches and aborts late writes on disposal", async () => {
    await conversation();
    let finish!: (value: typeof empty) => void;
    vi.mocked(extractAndRetain).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const memoryStore = { retain: vi.fn() } as unknown as import("./store/types").MemoryStore;
    const worker = createDurableAutoExtractor({ ...options(), memoryStore });
    worker.processTurn(messages.slice(0, 2), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalled());
    const [, batchCtx, batchOptions] = vi.mocked(extractAndRetain).mock.calls[0];
    expect(batchOptions.memoryStore).toBe(memoryStore);
    expect(batchOptions.signal?.aborted).toBe(false);
    worker.dispose();
    expect(batchOptions.signal?.aborted).toBe(true);
    expect(await batchCtx.vaultCtx.canWrite?.()).toBe(false);
    finish(empty);
    await vi.waitFor(() => expect(worker.isProcessing()).toBe(false));
    const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
    expect(job._getRaw("message_ids")).not.toBe("[]");
  });
  it("keeps a completed batch queued when its completion callback disposes the worker", async () => {
    await conversation();
    const onTurnComplete = vi.fn(() => worker.dispose());
    const worker = createDurableAutoExtractor({ ...options(), onTurnComplete });
    worker.processTurn(messages.slice(0, 2), "conversation");
    await vi.waitFor(() => expect(onTurnComplete).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(worker.isProcessing()).toBe(false));
    const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
    expect(job._getRaw("message_ids")).toBe('["m0","m1"]');
    expect(job._getRaw("watermark")).toBeNull();
    expect(job._getRaw("watermark_seq")).toBeNull();
  });
  it("keeps a completed batch queued when disposal precedes its acknowledgement writer", async () => {
    await conversation();
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const write = vi.spyOn(db, "write");
    let blocker: Promise<void> | undefined;
    const onTurnComplete = vi.fn(() => {
      write.mockClear();
      blocker = db.write(async () => blocked);
    });
    const worker = createDurableAutoExtractor({ ...options(), onTurnComplete });
    worker.processTurn(messages.slice(0, 2), "conversation");
    await vi.waitFor(() => expect(onTurnComplete).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(2));
    worker.dispose();
    release();
    await blocker;
    await vi.waitFor(() => expect(worker.isProcessing()).toBe(false));
    const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
    expect(job._getRaw("message_ids")).toBe('["m0","m1"]');
    expect(job._getRaw("watermark")).toBeNull();
    expect(job._getRaw("watermark_seq")).toBeNull();
    write.mockRestore();
  });
  it("does not resume queued work with an already-aborted caller signal", async () => {
    await conversation();
    const first = createDurableAutoExtractor({ ...options(), debounceMs: 60_000 });
    first.processTurn(messages.slice(0, 2), "conversation");
    first.dispose();
    await vi.waitFor(async () =>
      expect(await db.get<ExtractionJob>(ExtractionJob.table).query().fetchCount()).toBe(1)
    );
    const controller = new AbortController();
    controller.abort();
    const worker = createDurableAutoExtractor({ ...options(), signal: controller.signal });
    expect(worker.processTurn(messages.slice(0, 2), "conversation")).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(extractAndRetain).not.toHaveBeenCalled();
    const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
    expect(job._getRaw("message_ids")).toBe('["m0","m1"]');
    worker.dispose();
  });
  it("aborts an active batch and retains its job when the caller signal aborts", async () => {
    await conversation();
    let finish!: (value: typeof empty) => void;
    vi.mocked(extractAndRetain).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const controller = new AbortController();
    const onTurnComplete = vi.fn();
    const worker = createDurableAutoExtractor({
      ...options(),
      signal: controller.signal,
      onTurnComplete,
    });
    worker.processTurn(messages.slice(0, 2), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
    const [, batchCtx, batchOptions] = vi.mocked(extractAndRetain).mock.calls[0];
    controller.abort(new Error("caller cancelled"));
    expect(batchOptions.signal?.aborted).toBe(true);
    expect(batchOptions.signal?.reason).toBe(controller.signal.reason);
    expect(await batchCtx.vaultCtx.canWrite?.()).toBe(false);
    expect(worker.processTurn(messages.slice(0, 3), "conversation")).toBe(false);
    finish(empty);
    await vi.waitFor(() => expect(worker.isProcessing()).toBe(false));
    expect(onTurnComplete).not.toHaveBeenCalled();
    const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
    expect(job._getRaw("message_ids")).toBe('["m0","m1"]');
    expect(job._getRaw("watermark")).toBeNull();
    worker.dispose();
  });
  it("retains a failed batch and retries without a subsequent message", async () => {
    await conversation();
    vi.mocked(extractAndRetain).mockResolvedValueOnce({
      ...empty,
      outcome: "extracted",
      failedCount: 1,
    });
    const worker = createDurableAutoExtractor(options());
    worker.processTurn(messages.slice(0, 2), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(2));
    const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
    await vi.waitFor(() => expect(job._getRaw("message_ids")).toBe("[]"));
    worker.dispose();
  });
  it("does not learn a deleted conversation on resume", async () => {
    const worker = createDurableAutoExtractor(options());
    worker.processTurn(messages, "conversation");
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(extractAndRetain).not.toHaveBeenCalled();
    worker.dispose();
  });
  it("retries a missing source without acknowledging it", async () => {
    await conversation();
    vi.mocked(getMessageOp).mockResolvedValueOnce(null);
    const onError = vi.fn(() => {
      throw new Error("diagnostics failed");
    });
    const worker = createDurableAutoExtractor({ ...options(), retryDelayMs: 100, onError });
    worker.processTurn(messages.slice(0, 1), "conversation");
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
    expect(extractAndRetain).not.toHaveBeenCalled();
    const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
    expect(job._getRaw("message_ids")).toBe('["m0"]');
    await vi.waitFor(() => expect(job._getRaw("message_ids")).toBe("[]"));
    expect(extractAndRetain).toHaveBeenCalledOnce();
    worker.dispose();
  });

  describe("a source locked only because the key is not loaded yet", () => {
    const ADDRESS = `0x${"b".repeat(40)}`;
    let keyReady = false;
    const keyedOptions = () => ({
      ...options(),
      retainCtx: { ...options().retainCtx, vaultCtx: { ...ctx, walletAddress: ADDRESS } },
    });
    async function lockUntilKey() {
      await conversation();
      keyReady = false;
      const stored = await getMessageOp(storage(), "m0");
      vi.mocked(getMessageOp).mockImplementation(async (storageCtx, id) =>
        id === "m0" && !keyReady
          ? { ...stored!, content: CIPHERTEXT, decryptionStatus: "key_missing" }
          : realGetMessageOp(storageCtx, id)
      );
    }

    it("waits without retrying, says why, and extracts as soon as the key arrives", async () => {
      await lockUntilKey();
      const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
      const worker = createDurableAutoExtractor({ ...keyedOptions(), onError });
      try {
        worker.processTurn(messages.slice(0, 1), "conversation");
        await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
        expect(String(onError.mock.calls[0][0].message)).toBe(
          "Source messages are locked; retained for retry (key_missing:v2=1)"
        );
        await new Promise((resolve) => setTimeout(resolve, 60));
        expect(onError).toHaveBeenCalledOnce();
        expect(extractAndRetain).not.toHaveBeenCalled();

        keyReady = true;
        seedEncryptionKeys(ADDRESS, { current: "c".repeat(64) });
        await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
        const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
        await vi.waitFor(() => expect(job._getRaw("message_ids")).toBe("[]"));
      } finally {
        worker.dispose();
        clearEncryptionKey(ADDRESS);
      }
    });

    it("does not park on a stale read when the key lands while the batch is still reading", async () => {
      await conversation();
      keyReady = false;
      const stored = await getMessageOp(storage(), "m0");
      let releaseM1!: () => void;
      const m1Held = new Promise<void>((resolve) => (releaseM1 = resolve));
      let m1Reads = 0;
      vi.mocked(getMessageOp).mockImplementation(async (storageCtx, id) => {
        if (id === "m0" && !keyReady)
          return { ...stored!, content: CIPHERTEXT, decryptionStatus: "key_missing" };
        if (id === "m1" && ++m1Reads === 1) await m1Held;
        return realGetMessageOp(storageCtx, id);
      });
      const worker = createDurableAutoExtractor({ ...keyedOptions(), onError: vi.fn() });
      try {
        worker.processTurn(messages.slice(0, 2), "conversation");
        await vi.waitFor(() => expect(m1Reads).toBe(1));
        keyReady = true;
        seedEncryptionKeys(ADDRESS, { current: "c".repeat(64) });
        releaseM1();
        await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
        expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((m) => m.id)).toEqual(["m0", "m1"]);
      } finally {
        worker.dispose();
        clearEncryptionKey(ADDRESS);
      }
    });

    it("drains a waiting job at once when the key lands behind another turn's debounce", async () => {
      await lockUntilKey();
      await db.write(async () => {
        await db.get<Conversation>("conversations").create((r) => {
          r._setRaw("conversation_id", "other");
          r._setRaw("is_deleted", false);
        });
        await db.get<Message>("history").create((row) => {
          row._raw.id = "n0";
          row._setRaw("conversation_id", "other");
          row._setRaw("message_id", 1);
          row._setRaw("role", "user");
          row._setRaw("content", "another chat");
        });
      });
      const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
      const worker = createDurableAutoExtractor({ ...keyedOptions(), debounceMs: 60_000, onError });
      try {
        worker.processTurn(messages.slice(0, 1), "conversation");
        await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
        worker.processTurn([{ id: "n0", role: "user", content: "another chat" }], "other");
        await vi.waitFor(async () =>
          expect(
            await db
              .get<ExtractionJob>(ExtractionJob.table)
              .query(Q.where("conversation_id", "other"))
              .fetchCount()
          ).toBe(1)
        );
        keyReady = true;
        seedEncryptionKeys(ADDRESS, { current: "c".repeat(64) });
        await vi.waitFor(() =>
          expect(vi.mocked(extractAndRetain).mock.calls.map(([batch]) => batch[0].id)).toContain(
            "m0"
          )
        );
      } finally {
        worker.dispose();
        clearEncryptionKey(ADDRESS);
      }
    });

    it("retries a waiting job when a new turn arrives in its conversation", async () => {
      await lockUntilKey();
      const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
      const worker = createDurableAutoExtractor({ ...keyedOptions(), onError });
      try {
        worker.processTurn(messages.slice(0, 1), "conversation");
        await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
        keyReady = true;
        worker.processTurn(messages.slice(0, 2), "conversation");
        await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
        expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((m) => m.id)).toEqual(["m0", "m1"]);
      } finally {
        worker.dispose();
      }
    });
  });

  it.each(["clear", "delete", "conversation", "dispose"] as const)(
    "prevents writes when sources %s while extraction is in flight",
    async (change) => {
      await conversation();
      let release!: () => void;
      const blocked = new Promise<void>((resolve) => {
        release = resolve;
      });
      const writeFinished = vi.fn();
      vi.mocked(extractAndRetain).mockImplementationOnce(async (_messages, retainCtx) => {
        await blocked;
        try {
          await createVaultMemoryOp(retainCtx.vaultCtx, { content: "Should not be learned" });
          return empty;
        } catch {
          return { ...empty, failedCount: 1 };
        } finally {
          writeFinished();
        }
      });
      const worker = createDurableAutoExtractor(options());
      worker.processTurn(messages.slice(0, 2), "conversation");
      await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
      if (change === "clear") await clearMessagesOp(storage(), "conversation");
      else if (change === "delete") await deleteMessageOp(storage(), "m0");
      else if (change === "conversation") await deleteConversationOp(storage(), "conversation");
      else worker.dispose();
      release();
      await vi.waitFor(() => expect(writeFinished).toHaveBeenCalledOnce());
      expect(await getAllVaultMemoriesOp(ctx)).toEqual([]);
      if (change === "conversation") {
        await vi.waitFor(async () =>
          expect(await db.get<ExtractionJob>(ExtractionJob.table).query().fetchCount()).toBe(0)
        );
        worker.dispose();
        return;
      }
      const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
      if (change === "clear") expect(job._getRaw("message_ids")).toBe("[]");
      else if (change === "delete") {
        await vi.waitFor(() => expect(job._getRaw("message_ids")).toBe("[]"));
        expect(vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id)).toEqual(["m1"]);
      } else expect(job._getRaw("message_ids")).toBe('["m0","m1"]');
      worker.dispose();
    }
  );

  it.each(["first", "last"] as const)(
    "drops a queued source from another conversation (%s) and keeps extracting later turns",
    async (position) => {
      await conversation();
      await foreignMessage();
      await db.write(() =>
        db.get<ExtractionJob>(ExtractionJob.table).create((r) => {
          r._setRaw("owner_key", "owner");
          r._setRaw("conversation_id", "conversation");
          r._setRaw("scope", "private");
          r._setRaw("folder_id", null);
          r._setRaw(
            "message_ids",
            JSON.stringify(position === "first" ? ["foreign", "m0", "m1"] : ["m0", "m1", "foreign"])
          );
        })
      );
      const writeErrors: unknown[] = [];
      vi.mocked(extractAndRetain).mockImplementation(async (batch, retainCtx) => {
        try {
          await createVaultMemoryOp(retainCtx.vaultCtx, { content: batch.at(-1)!.content });
          return empty;
        } catch (error) {
          writeErrors.push(error);
          return { ...empty, failedCount: 1 };
        }
      });
      const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
      const worker = createDurableAutoExtractor({ ...options(), onError });
      await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
      expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((m) => m.id)).toEqual(["m0", "m1"]);
      const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
      await vi.waitFor(() => expect(job._getRaw("watermark_seq")).toBe(2));
      expect(onError.mock.calls.map(([error]) => String(error.message))).toContain(
        "Dropped 1 source id(s) from another conversation"
      );

      worker.processTurn(messages.slice(0, 3), "conversation");
      await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(2));
      expect(vi.mocked(extractAndRetain).mock.calls[1][0].at(-1)?.id).toBe("m2");
      worker.dispose();
      expect(writeErrors).toEqual([]);
      expect((await getAllVaultMemoriesOp(ctx)).map((m) => m.content).sort()).toEqual([
        "secret-1",
        "secret-2",
      ]);
    }
  );

  async function foreignMessage() {
    await db.write(() =>
      db.get<Message>("history").create((row) => {
        row._raw.id = "foreign";
        row._setRaw("conversation_id", "other-conversation");
        row._setRaw("message_id", 100);
        row._setRaw("role", "user");
        row._setRaw("content", "from another chat");
      })
    );
  }

  it("never queues a source from another conversation, so it cannot hide later turns", async () => {
    await conversation();
    await foreignMessage();
    const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
    const worker = createDurableAutoExtractor({ ...options(), onError });
    const foreign = { id: "foreign", role: "user" as const, content: "from another chat" };
    worker.processTurn([...messages.slice(0, 2), foreign], "conversation");
    worker.processTurn(messages.slice(0, 3), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalled());
    worker.dispose();
    expect(
      vi.mocked(extractAndRetain).mock.calls.flatMap(([batch]) => batch.map((m) => m.id))
    ).toEqual(["m0", "m1", "m2"]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("heals a job abandoned on a source from another conversation", async () => {
    await conversation();
    await foreignMessage();
    await db.write(() =>
      db.get<ExtractionJob>(ExtractionJob.table).create((r) => {
        r._setRaw("owner_key", "owner");
        r._setRaw("conversation_id", "conversation");
        r._setRaw("scope", "private");
        r._setRaw("folder_id", null);
        r._setRaw("message_ids", "[]");
        r._setRaw("watermark", "foreign");
        r._setRaw("watermark_seq", 100);
      })
    );
    const worker = createDurableAutoExtractor(options());
    worker.processTurn(messages.slice(0, 3), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
    expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((m) => m.id)).toEqual([
      "m0",
      "m1",
      "m2",
    ]);
    const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
    await vi.waitFor(() => expect(job._getRaw("watermark")).toBe("m2"));
    expect(job._getRaw("watermark_seq")).toBe(3);
    worker.dispose();
  });

  it("lets a batch write when its job also holds a source from another conversation", async () => {
    await conversation();
    await db.write(() =>
      db.get<Message>("history").create((row) => {
        row._raw.id = "foreign";
        row._setRaw("conversation_id", "other-conversation");
        row._setRaw("message_id", 100);
        row._setRaw("role", "user");
        row._setRaw("content", "from another chat");
      })
    );
    const writeErrors: unknown[] = [];
    vi.mocked(extractAndRetain).mockImplementation(async (_messages, retainCtx) => {
      try {
        await createVaultMemoryOp(retainCtx.vaultCtx, { content: "The user lives in Lisbon" });
        return empty;
      } catch (error) {
        writeErrors.push(error);
        return { ...empty, failedCount: 1 };
      }
    });
    const worker = createDurableAutoExtractor(options());
    worker.processTurn(
      [{ id: "foreign", role: "user", content: "from another chat" }, ...messages.slice(0, 2)],
      "conversation"
    );
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalled());
    worker.dispose();
    expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((m) => m.id)).toEqual(["m0", "m1"]);
    expect(writeErrors).toEqual([]);
    expect((await getAllVaultMemoriesOp(ctx)).map((m) => m.content)).toEqual([
      "The user lives in Lisbon",
    ]);
  });

  it("preserves the queued folder after resume in another folder", async () => {
    await conversation();
    const original = createDurableAutoExtractor({
      ...options(),
      folderId: "first",
      debounceMs: 60000,
    });
    original.processTurn(messages.slice(0, 1), "conversation");
    original.dispose();
    await vi.waitFor(async () =>
      expect(await db.get<ExtractionJob>(ExtractionJob.table).query().fetchCount()).toBe(1)
    );
    const resumed = createDurableAutoExtractor({ ...options(), folderId: "second" });
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
    expect(vi.mocked(extractAndRetain).mock.calls[0][2].folderId).toBe("first");
    resumed.dispose();
  });
  it("does not requeue cleared overlap when new messages arrive during extraction", async () => {
    await conversation();
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.mocked(extractAndRetain).mockImplementationOnce(async () => {
      await blocked;
      return empty;
    });
    const worker = createDurableAutoExtractor(options());
    worker.processTurn(messages.slice(0, 2), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
    await clearMessagesOp(storage(), "conversation");
    await db.write(() =>
      db.get<Message>("history").create((row) => {
        row._raw.id = "new";
        row._setRaw("conversation_id", "conversation");
        row._setRaw("role", "user");
        row._setRaw("content", "New conversation content");
      })
    );
    worker.processTurn(
      [{ id: "new", role: "user", content: "New conversation content" }],
      "conversation"
    );
    const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
    await vi.waitFor(() => expect(job._getRaw("message_ids")).toBe('["new"]'));
    release();
    await vi.waitFor(() => expect(job._getRaw("message_ids")).toBe("[]"));
    expect(vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id)).toEqual(["new"]);
    worker.dispose();
  });

  it("keeps databases without the optional extraction table compatible with clearing messages", async () => {
    const standalone = new Database({
      adapter: new LokiJSAdapter({
        schema: appSchema({
          version: sdkSchema.version,
          tables: Object.values(sdkSchema.tables).filter(
            (table) => table.name !== ExtractionJob.table
          ),
        }),
        useWebWorker: false,
        useIncrementalIndexedDB: false,
        dbName: `chat-${Math.random()}`,
      }),
      modelClasses: sdkModelClasses.filter((model) => model !== ExtractionJob),
    });
    const chat: StorageOperationsContext = {
      database: standalone,
      messagesCollection: standalone.get("history"),
      conversationsCollection: standalone.get("conversations"),
    };
    await standalone.write(() =>
      chat.messagesCollection.create((row) => {
        row._setRaw("conversation_id", "conversation");
      })
    );
    await clearMessagesOp(chat, "conversation");
    expect(await chat.messagesCollection.query().fetchCount()).toBe(0);
  });
  it("starts unseen history with the legacy six-message window", async () => {
    await conversation();
    const worker = createDurableAutoExtractor({ ...options(), windowSize: undefined });
    worker.processTurn(messages, "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
    expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((m) => m.id)).toEqual(
      messages.slice(-6).map((m) => m.id)
    );
    worker.dispose();
  });

  it("continues after the legacy cursor without applying the initial window cap", async () => {
    await conversation();
    const worker = createDurableAutoExtractor({
      ...options(),
      windowSize: 6,
      cursorStore: { get: () => "m4", set: vi.fn() },
    });
    worker.processTurn(messages, "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
    expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((m) => m.id)).toEqual(
      messages.slice(5).map((m) => m.id)
    );
    worker.dispose();
  });

  it("keeps every new arrival after an initial pending window without backfilling older history", async () => {
    await conversation();
    const first = createDurableAutoExtractor({ ...options(), windowSize: 6 });
    first.processTurn(messages.slice(0, 10), "conversation");
    first.processTurn(messages, "conversation");
    first.dispose();
    const resumed = createDurableAutoExtractor(options());
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(2));
    const all = vi.mocked(extractAndRetain).mock.calls.flatMap((call) => call[0].map((m) => m.id));
    expect([...new Set(all)]).toEqual(messages.slice(4).map((m) => m.id));
    resumed.dispose();
  });

  it("never republishes shared sources after switching back to private", async () => {
    await conversation();
    const shared = createDurableAutoExtractor({ ...options(), scope: "shared" });
    shared.processTurn(messages.slice(0, 10), "conversation");
    await vi.waitFor(async () =>
      expect(await db.get<ExtractionJob>(ExtractionJob.table).query().fetchCount()).toBe(1)
    );
    const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
    await vi.waitFor(() => expect(job._getRaw("message_ids")).toBe("[]"));
    shared.dispose();
    const private_ = createDurableAutoExtractor(options());
    private_.processTurn(messages.slice(0, 12), "conversation");
    await vi.waitFor(() =>
      expect(
        vi.mocked(extractAndRetain).mock.calls.some((call) => call[2].scope === "private")
      ).toBe(true)
    );
    const relearned = vi
      .mocked(extractAndRetain)
      .mock.calls.filter((call) => call[2].scope === "private")
      .flatMap((call) => call[0].map((m) => m.id));
    expect(relearned).toEqual(["m10", "m11"]);
    private_.dispose();
  });

  it("reads the scope accessor at write time so a mode flip needs no new extractor", async () => {
    await conversation();
    let scope = "private";
    const worker = createDurableAutoExtractor({ ...options(), scope: () => scope });
    worker.processTurn(messages.slice(0, 1), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
    expect(vi.mocked(extractAndRetain).mock.calls[0][2].scope).toBe("private");
    scope = "shared";
    worker.processTurn(messages.slice(0, 2), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(2));
    expect(vi.mocked(extractAndRetain).mock.calls[1][2].scope).toBe("shared");
    expect(vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id)).toEqual(["m1"]);
    worker.dispose();
  });

  it("runs a private job queued before a mode flip on the private model", async () => {
    await conversation();
    let scope = "private";
    const modelForScope = (s: string) => (s === "private" ? "open-model" : "closed-model");
    const queued = createDurableAutoExtractor({
      ...options(),
      debounceMs: 60_000,
      scope: () => scope,
      extract: { apiKey: "k", model: "open-model" },
      modelForScope,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    queued.processTurn(messages.slice(0, 1), "conversation");
    await vi.waitFor(async () =>
      expect(await db.get<ExtractionJob>(ExtractionJob.table).query().fetchCount()).toBe(1)
    );
    queued.dispose();
    expect(extractAndRetain).not.toHaveBeenCalled();
    scope = "shared";
    const drainer = createDurableAutoExtractor({
      ...options(),
      scope: () => scope,
      extract: { apiKey: "k", model: "closed-model" },
      modelForScope,
    });
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
    expect(vi.mocked(extractAndRetain).mock.calls[0][2].scope).toBe("private");
    expect(vi.mocked(extractAndRetain).mock.calls[0][2].extract.model).toBe("open-model");
    drainer.processTurn(messages.slice(0, 2), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(2));
    expect(vi.mocked(extractAndRetain).mock.calls[1][2].scope).toBe("shared");
    expect(vi.mocked(extractAndRetain).mock.calls[1][2].extract.model).toBe("closed-model");
    drainer.dispose();
  });

  it("keeps the job queued when the model resolver throws", async () => {
    await conversation();
    const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
    const worker = createDurableAutoExtractor({
      ...options(),
      onError,
      modelForScope: () => {
        throw new Error("model policy unavailable");
      },
    });
    worker.processTurn(messages.slice(0, 1), "conversation");
    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    expect(extractAndRetain).not.toHaveBeenCalled();
    const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
    expect(job._getRaw("message_ids")).toBe(JSON.stringify(["m0"]));
    worker.dispose();
  });

  it("treats a throwing scope accessor as private", async () => {
    await conversation();
    const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
    const worker = createDurableAutoExtractor({
      ...options(),
      onError,
      scope: () => {
        throw new Error("privacy mode unavailable");
      },
    });
    worker.processTurn(messages.slice(0, 1), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
    expect(vi.mocked(extractAndRetain).mock.calls[0][2].scope).toBe("private");
    expect(onError).toHaveBeenCalled();
    worker.dispose();
  });

  it("drains a turn that arrives while a pass is ending with nothing to do", async () => {
    await db.write(() =>
      db.get<ExtractionJob>(ExtractionJob.table).create((r) => {
        r._setRaw("owner_key", "owner");
        r._setRaw("conversation_id", "orphaned-conversation");
        r._setRaw("scope", "private");
        r._setRaw("message_ids", '["ghost"]');
      })
    );
    const conversations = db.get<Conversation>("conversations");
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const realQuery = conversations.query.bind(conversations);
    let held = false;
    vi.spyOn(conversations, "query").mockImplementation((...args) => {
      const query = realQuery(...args);
      if (!held) {
        held = true;
        const realCount = query.fetchCount.bind(query);
        query.fetchCount = async () => {
          await blocked;
          return realCount();
        };
      }
      return query;
    });
    const worker = createDurableAutoExtractor(options());
    await vi.waitFor(() => expect(held).toBe(true));
    await conversation();
    worker.processTurn(messages.slice(0, 2), "conversation");
    await vi.waitFor(async () =>
      expect(await db.get<ExtractionJob>(ExtractionJob.table).query().fetchCount()).toBe(2)
    );
    expect(worker.isProcessing()).toBe(true);
    release();
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
    expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((m) => m.id)).toEqual(["m0", "m1"]);
    worker.dispose();
  });

  it("drops an unresolvable source id instead of wedging the job behind it", async () => {
    await conversation();
    vi.mocked(getMessageOp).mockImplementation(async (storageCtx, id) =>
      id === "m0" ? null : realGetMessageOp(storageCtx, id)
    );
    const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
    const worker = createDurableAutoExtractor({ ...options(), onError });
    worker.processTurn(messages.slice(0, 3), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce(), { timeout: 2000 });
    expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((m) => m.id)).toEqual(["m1", "m2"]);
    const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
    await vi.waitFor(() => expect(job._getRaw("message_ids")).toBe("[]"));
    expect(onError.mock.calls.map(([error]) => String(error.message))).toContain(
      "Dropped 1 unresolvable source id(s) to unblock extraction"
    );
    worker.dispose();
  });

  it("reschedules the remainder when a pass hits its job cap", async () => {
    for (const id of ["c1", "c2", "c3", "c4"]) {
      await db.write(async () => {
        await db.get<Conversation>("conversations").create((r) => {
          r._setRaw("conversation_id", id);
          r._setRaw("is_deleted", false);
        });
        await db.get<Message>("history").create((row) => {
          row._raw.id = `${id}-m0`;
          row._setRaw("conversation_id", id);
          row._setRaw("message_id", 1);
          row._setRaw("role", "user");
          row._setRaw("content", `content for ${id}`);
        });
      });
    }
    const first = createDurableAutoExtractor({ ...options(), debounceMs: 60_000 });
    for (const id of ["c1", "c2", "c3", "c4"])
      first.processTurn([{ id: `${id}-m0`, role: "user", content: `content for ${id}` }], id);
    await vi.waitFor(async () =>
      expect(await db.get<ExtractionJob>(ExtractionJob.table).query().fetchCount()).toBe(4)
    );
    first.dispose();
    const resumed = createDurableAutoExtractor(options());
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(4), { timeout: 2000 });
    const drained = vi
      .mocked(extractAndRetain)
      .mock.calls.flatMap((call) => call[0].map((m) => m.id));
    expect(new Set(drained)).toEqual(new Set(["c1-m0", "c2-m0", "c3-m0", "c4-m0"]));
    resumed.dispose();
  });

  it("prunes the outbox when the conversation is deleted after draining", async () => {
    await conversation();
    const worker = createDurableAutoExtractor(options());
    worker.processTurn(messages.slice(0, 2), "conversation");
    await vi.waitFor(async () =>
      expect(await db.get<ExtractionJob>(ExtractionJob.table).query().fetchCount()).toBe(1)
    );
    const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
    await vi.waitFor(() => expect(job._getRaw("message_ids")).toBe("[]"));
    worker.dispose();
    await deleteConversationOp(storage(), "conversation");
    expect(await db.get<ExtractionJob>(ExtractionJob.table).query().fetchCount()).toBe(0);
  });

  it("retains the batch when extraction never settles", async () => {
    await conversation();
    vi.mocked(extractAndRetain).mockImplementationOnce(() => new Promise(() => {}));
    const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
    const worker = createDurableAutoExtractor({
      ...options(),
      batchTimeoutMs: 20,
      retryDelayMs: 5,
      onError,
    });
    worker.processTurn(messages.slice(0, 1), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(2), { timeout: 2000 });
    expect(onError.mock.calls.map(([error]) => String(error.message))).toContain(
      "Extraction did not settle in time; retained for retry"
    );
    const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
    await vi.waitFor(() => expect(job._getRaw("message_ids")).toBe("[]"));
    worker.dispose();
  });

  const failedExtraction = (failure: { reason: string; httpStatus?: number }) => ({
    ...empty,
    outcome: "empty-after-retry" as const,
    failure: { attempts: 1, ...failure } as never,
  });
  const jobRow = async () => (await db.get<ExtractionJob>(ExtractionJob.table).query().fetch())[0];
  const settle = () => new Promise((resolve) => setTimeout(resolve, 40));

  it("abandons a batch that failed in three sessions so later messages still extract", async () => {
    await conversation();
    vi.mocked(extractAndRetain).mockImplementation((batch) =>
      Promise.resolve(
        batch.some((m) => m.id === "m0") ? failedExtraction({ reason: "invalid-json" }) : empty
      )
    );
    const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
    const calls = () => vi.mocked(extractAndRetain).mock.calls.length;

    const first = createDurableAutoExtractor({ ...options(), onError });
    first.processTurn(messages.slice(0, 2), "conversation");
    await vi.waitFor(() => expect(calls()).toBe(3), { timeout: 2000 });
    await settle();
    expect((await jobRow())._getRaw("failed_sessions")).toBe(1);
    first.processTurn(messages.slice(0, 3), "conversation");
    await settle();
    await settle();
    expect(calls()).toBe(3);
    expect((await jobRow())._getRaw("failed_sessions")).toBe(1);
    first.dispose();

    nextSession();
    const second = createDurableAutoExtractor({ ...options(), onError });
    await vi.waitFor(() => expect(calls()).toBe(6), { timeout: 2000 });
    await settle();
    expect((await jobRow())._getRaw("failed_sessions")).toBe(2);
    second.dispose();

    nextSession();
    const third = createDurableAutoExtractor({ ...options(), onError });
    await vi.waitFor(() => expect(calls()).toBe(9), { timeout: 2000 });
    await vi.waitFor(async () => expect((await jobRow())._getRaw("message_ids")).toBe("[]"));
    expect(onError.mock.calls.map(([error]) => String(error.message))).toContain(
      "Abandoned an extraction batch of 3 source id(s) after it failed in 3 sessions"
    );
    third.processTurn(messages.slice(0, 5), "conversation");
    await vi.waitFor(() => expect(calls()).toBe(10), { timeout: 2000 });
    expect(vi.mocked(extractAndRetain).mock.calls[9][0].map((m) => m.id)).toEqual(["m3", "m4"]);
    await vi.waitFor(async () => expect((await jobRow())._getRaw("message_ids")).toBe("[]"));
    third.dispose();
  });

  it("abandons a moderation-refused single turn at once without retrying it", async () => {
    await conversation();
    vi.mocked(extractAndRetain).mockImplementation((batch) =>
      Promise.resolve(
        batch.some((m) => m.id === "m0") ? failedExtraction({ reason: "content-flagged" }) : empty
      )
    );
    const worker = createDurableAutoExtractor(options());
    worker.processTurn(messages.slice(0, 1), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce(), { timeout: 2000 });
    await vi.waitFor(async () => expect((await jobRow())._getRaw("message_ids")).toBe("[]"));
    worker.processTurn(messages.slice(0, 3), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(2), { timeout: 2000 });
    expect(vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id)).toEqual(["m1", "m2"]);
    worker.dispose();
  });

  it("extracts the other turns of a moderation-refused batch and drops only the refused one", async () => {
    await conversation();
    vi.mocked(extractAndRetain).mockImplementation((batch) =>
      Promise.resolve(
        batch.some((m) => m.id === "m1") ? failedExtraction({ reason: "content-flagged" }) : empty
      )
    );
    const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
    const worker = createDurableAutoExtractor({ ...options(), onError });
    worker.processTurn(messages.slice(0, 3), "conversation");
    await vi.waitFor(async () => expect((await jobRow())._getRaw("message_ids")).toBe("[]"), {
      timeout: 2000,
    });
    expect(vi.mocked(extractAndRetain).mock.calls.map(([batch]) => batch.map((m) => m.id))).toEqual(
      [["m0", "m1", "m2"], ["m0"], ["m1"], ["m2"]]
    );
    expect(onError.mock.calls.map(([error]) => String(error.message))).toContain(
      "Dropped 1 source id(s) of an extraction batch refused by moderation"
    );
    await settle();
    expect(extractAndRetain).toHaveBeenCalledTimes(4);
    worker.processTurn(messages.slice(0, 5), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(5), { timeout: 2000 });
    expect(vi.mocked(extractAndRetain).mock.calls[4][0].map((m) => m.id)).toEqual(["m3", "m4"]);
    worker.dispose();
  });

  it("does not retry a non-retryable HTTP failure in the same session", async () => {
    await conversation();
    vi.mocked(extractAndRetain).mockResolvedValue(
      failedExtraction({ reason: "http-terminal", httpStatus: 400 })
    );
    const worker = createDurableAutoExtractor(options());
    worker.processTurn(messages.slice(0, 2), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce(), { timeout: 2000 });
    worker.processTurn(messages.slice(0, 3), "conversation");
    await settle();
    await settle();
    expect(extractAndRetain).toHaveBeenCalledOnce();
    expect((await jobRow())._getRaw("failed_sessions")).toBe(1);
    worker.dispose();
  });

  it("drops sources that stay undecryptable for three sessions", async () => {
    await conversation();
    vi.mocked(getMessageOp).mockImplementation(async (storageCtx, id) => {
      const message = await realGetMessageOp(storageCtx, id);
      return message && id === "m0"
        ? { ...message, content: CIPHERTEXT, decryptionStatus: "auth_mismatch" }
        : message;
    });
    const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
    const lockedReads = () =>
      vi.mocked(getMessageOp).mock.calls.filter(([, id]) => id === "m0").length;
    const first = createDurableAutoExtractor({ ...options(), onError });
    first.processTurn(messages.slice(0, 2), "conversation");
    await vi.waitFor(() => expect(lockedReads()).toBe(3), { timeout: 2000 });
    await settle();
    first.dispose();
    nextSession();
    const second = createDurableAutoExtractor({ ...options(), onError });
    await vi.waitFor(() => expect(lockedReads()).toBe(6), { timeout: 2000 });
    await settle();
    second.dispose();
    nextSession();
    const third = createDurableAutoExtractor({ ...options(), onError });
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce(), { timeout: 2000 });
    expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((m) => m.id)).toEqual(["m1"]);
    expect(onError.mock.calls.map(([error]) => String(error.message))).toContain(
      "Dropped 1 source id(s) that stayed locked for 3 sessions to unblock extraction"
    );
    third.dispose();
  });

  it("does not re-queue a dropped locked source on the next turn", async () => {
    await conversation();
    vi.mocked(getMessageOp).mockImplementation(async (storageCtx, id) => {
      const message = await realGetMessageOp(storageCtx, id);
      return message && id === "m0"
        ? { ...message, content: CIPHERTEXT, decryptionStatus: "auth_mismatch" }
        : message;
    });
    const lockedReads = () =>
      vi.mocked(getMessageOp).mock.calls.filter(([, id]) => id === "m0").length;
    for (let session = 1; session <= 3; session++) {
      nextSession();
      const worker = createDurableAutoExtractor(options());
      if (session === 1) worker.processTurn(messages.slice(0, 1), "conversation");
      await vi.waitFor(() => expect(lockedReads()).toBe(3 * session), { timeout: 2000 });
      await settle();
      if (session < 3) {
        worker.dispose();
        continue;
      }
      await vi.waitFor(async () => expect((await jobRow())._getRaw("message_ids")).toBe("[]"));
      worker.processTurn(messages.slice(0, 2), "conversation");
      await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce(), { timeout: 2000 });
      expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((m) => m.id)).toEqual(["m1"]);
      worker.dispose();
    }
  });

  it("counts a persistent lock even when the batch also holds no-key ciphertext", async () => {
    await conversation();
    vi.mocked(getMessageOp).mockImplementation(async (storageCtx, id) => {
      const message = await realGetMessageOp(storageCtx, id);
      if (!message) return message;
      if (id === "m0")
        return { ...message, content: CIPHERTEXT, decryptionStatus: "auth_mismatch" };
      if (id === "m1") return { ...message, content: CIPHERTEXT, decryptionStatus: "key_missing" };
      return message;
    });
    const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
    const lockedReads = () =>
      vi.mocked(getMessageOp).mock.calls.filter(([, id]) => id === "m0").length;
    for (let session = 1; session <= 3; session++) {
      nextSession();
      const worker = createDurableAutoExtractor({ ...options(), onError });
      if (session === 1) worker.processTurn(messages.slice(0, 2), "conversation");
      await vi.waitFor(() => expect(lockedReads()).toBeGreaterThanOrEqual(3 * session), {
        timeout: 2000,
      });
      await settle();
      worker.dispose();
    }
    expect(JSON.parse(String((await jobRow())._getRaw("message_ids")))).toEqual(["m1"]);
    expect(onError.mock.calls.map(([error]) => String(error.message))).toContain(
      "Dropped 1 source id(s) that stayed locked for 3 sessions to unblock extraction"
    );
    expect(extractAndRetain).not.toHaveBeenCalled();
  });

  it("never drops sources that are only unreadable because this session has no key", async () => {
    await conversation();
    vi.mocked(getMessageOp).mockImplementation(async (storageCtx, id) => {
      const message = await realGetMessageOp(storageCtx, id);
      return message && id === "m0" ? { ...message, content: `enc:v3:${"a".repeat(64)}` } : message;
    });
    for (let session = 1; session <= 4; session++) {
      nextSession();
      const worker = createDurableAutoExtractor(options());
      if (session === 1) worker.processTurn(messages.slice(0, 2), "conversation");
      await vi.waitFor(
        () =>
          expect(vi.mocked(getMessageOp).mock.calls.filter(([, id]) => id === "m0").length).toBe(
            session
          ),
        { timeout: 2000 }
      );
      await settle();
      worker.dispose();
    }
    expect(extractAndRetain).not.toHaveBeenCalled();
    expect(JSON.parse(String((await jobRow())._getRaw("message_ids")))).toEqual(["m0", "m1"]);
  });

  it("never counts key_missing: the key may just not be loaded this session", async () => {
    await conversation();
    vi.mocked(getMessageOp).mockImplementation(async (storageCtx, id) => {
      const message = await realGetMessageOp(storageCtx, id);
      return message && { ...message, content: CIPHERTEXT, decryptionStatus: "key_missing" };
    });
    const reads = () => vi.mocked(getMessageOp).mock.calls.filter(([, id]) => id === "m0").length;
    for (let session = 1; session <= 4; session++) {
      nextSession();
      const worker = createDurableAutoExtractor(options());
      if (session === 1) worker.processTurn(messages.slice(0, 2), "conversation");
      await vi.waitFor(() => expect(reads()).toBe(session), { timeout: 2000 });
      await settle();
      worker.dispose();
    }
    const job = await jobRow();
    expect(JSON.parse(String(job._getRaw("message_ids")))).toEqual(["m0", "m1"]);
    expect(job._getRaw("watermark") ?? null).toBeNull();
    expect(job._getRaw("failed_sessions") ?? null).toBeNull();
    expect(extractAndRetain).not.toHaveBeenCalled();
  });

  it("does not treat a failed non-content field as a locked message", async () => {
    await conversation();
    vi.mocked(getMessageOp).mockImplementation(async (storageCtx, id) => {
      const message = await realGetMessageOp(storageCtx, id);
      return message && { ...message, decryptionStatus: "auth_mismatch" };
    });
    const worker = createDurableAutoExtractor(options());
    worker.processTurn(messages.slice(0, 2), "conversation");
    await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce(), { timeout: 2000 });
    worker.dispose();
  });

  it("an account-level rejection (402) pauses the session but never abandons", async () => {
    await conversation();
    vi.mocked(extractAndRetain).mockResolvedValue(
      failedExtraction({ reason: "http-terminal", httpStatus: 402 })
    );
    for (let session = 1; session <= 4; session++) {
      nextSession();
      const worker = createDurableAutoExtractor(options());
      if (session === 1) worker.processTurn(messages.slice(0, 2), "conversation");
      await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(session), {
        timeout: 2000,
      });
      await settle();
      expect(extractAndRetain).toHaveBeenCalledTimes(session);
      worker.dispose();
    }
    const job = await jobRow();
    expect(JSON.parse(String(job._getRaw("message_ids")))).toEqual(["m0", "m1"]);
    expect(job._getRaw("failed_sessions") ?? null).toBeNull();
  });

  it("never counts transport failures toward abandoning a batch", async () => {
    await conversation();
    vi.mocked(extractAndRetain).mockResolvedValue(failedExtraction({ reason: "network" }));
    for (let session = 1; session <= 3; session++) {
      nextSession();
      const worker = createDurableAutoExtractor(options());
      if (session === 1) worker.processTurn(messages.slice(0, 2), "conversation");
      await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(3 * session), {
        timeout: 2000,
      });
      await settle();
      worker.dispose();
    }
    const job = await jobRow();
    expect(JSON.parse(String(job._getRaw("message_ids")))).toEqual(["m0", "m1"]);
    expect(job._getRaw("failed_sessions") ?? null).toBeNull();
  });

  it("never counts a failed source read toward abandoning a batch", async () => {
    await conversation();
    vi.mocked(getMessageOp).mockRejectedValue(new BatchReadError());
    for (let session = 1; session <= 3; session++) {
      nextSession();
      const worker = createDurableAutoExtractor(options());
      if (session === 1) worker.processTurn(messages.slice(0, 2), "conversation");
      await vi.waitFor(
        () =>
          expect(vi.mocked(getMessageOp).mock.calls.filter(([, id]) => id === "m0").length).toBe(
            3 * session
          ),
        { timeout: 2000 }
      );
      await settle();
      worker.dispose();
    }
    const job = await jobRow();
    expect(JSON.parse(String(job._getRaw("message_ids")))).toEqual(["m0", "m1"]);
    expect(job._getRaw("watermark") ?? null).toBeNull();
  });

  it("counts a poison head once per session however many turns re-arm its retries", async () => {
    await conversation();
    vi.mocked(extractAndRetain).mockImplementation((batch) =>
      Promise.resolve(
        batch.some((m) => m.id === "m0") ? failedExtraction({ reason: "invalid-json" }) : empty
      )
    );
    const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
    const calls = () => vi.mocked(extractAndRetain).mock.calls.length;
    const poisonCalls = () =>
      vi.mocked(extractAndRetain).mock.calls.filter(([batch]) => batch.some((m) => m.id === "m0"))
        .length;
    const settleOrCall = async (n: number) => {
      try {
        await vi.waitFor(() => expect(calls()).toBeGreaterThanOrEqual(n), { timeout: 200 });
      } catch {
        /* No call came: the session has stopped spending on this head. */
      }
    };
    let turn = 2;
    for (let session = 1; session <= 3; session++) {
      nextSession();
      const start = calls();
      const poisonStart = poisonCalls();
      const worker = createDurableAutoExtractor({ ...options(), retryDelayMs: 30, onError });
      for (let i = 1; i <= 6; i++) {
        worker.processTurn(messages.slice(0, turn++), "conversation");
        await settleOrCall(start + i);
      }
      await settle();
      expect(poisonCalls() - poisonStart).toBe(3);
      worker.dispose();
    }
    expect(onError.mock.calls.map(([error]) => String(error.message))).toContainEqual(
      expect.stringMatching(
        /^Abandoned an extraction batch of \d+ source id\(s\) after it failed in 3 sessions$/
      )
    );
  });

  it("counts sessions closer together than the minimum gap once", async () => {
    await conversation();
    vi.mocked(extractAndRetain).mockResolvedValue(failedExtraction({ reason: "invalid-json" }));
    nextSession();
    for (let session = 1; session <= 3; session++) {
      clockNow += 60_000;
      const worker = createDurableAutoExtractor(options());
      if (session === 1) worker.processTurn(messages.slice(0, 2), "conversation");
      await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(3 * session), {
        timeout: 2000,
      });
      await settle();
      worker.dispose();
    }
    const job = await jobRow();
    expect(job._getRaw("failed_sessions")).toBe(1);
    expect(JSON.parse(String(job._getRaw("message_ids")))).toEqual(["m0", "m1"]);
  });

  it("refuses the late writes of a batch the watchdog gave up on", async () => {
    await conversation();
    let abandonedCtx: { vaultCtx: VaultMemoryOperationsContext } | undefined;
    let release!: () => void;
    vi.mocked(extractAndRetain).mockImplementationOnce(async (_batch, retainCtx) => {
      abandonedCtx = retainCtx;
      await new Promise<void>((resolve) => (release = resolve));
      return empty;
    });
    const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
    const worker = createDurableAutoExtractor({
      ...options(),
      batchTimeoutMs: 20,
      onError,
    });
    worker.processTurn(messages.slice(0, 1), "conversation");
    await vi.waitFor(
      () =>
        expect(onError.mock.calls.map(([error]) => String(error.message))).toContain(
          "Extraction did not settle in time; retained for retry"
        ),
      { timeout: 2000 }
    );
    expect(await abandonedCtx!.vaultCtx.canWrite!()).toBe(false);
    release();
    worker.dispose();
  });

  it("derives the default batch ceiling from the extraction call's own budget", async () => {
    await conversation();
    const timers = vi.spyOn(globalThis, "setTimeout");
    try {
      const worker = createDurableAutoExtractor({
        ...options(),
        extract: { apiKey: "k", timeoutMs: 1_000, maxAttempts: 2 },
      });
      worker.processTurn(messages.slice(0, 1), "conversation");
      await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce(), { timeout: 2000 });
      expect(timers.mock.calls.map(([, delay]) => delay)).toContain(124_100);
      worker.dispose();
    } finally {
      timers.mockRestore();
    }
  });

  it("keeps the boundary when the watermark message is deleted before a scope flip", async () => {
    await conversation();
    const first = createDurableAutoExtractor(options());
    first.processTurn(messages.slice(0, 10), "conversation");
    await vi.waitFor(async () =>
      expect(await db.get<ExtractionJob>(ExtractionJob.table).query().fetchCount()).toBe(1)
    );
    const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
    await vi.waitFor(() => expect(job._getRaw("message_ids")).toBe("[]"));
    first.dispose();
    await deleteMessageOp(storage(), "m9");
    const shared = createDurableAutoExtractor({ ...options(), scope: "shared" });
    shared.processTurn(
      messages.slice(0, 12).filter((m) => m.id !== "m9"),
      "conversation"
    );
    await vi.waitFor(() =>
      expect(
        vi.mocked(extractAndRetain).mock.calls.some((call) => call[2].scope === "shared")
      ).toBe(true)
    );
    const published = vi
      .mocked(extractAndRetain)
      .mock.calls.filter((call) => call[2].scope === "shared")
      .flatMap((call) => call[0].map((m) => m.id));
    expect(published).toEqual(["m10", "m11"]);
    shared.dispose();
  });

  it.each(["pending", "acknowledged"] as const)(
    "never republishes %s private sources after switching scope",
    async (state) => {
      await conversation();
      const first = createDurableAutoExtractor(options());
      first.processTurn(messages.slice(0, 10), "conversation");
      if (state === "pending") first.dispose();
      await vi.waitFor(async () =>
        expect(await db.get<ExtractionJob>(ExtractionJob.table).query().fetchCount()).toBe(1)
      );
      if (state === "acknowledged") {
        const [job] = await db.get<ExtractionJob>(ExtractionJob.table).query().fetch();
        await vi.waitFor(() => expect(job._getRaw("message_ids")).toBe("[]"));
        first.dispose();
      }
      const shared = createDurableAutoExtractor({ ...options(), scope: "shared" });
      shared.processTurn(messages.slice(0, 12), "conversation");
      await vi.waitFor(() =>
        expect(
          vi.mocked(extractAndRetain).mock.calls.some((call) => call[2].scope === "shared")
        ).toBe(true)
      );
      const published = vi
        .mocked(extractAndRetain)
        .mock.calls.filter((call) => call[2].scope === "shared")
        .flatMap((call) => call[0].map((m) => m.id));
      expect(published).toEqual(["m10", "m11"]);
      if (state === "pending")
        expect(
          vi.mocked(extractAndRetain).mock.calls.some((call) => call[2].scope === "private")
        ).toBe(true);
      shared.dispose();
    }
  );
  describe("conversations from a message source", () => {
    const dm = Array.from({ length: 25 }, (_, i) => ({
      id: `d${i}`,
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `dm-secret-${i}`,
      seq: i + 1,
    }));
    function dmSource(initial: ExtractionSourceStatus) {
      const state = { status: initial };
      const byId = new Map(dm.map((m) => [m.id, m]));
      const source = {
        status: vi.fn(() => Promise.resolve(state.status)),
        load: vi.fn((_conversationId: string, ids: string[]) =>
          Promise.resolve(ids.flatMap((id) => byId.get(id) ?? []))
        ),
      };
      const messageSource = (conversationId: string) =>
        conversationId.startsWith("nearby:") ? source : undefined;
      return { state, source, messageSource };
    }
    const jobs = () => db.get<ExtractionJob>(ExtractionJob.table).query().fetch();

    it("extracts every queued message from the source, with only ids at rest", async () => {
      const { messageSource } = dmSource("ready");
      const worker = createDurableAutoExtractor({ ...options(), windowSize: 6, messageSource });
      worker.processTurn(dm, "nearby:7");
      await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(2));
      expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((m) => m.id)).toEqual(
        dm.slice(0, 20).map((m) => m.id)
      );
      expect(vi.mocked(extractAndRetain).mock.calls[1][0].at(-1)?.id).toBe("d24");
      const [job] = await jobs();
      expect(JSON.stringify(job._raw)).not.toContain("dm-secret");
      await vi.waitFor(() => expect(job._getRaw("message_ids")).toBe("[]"));
      worker.dispose();
    });

    it("drops the job once its source reports the conversation gone", async () => {
      const { messageSource } = dmSource("gone");
      const worker = createDurableAutoExtractor({ ...options(), messageSource });
      worker.processTurn(dm.slice(0, 3), "nearby:7");
      await vi.waitFor(async () => expect(await jobs()).toHaveLength(0));
      expect(extractAndRetain).not.toHaveBeenCalled();
      worker.dispose();
    });

    it("keeps a waiting source's job queued without spinning, and runs it once ready", async () => {
      const { state, source, messageSource } = dmSource("later");
      const worker = createDurableAutoExtractor({
        ...options(),
        retryDelayMs: 100,
        messageSource,
      });
      for (const id of ["nearby:1", "nearby:2", "nearby:3", "nearby:7"])
        worker.processTurn(dm.slice(0, 3), id);
      await vi.waitFor(async () => expect(await jobs()).toHaveLength(4));
      const settled = source.status.mock.calls.length;
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(extractAndRetain).not.toHaveBeenCalled();
      expect(source.status.mock.calls.length - settled).toBeLessThan(8);
      state.status = "ready";
      worker.processTurn(dm.slice(0, 3), "nearby:7");
      await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(4));
      expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((m) => m.id)).toEqual([
        "d0",
        "d1",
        "d2",
      ]);
      worker.dispose();
    });

    it("refuses a batch's writes once its source stops being ready", async () => {
      const { state, messageSource } = dmSource("ready");
      const verdicts: boolean[] = [];
      vi.mocked(extractAndRetain).mockImplementationOnce(async (_messages, retainCtx) => {
        verdicts.push(await retainCtx.vaultCtx.canWrite!());
        state.status = "gone";
        verdicts.push(await retainCtx.vaultCtx.canWrite!());
        return empty;
      });
      const worker = createDurableAutoExtractor({ ...options(), messageSource });
      worker.processTurn(dm.slice(0, 3), "nearby:7");
      await vi.waitFor(() => expect(verdicts).toEqual([true, false]));
      worker.dispose();
    });

    it("keeps a job queued under Private private after a flip to Public", async () => {
      const { state, messageSource } = dmSource("later");
      let scope = "private";
      const worker = createDurableAutoExtractor({
        ...options(),
        scope: () => scope,
        messageSource,
      });
      worker.processTurn(dm.slice(0, 3), "nearby:7");
      await vi.waitFor(async () => expect(await jobs()).toHaveLength(1));
      scope = "shared";
      state.status = "ready";
      worker.processTurn(dm.slice(0, 3), "nearby:7");
      await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
      expect(vi.mocked(extractAndRetain).mock.calls[0][2].scope).toBe("private");
      worker.dispose();
    });

    async function drained(count: number) {
      await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(count));
      await vi.waitFor(async () => {
        const all = await jobs();
        expect(all.map((job) => job._getRaw("message_ids"))).toEqual(["[]"]);
      });
    }

    it("never re-queues extracted messages after the watermark message goes away", async () => {
      const { messageSource } = dmSource("ready");
      let scope = "private";
      const worker = createDurableAutoExtractor({
        ...options(),
        scope: () => scope,
        messageSource,
      });
      worker.processTurn(dm.slice(0, 10), "nearby:7");
      await drained(1);
      scope = "shared";
      worker.processTurn([...dm.slice(0, 9), dm[10]], "nearby:7");
      await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(2));
      expect(vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id)).toEqual(["d10"]);
      expect(vi.mocked(extractAndRetain).mock.calls[1][2].scope).toBe("shared");
      worker.dispose();
    });

    it("extracts a later window whose messages are all newer than the watermark", async () => {
      const { messageSource } = dmSource("ready");
      const worker = createDurableAutoExtractor({ ...options(), messageSource });
      worker.processTurn(dm.slice(0, 10), "nearby:7");
      await drained(1);
      worker.processTurn(dm.slice(20, 23), "nearby:7");
      await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledTimes(2));
      expect(vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id)).toEqual([
        "d20",
        "d21",
        "d22",
      ]);
      worker.dispose();
    });

    it("skips rather than re-observes a turn that carries no positions", async () => {
      const { source, messageSource } = dmSource("ready");
      source.load.mockImplementation((_conversationId: string, ids: string[]) =>
        Promise.resolve(dm.filter((m) => ids.includes(m.id)).map((m) => ({ ...m, seq: 0 })))
      );
      const onError = vi.fn<NonNullable<DurableAutoExtractorOptions["onError"]>>();
      const unordered = dm.map(({ seq: _seq, ...message }) => message);
      const worker = createDurableAutoExtractor({ ...options(), onError, messageSource });
      worker.processTurn(unordered.slice(0, 10), "nearby:7");
      await drained(1);
      worker.processTurn([...unordered.slice(0, 9), unordered[10]], "nearby:7");
      await vi.waitFor(() =>
        expect(
          onError.mock.calls.some(
            ([error, id]) => error.message.includes("boundary unresolved") && id === "nearby:7"
          )
        ).toBe(true)
      );
      expect(extractAndRetain).toHaveBeenCalledTimes(1);
      worker.dispose();
    });

    it("rechecks a waiting source on its own once it is ready", async () => {
      const { state, messageSource } = dmSource("later");
      const worker = createDurableAutoExtractor({ ...options(), messageSource });
      worker.processTurn(dm.slice(0, 3), "nearby:7");
      await vi.waitFor(async () => expect(await jobs()).toHaveLength(1));
      state.status = "ready";
      await vi.waitFor(() => expect(extractAndRetain).toHaveBeenCalledOnce());
      worker.dispose();
    });

    it("keeps chat jobs running when a source never answers", async () => {
      await conversation();
      const { source, messageSource } = dmSource("ready");
      source.status.mockImplementation(() => new Promise<never>(() => {}));
      const worker = createDurableAutoExtractor({
        ...options(),
        sourceTimeoutMs: 20,
        messageSource,
      });
      worker.processTurn(dm.slice(0, 3), "nearby:7");
      await vi.waitFor(() => expect(source.status).toHaveBeenCalled());
      worker.processTurn(messages.slice(0, 2), "conversation");
      await vi.waitFor(() =>
        expect(vi.mocked(extractAndRetain).mock.calls.map((call) => call[0][0].id)).toContain("m0")
      );
      expect(vi.mocked(extractAndRetain).mock.calls.flatMap((call) => call[0])).not.toContainEqual(
        expect.objectContaining({ id: "d0" })
      );
      worker.dispose();
    });
  });
});
