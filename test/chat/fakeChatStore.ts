import {
  type ChatAccount,
  type ChatImport,
  type ChatPage,
  type ChatRecord,
  type ChatRecordKind,
  type ChatRef,
  type ChatSearchHit,
  type ChatSnapshot,
  type ChatStore,
  ChatStoreError,
  type ChatWrite,
} from "../../src/lib/chatStore/types";

interface Row {
  record: ChatRecord;
  version: number;
  seq: number;
}

type Operation =
  | "account"
  | "putMany"
  | "get"
  | "getMany"
  | "list"
  | "changes"
  | "search"
  | "importRecords"
  | "verify"
  | "activate"
  | "deleteAll";

/** Fails an operation before it runs, or after it applies when `after` is set, like a dropped response. */
export interface FakeChatStoreFault {
  op: Operation;
  error: ChatStoreError | Error;
  after?: boolean;
  /** Keeps failing until `heal` is called. */
  sticky?: boolean;
  /** Fails only batch writes this matches. */
  when?: (writes: readonly ChatWrite[]) => boolean;
}

const storedDims = 1536;

function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function keyOf(kind: string, id: string): string {
  return `${kind}/${id}`;
}

function root(kind: ChatRecordKind): boolean {
  return kind === "conversation" || kind === "project";
}

function normalize(vector: readonly number[]): number[] {
  const v = vector.slice(0, storedDims);
  const norm = Math.hypot(...v);
  return v.map((x) => x / norm);
}

function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * (b[i] ?? 0);
  return dot;
}

function conflict(code: string, status = 409): ChatStoreError {
  return new ChatStoreError(code, status, code);
}

/** In-memory {@link ChatStore} with vault's versioning, cascade, ordering and search rules, for tests. */
export function createFakeChatStore(options: { maxVectors?: number; maxBytes?: number } = {}) {
  let rows = new Map<string, Row>();
  let vectors = new Map<string, number[][]>();
  let models = new Map<string, string>();
  let seq = 0;
  const account: Omit<ChatAccount, "recordCount" | "storageBytes" | "vectorCount"> = {
    keyId: "",
    state: "none",
  };
  let accountRow = false;
  const faults: FakeChatStoreFault[] = [];
  const calls: Operation[] = [];

  const snapshot = (row: Row): ChatSnapshot => ({
    record: copy(row.record),
    version: row.version,
    serverUpdatedAt: new Date(Date.UTC(2026, 9, 1) + row.seq).toISOString(),
  });

  const bytes = () =>
    [...rows.values()].reduce(
      (sum, row) => sum + (row.record.isDeleted ? 0 : JSON.stringify(row.record.data).length * 2),
      0
    );
  const vectorCount = () => [...vectors.values()].reduce((sum, v) => sum + v.length, 0);

  const run = async <T>(
    op: Operation,
    body: () => T,
    writes?: readonly ChatWrite[]
  ): Promise<T> => {
    calls.push(op);
    const index = faults.findIndex((f) => f.op === op && (!f.when || (!!writes && f.when(writes))));
    const fault = index >= 0 ? faults[index] : undefined;
    if (fault && !fault.sticky) faults.splice(index, 1);
    if (fault && !fault.after) throw fault.error;
    await Promise.resolve();
    const result = body();
    if (fault?.after) throw fault.error;
    return result;
  };

  const liveConversation = (id: string) => {
    const row = rows.get(keyOf("conversation", id));
    return !!row && !row.record.isDeleted;
  };

  const tombstone = (row: Row) => {
    row.record = { ...row.record, isDeleted: true, data: {} };
    row.version += 1;
    row.seq = ++seq;
    vectors.delete(keyOf(row.record.kind, row.record.id));
    models.delete(keyOf(row.record.kind, row.record.id));
  };

  const writeVectors = (
    record: ChatRecord,
    embeddings: number[][] | undefined,
    model: string | undefined
  ) => {
    const key = keyOf(record.kind, record.id);
    if (record.isDeleted) {
      vectors.delete(key);
      models.delete(key);
    } else if (
      embeddings !== undefined &&
      (record.kind === "message" || record.kind === "summary")
    ) {
      vectors.set(key, embeddings.map(normalize));
      if (model) models.set(key, model);
      else models.delete(key);
    }
  };

  const apply = (write: ChatWrite): ChatSnapshot => {
    const record = copy(write.record);
    const key = keyOf(record.kind, record.id);
    const current = rows.get(key);
    if (
      record.isDeleted &&
      write.expectedVersion > 0 &&
      current?.record.isDeleted &&
      current.record.conversationId === record.conversationId
    )
      return snapshot(current);
    if (!root(record.kind) && !record.isDeleted && !liveConversation(record.conversationId))
      throw conflict("conversation_not_found");
    if (!root(record.kind) && !rows.has(keyOf("conversation", record.conversationId)))
      throw conflict("conversation_not_found");
    if (write.expectedVersion === 0) {
      if (current) throw conflict("version_conflict");
      const row = { record, version: 1, seq: ++seq };
      rows.set(key, row);
      writeVectors(record, write.embeddings, write.embeddingModel);
      return snapshot(row);
    }
    if (
      !current ||
      current.version !== write.expectedVersion ||
      current.record.conversationId !== record.conversationId ||
      current.record.createdAt !== record.createdAt ||
      (!root(record.kind) && current.record.sortKey !== record.sortKey) ||
      (current.record.isDeleted && !record.isDeleted)
    )
      throw conflict("version_conflict");
    current.record = record.isDeleted ? { ...record, data: {} } : record;
    current.version += 1;
    current.seq = ++seq;
    writeVectors(record, write.embeddings, write.embeddingModel);
    if (record.isDeleted && record.kind === "conversation")
      for (const row of rows.values())
        if (row.record.conversationId === record.id && !row.record.isDeleted) tombstone(row);
    return snapshot(current);
  };

  const transaction = <T>(body: () => T): T => {
    const saved = {
      rows: copy([...rows]),
      vectors: copy([...vectors]),
      models: [...models],
      seq,
    };
    try {
      const result = body();
      if (options.maxBytes !== undefined && bytes() > options.maxBytes)
        throw conflict("private_chat_storage_limit_reached", 413);
      if (options.maxVectors !== undefined && vectorCount() > options.maxVectors)
        throw conflict("private_chat_vector_limit_reached", 413);
      return result;
    } catch (error) {
      rows = new Map(saved.rows);
      vectors = new Map(saved.vectors);
      models = new Map(saved.models);
      seq = saved.seq;
      throw error;
    }
  };

  const visible = (row: Row, includeDeleted: boolean) =>
    includeDeleted ||
    (!row.record.isDeleted &&
      (root(row.record.kind) || liveConversation(row.record.conversationId)));

  const store: ChatStore = {
    get: (kind, id) =>
      run("get", () => {
        const row = rows.get(keyOf(kind, id));
        return row ? snapshot(row) : null;
      }),
    list: (query) =>
      run("list", (): ChatPage => {
        const parent = query.conversationId ?? "";
        const limit = query.limit ?? 20;
        if (limit > 200) throw conflict("validation_failed", 400);
        const matching = [...rows.values()]
          .filter(
            (row) =>
              row.record.kind === query.kind &&
              row.record.conversationId === parent &&
              visible(row, query.includeDeleted ?? false)
          )
          .sort(
            (a, b) =>
              b.record.sortKey - a.record.sortKey ||
              b.record.createdAt - a.record.createdAt ||
              (a.record.id < b.record.id ? 1 : a.record.id > b.record.id ? -1 : 0)
          );
        const start = query.cursor ? Number(query.cursor) : 0;
        const items = matching.slice(start, start + limit).map(snapshot);
        return {
          items,
          ...(start + limit < matching.length ? { nextCursor: String(start + limit) } : {}),
          ...(!root(query.kind) && !query.cursor ? { total: matching.length } : {}),
        };
      }),
    putMany: (writes) =>
      run(
        "putMany",
        () => {
          if (writes.length < 1 || writes.length > 25) throw conflict("validation_failed", 400);
          accountRow = true;
          return transaction(() => writes.map(apply));
        },
        writes
      ),
    getMany: (refs: readonly ChatRef[]) =>
      run("getMany", () =>
        refs.flatMap((r) => {
          const row = rows.get(keyOf(r.kind, r.id));
          return row ? [snapshot(row)] : [];
        })
      ),
    account: () =>
      run("account", (): ChatAccount => {
        const last = [...rows.values()].sort((a, b) => b.seq - a.seq)[0];
        return {
          ...account,
          recordCount: rows.size,
          storageBytes: bytes(),
          vectorCount: vectorCount(),
          ...(last ? { changesCursor: String(last.seq) } : {}),
        };
      }),
    importRecords: (records: readonly ChatImport[]) =>
      run("importRecords", () =>
        transaction(() => {
          if (!accountRow) {
            accountRow = true;
            account.state = "migrating";
          }
          const migrating = account.state === "migrating";
          let written = 0;
          for (const item of records) {
            const key = keyOf(item.record.kind, item.record.id);
            const parent = rows.get(keyOf("conversation", item.record.conversationId));
            const orphaned =
              !item.record.isDeleted && !root(item.record.kind) && !!parent?.record.isDeleted;
            const record = orphaned
              ? { ...copy(item.record), isDeleted: true, data: {} }
              : copy(item.record);
            const current = rows.get(key);
            const wins =
              !!current &&
              (record.isDeleted || !current.record.isDeleted) &&
              (current.record.updatedAt < record.updatedAt ||
                (current.record.updatedAt === record.updatedAt &&
                  record.isDeleted &&
                  !current.record.isDeleted));
            const sameRouting =
              !!current &&
              current.record.conversationId === record.conversationId &&
              (current.record.sortKey === record.sortKey || root(record.kind)) &&
              current.record.createdAt === record.createdAt;
            if (current && !(migrating && wins && sameRouting)) {
              if (migrating && wins && !sameRouting) throw conflict("routing_metadata_conflict");
              continue;
            }
            if (current) {
              current.record = record.isDeleted ? { ...record, data: {} } : record;
              current.version += 1;
              current.seq = ++seq;
            } else {
              rows.set(key, { record, version: 1, seq: ++seq });
            }
            written++;
            writeVectors(record, orphaned ? undefined : item.embeddings, item.embeddingModel);
            if (record.isDeleted && record.kind === "conversation")
              for (const row of rows.values())
                if (row.record.conversationId === record.id && !row.record.isDeleted)
                  tombstone(row);
          }
          return written;
        })
      ),
    verify: (revisions) =>
      run("verify", () =>
        revisions
          .filter((r) => {
            const row = rows.get(keyOf(r.kind, r.id));
            return (
              !row ||
              (account.state === "migrating" &&
                (r.isDeleted || !row.record.isDeleted) &&
                (row.record.updatedAt < r.updatedAt ||
                  (row.record.updatedAt === r.updatedAt && r.isDeleted && !row.record.isDeleted)))
            );
          })
          .map((r) => ({ kind: r.kind, id: r.id }))
      ),
    activate: () =>
      run("activate", () => {
        if (!accountRow) throw conflict("conflict");
        if (account.state !== "migrating") return false;
        account.state = "active";
        return true;
      }),
    changes: (cursor, opts) =>
      run("changes", () => {
        const after = cursor ? Number(cursor) : 0;
        const limit = opts?.limit ?? 100;
        const ordered = [...rows.values()]
          .filter((row) => row.seq > after)
          .sort((a, b) => a.seq - b.seq);
        const items = ordered.slice(0, limit);
        const last = items[items.length - 1];
        return {
          items: items.map(snapshot),
          ...(ordered.length > limit && last ? { nextCursor: String(last.seq) } : {}),
          changesCursor: last ? String(last.seq) : (cursor ?? ""),
        };
      }),
    search: (embedding, opts) =>
      run("search", () => {
        const query = normalize(embedding);
        const kinds = opts?.kinds ?? ["message", "summary"];
        const hits: ChatSearchHit[] = [];
        for (const [key, chunks] of vectors) {
          const row = rows.get(key);
          if (
            !row ||
            !kinds.includes(row.record.kind as "message" | "summary") ||
            !visible(row, false) ||
            (opts?.conversationId !== undefined &&
              row.record.conversationId !== opts.conversationId) ||
            row.record.conversationId === opts?.excludeConversationId ||
            (opts?.embeddingModel && models.has(key) && models.get(key) !== opts.embeddingModel)
          )
            continue;
          let best = 0;
          chunks.forEach((chunk, i) => {
            if (cosine(query, chunk) > cosine(query, chunks[best])) best = i;
          });
          hits.push({ ...snapshot(row), chunk: best, score: cosine(query, chunks[best]) });
        }
        return hits.sort((a, b) => b.score - a.score).slice(0, opts?.limit ?? 20);
      }),
    deleteAll: () =>
      run("deleteAll", () => {
        let deleted = 0;
        for (const row of rows.values())
          if (!row.record.isDeleted) {
            tombstone(row);
            deleted++;
          }
        return deleted;
      }),
    attachments: {
      create: () => Promise.reject(new Error("attachments are not faked")),
      commit: () => Promise.reject(new Error("attachments are not faked")),
      get: () => Promise.reject(new Error("attachments are not faked")),
      delete: () => Promise.reject(new Error("attachments are not faked")),
    },
  };

  return {
    store,
    account,
    calls,
    fail(fault: FakeChatStoreFault) {
      faults.push(fault);
    },
    heal() {
      faults.length = 0;
    },
    row(kind: ChatRecordKind, id: string): Promise<ChatSnapshot | undefined> {
      const row = rows.get(keyOf(kind, id));
      return Promise.resolve(row ? snapshot(row) : undefined);
    },
    vectors(kind: ChatRecordKind, id: string): number[][] | undefined {
      return vectors.get(keyOf(kind, id));
    },
    write(writes: ChatWrite[]): Promise<ChatSnapshot[]> {
      try {
        return Promise.resolve(transaction(() => writes.map(apply)));
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
}
