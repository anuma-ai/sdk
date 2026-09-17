import { appSchema, Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sdkSchema, sdkModelClasses } from "../db/schema";
import {
  createVaultMemoryOp,
  createSupersedingMemoryOp,
  updateVaultMemoryOp,
  archiveVaultMemoryOp,
  getAllVaultMemoriesOp,
  getVaultCandidateKeysOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import { Conversation, Message } from "../db/chat/models";
import {
  clearMessagesOp,
  deleteConversationOp,
  deleteMessageOp,
  getMessageOp,
  type StorageOperationsContext,
} from "../db/chat/operations";
import { ExtractionJob } from "../db/extractionJobs/models";
import { extractAndRetain } from "./autoExtract";
import { createDurableAutoExtractor } from "./durableExtraction";

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
  vi.mocked(getMessageOp).mockClear();
});

describe("memory persistence reliability", () => {
  it("cannot supersede a fact after the source becomes ineligible", async () => {
    const original = await createVaultMemoryOp(ctx, { content: "Lives in Paris" });
    await expect(
      createSupersedingMemoryOp(
        { ...ctx, canWrite: async () => false },
        { content: "Lives in Rome" },
        original!.uniqueId
      )
    ).rejects.toThrow("no longer eligible");
    const rows = await getAllVaultMemoriesOp(ctx);
    expect(rows.map((row) => row.content)).toEqual(["Lives in Paris"]);
    expect(rows[0].supersededBy).toBeFalsy();
  });
  it("replayed source ids change neither proof, content, nor freshness", async () => {
    const memory = await createVaultMemoryOp(ctx, {
      content: "Works at Acme",
      sourceChunkIds: ["m1"],
    });
    expect(memory).not.toBeNull();
    const fresh = await updateVaultMemoryOp(ctx, memory!.uniqueId, {
      content: "Works at Acme",
      sourceChunkIds: ["m2"],
      observationSourceIds: ["m2"],
      proofCountIncrement: 1,
      lastObservedAt: 100,
      preserveUpdatedAt: true,
    });
    const replay = await updateVaultMemoryOp(ctx, memory!.uniqueId, {
      content: "Old extracted paraphrase",
      sourceChunkIds: ["m2"],
      observationSourceIds: ["m2"],
      proofCountIncrement: 1,
      lastObservedAt: 200,
      preserveUpdatedAt: true,
    });
    expect(replay!.proofCount).toBe(fresh!.proofCount);
    expect(replay!.content).toBe("Works at Acme");
    expect(replay!.lastObservedAt).toBe(100);
    expect(replay!.sourceChunkIds).toEqual(["m1", "m2"]);
  });
  it("unions concurrent provenance in the serialized writer", async () => {
    const memory = await createVaultMemoryOp(ctx, { content: "Same fact", sourceChunkIds: ["m1"] });
    await Promise.all(
      ["m2", "m3"].map((id) =>
        updateVaultMemoryOp(ctx, memory!.uniqueId, {
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
    await updateVaultMemoryOp(ctx, memory!.uniqueId, {
      content: memory!.content,
      lastObservedAt: Date.now(),
      preserveUpdatedAt: true,
    });
    expect(
      await archiveVaultMemoryOp(ctx, memory!.uniqueId, {
        expectedUpdatedAt: memory!.updatedAt.getTime(),
        expectedLastObservedAt: null,
      })
    ).toBe(false);
  });
  it("filters candidate ids on both legacy and projected read paths, including empty scope", async () => {
    const keep = await createVaultMemoryOp(ctx, { content: "allowed" });
    await createVaultMemoryOp(ctx, { content: "outside" });
    expect(
      (await getAllVaultMemoriesOp(ctx, { memoryIds: [keep!.uniqueId] })).map((m) => m.uniqueId)
    ).toEqual([keep!.uniqueId]);
    expect(
      (await getVaultCandidateKeysOp(ctx, { memoryIds: [keep!.uniqueId] })).map((m) => m.uniqueId)
    ).toEqual([keep!.uniqueId]);
    expect(await getAllVaultMemoriesOp(ctx, { memoryIds: [] })).toEqual([]);
    expect(await getVaultCandidateKeysOp(ctx, { memoryIds: [] })).toEqual([]);
  });
});

describe("durable extraction outbox", () => {
  const options = () => ({
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
      for (const message of messages) {
        await db.get<Message>("history").create((row) => {
          row._raw.id = message.id;
          row._setRaw("conversation_id", "conversation");
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
  it.each(["missing", "locked"] as const)(
    "retries a %s source without acknowledging it",
    async (reason) => {
      await conversation();
      const stored = await getMessageOp(storage(), "m0");
      vi.mocked(getMessageOp).mockResolvedValueOnce(
        reason === "missing" ? null : { ...stored!, decryptionStatus: "key_missing" }
      );
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
    }
  );

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
});
