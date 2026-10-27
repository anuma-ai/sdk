import type { Database } from "@nozbe/watermelondb";

import type { EmbeddedWalletSignerFn, SignMessageFn } from "../../react/useEncryption";
import { type Conversation, Message } from "../db/chat/models";
import {
  getConversationOp,
  getMessagesOp,
  type StorageOperationsContext,
} from "../db/chat/operations";
import { createSummaryContext, getConversationSummaryOp } from "../db/chat/summaryOperations";
import type { CreateMessageOptions, StoredMessage } from "../db/chat/types";
import { ConversationMemory } from "../db/conversationMemory/models";
import { getConversationMemoriesOp } from "../db/conversationMemory/operations";
import { isEncrypted } from "../db/encryption-utils";
import { validChatId } from "./remote";
import {
  type ChatImport,
  type ChatRecord,
  type ChatRecordKind,
  type ChatRef,
  type ChatStore,
  ChatStoreError,
  type ChatWrite,
} from "./types";
import {
  acceptedVector,
  conversationSortKey,
  fitChunks,
  fitRecord,
  messageData,
  plain,
} from "./vaultRecords";

export interface ChatMigrationOptions {
  /** The device's local chat database. */
  database: Database;
  /** Vault, opened with the account's canonical key. */
  store: ChatStore;
  walletAddress?: string;
  signMessage?: SignMessageFn;
  embeddedWalletSigner?: EmbeddedWalletSignerFn;
  /** Runs the final pass while local chat writers are held, so nothing lands locally after it. */
  withWriteBarrier: (task: () => Promise<ChatMigrationResult>) => Promise<ChatMigrationResult>;
  /** Called once vault holds everything; hand the device over to vault here. */
  onActivated: () => void | Promise<void>;
  /** Activate even when some rows could not be read; they stay on the device. */
  allowSkipped?: boolean;
  maxVectors?: number;
  maxStorageBytes?: number;
  signal?: AbortSignal;
  onProgress?: (progress: ChatMigrationProgress) => void;
}

export interface ChatMigrationProgress {
  imported: number;
  toImport: number;
}

export interface ChatMigrationSkip {
  kind: ChatRecordKind;
  id: string;
  reason: "unreadable" | "invalid";
}

export interface ChatMigrationResult {
  state: "migrating" | "active";
  conversations: number;
  messages: number;
  imported: number;
  skipped: ChatMigrationSkip[];
  /** Conversations whose title could not be decrypted and went up untitled. */
  untitled: number;
  /** Messages sent without vectors to stay inside the account's vector quota. */
  unembedded: number;
  /** Messages shrunk to fit vault's record limit. */
  truncated: number;
}

interface LocalChats {
  records: ChatImport[];
  skipped: Map<string, ChatMigrationSkip>;
  conversations: number;
  messages: number;
  untitled: number;
  truncated: number;
}

const maxPasses = 5;
const verifyBatch = 1000;
const importBatch = 100;
const importChunks = 200;
const importPlaintextBytes = 3_900_000;
const writeBatch = 25;

function key(record: Pick<ChatRecord, "kind" | "id">): string {
  return `${record.kind}/${record.id}`;
}

function ms(date: Date | undefined, fallback = 1): number {
  const value = date?.getTime();
  return value && Number.isFinite(value) ? Math.max(1, Math.floor(value)) : fallback;
}

function sealed(value: unknown): boolean {
  if (typeof value === "string") return isEncrypted(value);
  if (Array.isArray(value)) return typeof value[0] !== "number" && value.some(sealed);
  if (value && typeof value === "object" && !(value instanceof Date))
    return Object.values(value).some(sealed);
  return false;
}

function bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function messageRecord(message: StoredMessage): ChatImport {
  const {
    uniqueId: _uniqueId,
    messageId: _messageId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    decryptionStatus: _status,
    chunks,
    vector,
    ...fields
  } = message;
  const fitted = chunks?.length ? fitChunks(chunks) : undefined;
  const single = fitted ? undefined : acceptedVector(vector);
  const embeddings = fitted?.map((c) => c.vector) ?? (single ? [single] : undefined);
  const record = fitRecord({
    kind: "message",
    id: message.uniqueId,
    conversationId: message.conversationId,
    sortKey: message.messageId,
    createdAt: ms(message.createdAt),
    updatedAt: ms(message.updatedAt, ms(message.createdAt)),
    isDeleted: false,
    data: {
      ...messageData(fields as CreateMessageOptions),
      ...(fitted ? { chunkOffsets: fitted.map((c) => [c.startOffset, c.endOffset]) } : {}),
    },
  });
  return {
    record,
    ...(embeddings ? { embeddings } : {}),
    ...(embeddings && message.embeddingModel ? { embeddingModel: message.embeddingModel } : {}),
  };
}

async function readLocal(options: ChatMigrationOptions): Promise<LocalChats> {
  const { database } = options;
  const ctx: StorageOperationsContext = {
    database,
    messagesCollection: database.get<Message>(Message.table),
    conversationsCollection: database.get<Conversation>("conversations"),
    walletAddress: options.walletAddress,
    signMessage: options.signMessage,
    embeddedWalletSigner: options.embeddedWalletSigner,
  };
  const summaries = createSummaryContext(database);
  const memory = {
    database,
    conversationMemoryCollection: database.get<ConversationMemory>(ConversationMemory.table),
  };
  const out: LocalChats = {
    records: [],
    skipped: new Map(),
    conversations: 0,
    messages: 0,
    untitled: 0,
    truncated: 0,
  };
  const skip = (kind: ChatRecordKind, id: string, reason: ChatMigrationSkip["reason"]) =>
    out.skipped.set(`${kind}/${id}`, { kind, id, reason });

  const rows = new Map<string, Conversation[]>();
  for (const row of await ctx.conversationsCollection.query().fetch())
    rows.set(row.conversationId, [...(rows.get(row.conversationId) ?? []), row]);

  for (const [conversationId, group] of rows) {
    options.signal?.throwIfAborted();
    if (!validChatId(conversationId)) {
      skip("conversation", conversationId, "invalid");
      continue;
    }
    const conversation = group.some((row) => !row.isDeleted)
      ? await getConversationOp(ctx, conversationId)
      : null;
    if (!conversation) {
      const newest = group.reduce((a, b) => (ms(b.updatedAt) > ms(a.updatedAt) ? b : a));
      out.records.push({
        record: {
          kind: "conversation",
          id: conversationId,
          conversationId: "",
          sortKey: 0,
          createdAt: ms(newest.createdAt),
          updatedAt: ms(newest.updatedAt, ms(newest.createdAt)),
          isDeleted: true,
          data: {},
        },
      });
      continue;
    }

    const messages = await getMessagesOp(ctx, conversationId);
    const unreadableTitle = isEncrypted(conversation.title);
    if (unreadableTitle) out.untitled++;
    const createdAt = ms(conversation.createdAt);
    const data = plain({
      title: unreadableTitle ? "" : conversation.title,
      projectId: conversation.projectId || undefined,
      pinnedAt: conversation.pinnedAt ? ms(conversation.pinnedAt) : undefined,
      lastActivityAt: Math.max(
        ms(conversation.updatedAt, createdAt),
        ...messages.map((m) => ms(m.createdAt))
      ),
    });
    out.conversations++;
    out.records.push({
      record: {
        kind: "conversation",
        id: conversationId,
        conversationId: "",
        sortKey: conversationSortKey(data, createdAt),
        createdAt,
        updatedAt: ms(conversation.updatedAt, createdAt),
        isDeleted: false,
        data,
      },
    });

    for (const message of messages) {
      if (message.decryptionStatus || sealed(message)) {
        skip("message", message.uniqueId, "unreadable");
        continue;
      }
      if (!validChatId(message.uniqueId) || !Number.isSafeInteger(message.messageId)) {
        skip("message", message.uniqueId, "invalid");
        continue;
      }
      const prepared = messageRecord(message);
      if (prepared.record.data.truncated) out.truncated++;
      out.messages++;
      out.records.push(prepared);
    }

    const summary = await getConversationSummaryOp(summaries, conversationId);
    if (summary)
      out.records.push({
        record: {
          kind: "summary",
          id: conversationId,
          conversationId,
          sortKey: 0,
          createdAt: ms(summary.createdAt),
          updatedAt: ms(summary.updatedAt, ms(summary.createdAt)),
          isDeleted: false,
          data: plain({
            summary: summary.summary,
            summarizedUpTo: summary.summarizedUpTo,
            tokenCount: summary.tokenCount,
          }),
        },
      });

    const links = await getConversationMemoriesOp(memory, conversationId);
    if (links.length) {
      const times = links.map((l) => ms(l.createdAt));
      out.records.push({
        record: {
          kind: "memory_links",
          id: conversationId,
          conversationId,
          sortKey: 0,
          createdAt: Math.min(...times),
          updatedAt: Math.max(...times),
          isDeleted: false,
          data: plain({
            links: links.map((l) => ({
              memoryId: l.memoryId,
              score: l.score,
              createdAt: ms(l.createdAt),
            })),
          }),
        },
      });
    }
  }
  return out;
}

async function missing(
  store: ChatStore,
  records: readonly ChatImport[],
  signal?: AbortSignal
): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < records.length; i += verifyBatch) {
    const refs = await store.verify(
      records.slice(i, i + verifyBatch).map(({ record }) => ({
        kind: record.kind,
        id: record.id,
        updatedAt: record.updatedAt,
        isDeleted: record.isDeleted,
      })),
      signal
    );
    for (const ref of refs) out.add(key(ref));
  }
  return out;
}

interface UploadJournal {
  keys: Set<string>;
  add(keys: Iterable<string>): Promise<void>;
  drop(keys: Iterable<string>): Promise<void>;
  clear(): Promise<void>;
}

async function openJournal(database: Database, walletAddress?: string): Promise<UploadJournal> {
  const name = `vault_chat_migration_uploads:${walletAddress ?? ""}`;
  const keys = new Set((await database.localStorage.get<string[]>(name)) ?? []);
  const save = () => database.localStorage.set(name, [...keys]);
  return {
    keys,
    add: (more) => {
      for (const k of more) keys.add(k);
      return save();
    },
    drop: (less) => {
      for (const k of less) keys.delete(k);
      return save();
    },
    clear: () => database.localStorage.remove(name),
  };
}

function ref(k: string): ChatRef {
  const at = k.indexOf("/");
  return { kind: k.slice(0, at) as ChatRecordKind, id: k.slice(at + 1) };
}

async function deletedSinceUpload(
  store: ChatStore,
  journal: UploadJournal,
  local: LocalChats,
  signal?: AbortSignal
): Promise<ChatWrite[]> {
  const present = new Set([...local.records.map((r) => key(r.record)), ...local.skipped.keys()]);
  const gone = [...journal.keys].filter((k) => !present.has(k));
  if (gone.length === 0) return [];
  const live = (await store.getMany(gone.map(ref), signal)).filter((s) => !s.record.isDeleted);
  const tombstoning = new Set(live.map((s) => key(s.record)));
  await journal.drop(gone.filter((k) => !tombstoning.has(k)));
  return live.map(({ record, version }) => ({
    record: {
      ...record,
      isDeleted: true,
      data: {},
      updatedAt: Math.max(Date.now(), record.updatedAt + 1),
    },
    expectedVersion: version,
  }));
}

function batches(records: readonly ChatImport[]): ChatImport[][] {
  const out: ChatImport[][] = [];
  let batch: ChatImport[] = [];
  let chunks = 0;
  let size = 0;
  for (const item of records) {
    const vectors = item.embeddings?.length ?? 0;
    const itemSize = bytes(item.record);
    if (
      batch.length > 0 &&
      (batch.length >= importBatch ||
        chunks + vectors > importChunks ||
        size + itemSize > importPlaintextBytes)
    ) {
      out.push(batch);
      batch = [];
      chunks = 0;
      size = 0;
    }
    batch.push(item);
    chunks += vectors;
    size += itemSize;
  }
  if (batch.length) out.push(batch);
  return out;
}

/** Strips vectors from the oldest messages until the upload fits the account's vector quota. */
function fitVectors(
  records: ChatImport[],
  available: number,
  unembedded: Set<string>
): ChatImport[] {
  let total = records.reduce((sum, r) => sum + (r.embeddings?.length ?? 0), 0);
  if (total <= available) return records;
  const oldestFirst = records
    .filter((r) => r.embeddings?.length)
    .sort((a, b) => a.record.sortKey - b.record.sortKey || a.record.createdAt - b.record.createdAt);
  const strip = new Set<ChatImport>();
  for (const r of oldestFirst) {
    if (total <= available) break;
    total -= r.embeddings!.length;
    strip.add(r);
    unembedded.add(key(r.record));
  }
  return records.map((r) => (strip.has(r) ? { record: r.record } : r));
}

/** Copies this device's chats to vault, verifies them under the write barrier, then activates vault and hands the device over. */
export async function migrateChatsToRemote(
  options: ChatMigrationOptions
): Promise<ChatMigrationResult> {
  if (typeof options.withWriteBarrier !== "function" || typeof options.onActivated !== "function")
    throw new Error("A write barrier and a remote chat handoff are required");
  const { store, signal } = options;
  const maxVectors = options.maxVectors ?? 20_000;
  const maxStorageBytes = options.maxStorageBytes ?? 1024 ** 3;
  const unembedded = new Set<string>();
  const journal = await openJournal(options.database, options.walletAddress);
  let imported = 0;

  const passes = async (finalizing: boolean): Promise<ChatMigrationResult> => {
    for (let pass = 0; ; pass++) {
      signal?.throwIfAborted();
      const local = await readLocal(options);
      const absent = await missing(store, local.records, signal);
      const pending = local.records.filter((r) => absent.has(key(r.record)));
      const deleted = await deletedSinceUpload(store, journal, local, signal);
      if (pending.length === 0 && deleted.length === 0) {
        const result = (state: ChatMigrationResult["state"]): ChatMigrationResult => ({
          state,
          conversations: local.conversations,
          messages: local.messages,
          imported,
          skipped: [...local.skipped.values()],
          untitled: local.untitled,
          unembedded: unembedded.size,
          truncated: local.truncated,
        });
        if (local.skipped.size > 0 && !options.allowSkipped) return result("migrating");
        if (!finalizing) return options.withWriteBarrier(() => passes(true));
        if ((await store.account(signal)).state === "migrating") await store.activate(signal);
        await options.onActivated();
        await journal.clear();
        return result("active");
      }
      if (pass >= maxPasses)
        throw new ChatStoreError(
          "Vault still reports chat records missing after importing them",
          409,
          "migration_incomplete"
        );

      for (let i = 0; i < deleted.length; i += writeBatch) {
        const batch = deleted.slice(i, i + writeBatch);
        await store.putMany(batch, signal);
        await journal.drop(batch.map((w) => key(w.record)));
      }
      if (pending.length === 0) continue;

      const account = await store.account(signal);
      const estimate = pending.reduce((sum, r) => sum + bytes(r.record.data) * 2 + 64, 0);
      if (account.storageBytes + estimate > maxStorageBytes)
        throw new ChatStoreError(
          "This device's chats do not fit the account's vault storage",
          413,
          "private_chat_storage_limit_reached"
        );
      const upload = fitVectors(
        [
          ...pending.filter((r) => r.record.kind === "conversation"),
          ...pending.filter((r) => r.record.kind !== "conversation"),
        ],
        Math.max(0, maxVectors - account.vectorCount),
        unembedded
      );
      await journal.add(upload.map((r) => key(r.record)));
      let sent = 0;
      options.onProgress?.({ imported: sent, toImport: upload.length });
      for (const batch of batches(upload)) {
        await store.importRecords(batch, signal);
        sent += batch.length;
        options.onProgress?.({ imported: sent, toImport: upload.length });
      }
      imported += sent;
    }
  };
  return passes(false);
}
