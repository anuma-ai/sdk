import { v7 as uuidv7 } from "uuid";

import type { getAllFilesOp } from "../db/chat/operations";
import {
  type ChunkSearchResult,
  type CreateConversationOptions,
  type CreateMessageOptions,
  generateConversationId,
  type GetMessagesPageOptions,
  type MessageFeedback,
  type MessageSkeleton,
  type StoredConversationSummary,
  type StoredFileWithContext,
  type StoredMessage,
} from "../db/chat/types";
import type {
  ChatBackend,
  ChatBackendFactory,
  ChatChunkSearchOptions,
} from "../storage/ChatBackend";
import type {
  ChatStorageAdapter,
  ChatStorageObservable,
  ConversationQueryOptions,
} from "../storage/ChatStorageAdapter";
import {
  type ChatJson,
  type ChatRecord,
  type ChatRecordKind,
  type ChatSnapshot,
  type ChatStore,
  ChatStoreError,
} from "./types";
import {
  applyPatch,
  type ChatOutboxStorage,
  type ChatPatch,
  loadOutbox,
  mergePatch,
  nextBatch,
  patchKey,
  saveOutbox,
  toWrite,
} from "./vaultOutbox";
import {
  acceptedVector,
  type ChatData,
  chunkOffsets,
  fitChunks,
  messageData,
  plain,
  toConversation,
  toLinks,
  toMessage,
  toSkeletons,
  toSummary,
} from "./vaultRecords";

export type VaultChatEvent =
  | { type: "conversations" }
  | { type: "messages"; conversationId: string }
  | { type: "summary"; conversationId: string }
  | { type: "links"; conversationId: string }
  | { type: "outbox"; pending: number; stopped?: string }
  | {
      type: "dropped";
      kind: ChatRecordKind;
      id: string;
      reason: "missing" | "storage_quota" | "invalid" | "conversation_deleted";
    }
  | { type: "vector_quota" };

export interface VaultChatActivity {
  isActive(): boolean;
  subscribe(onChange: () => void): () => void;
}

export interface VaultChatBackendOptions {
  store: ChatStore;
  /** Persists unsent writes, sealed with `seal`, so they survive a reload. */
  outbox?: { storage: ChatOutboxStorage; seal: Pick<SealingCipher, "encrypt" | "decrypt"> };
  activity?: VaultChatActivity;
  /** Polls `/changes` this often while active; 0 polls only on activity and broadcast hints. */
  pollIntervalMs?: number;
  /** BroadcastChannel name shared by this account's tabs, so one tab's writes prompt the others to poll. */
  channel?: string;
  threadCacheSize?: number;
  now?: () => number;
}

interface SealingCipher {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}

/** A {@link ChatBackend} over vault: a cache, an optimistic outbox and a change poller. */
export interface VaultChatBackend extends ChatBackend {
  subscribe(listener: (event: VaultChatEvent) => void): () => void;
  /** Sends queued writes now; resolves once the outbox is empty, waiting on a retry, or stopped. */
  flush(): Promise<void>;
  /** Applies changes other devices made since the last poll. */
  poll(): Promise<void>;
  status(): { pending: number; stopped?: string };
  close(): void;
}

const terminalCodes = new Set(["key_mismatch", "account_changed", "account_not_found"]);

function key(kind: ChatRecordKind, id: string): string {
  return `${kind}/${id}`;
}

const resumableFields = [
  "content",
  "model",
  "imageModel",
  "files",
  "fileIds",
  "usage",
  "sources",
  "responseDuration",
  "embeddingModel",
  "wasStopped",
  "error",
  "thoughtProcess",
  "thinking",
  "toolCallEvents",
] as const;

function resumedFields(options: CreateMessageOptions): { [field: string]: ChatJson } {
  return plain(
    Object.fromEntries(
      resumableFields.filter((f) => options[f] !== undefined).map((f) => [f, options[f]])
    )
  );
}

function defaultActivity(): VaultChatActivity {
  return {
    isActive: () =>
      (typeof document === "undefined" || document.visibilityState !== "hidden") &&
      (typeof navigator === "undefined" || navigator.onLine !== false),
    subscribe: (onChange) => {
      if (typeof window === "undefined" || typeof document === "undefined") return () => {};
      document.addEventListener("visibilitychange", onChange);
      window.addEventListener("focus", onChange);
      window.addEventListener("online", onChange);
      return () => {
        document.removeEventListener("visibilitychange", onChange);
        window.removeEventListener("focus", onChange);
        window.removeEventListener("online", onChange);
      };
    },
  };
}

/** Creates a vault chat backend for one account and key; build a new one after a wallet or key change. */
export function createVaultChatBackend(options: VaultChatBackendOptions): VaultChatBackend {
  const { store } = options;
  const now = options.now ?? Date.now;
  const threadLimit = options.threadCacheSize ?? 30;
  const pollIntervalMs = options.pollIntervalMs ?? 60_000;
  const activity = options.activity ?? defaultActivity();

  const confirmed = new Map<string, ChatSnapshot>();
  const checked = new Set<string>();
  let pending = new Map<string, ChatPatch>();
  const inflight = new Map<string, ChatPatch>();
  const threads = new Map<string, Promise<void>>();
  const listeners = new Set<(event: VaultChatEvent) => void>();
  let seq = 0;
  let stopped: string | undefined;
  let closed = false;
  let cursor: string | undefined;
  let isolate = 0;
  let failures = 0;
  let flushing: Promise<void> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let polling: Promise<void> | null = null;
  let pollFailures = 0;
  let persisting: Promise<void> = Promise.resolve();
  let readyPromise: Promise<void> | null = null;

  const channel =
    options.channel && typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel(options.channel)
      : undefined;

  const emit = (event: VaultChatEvent) => {
    for (const listener of [...listeners]) listener(event);
  };

  const view = (k: string): ChatRecord | undefined => {
    let record = confirmed.get(k)?.record;
    for (const patch of [inflight.get(k), pending.get(k)]) {
      if (patch) record = applyPatch(record, patch) ?? record;
    }
    return record;
  };

  const conversationLive = (conversationId: string) => {
    const conversation = view(key("conversation", conversationId));
    return !!conversation && !conversation.isDeleted;
  };

  const all = (kind: ChatRecordKind, conversationId?: string, includeDeleted = false) => {
    const keys = new Set([...confirmed.keys(), ...inflight.keys(), ...pending.keys()]);
    const out: ChatRecord[] = [];
    for (const k of keys) {
      if (!k.startsWith(`${kind}/`)) continue;
      const record = view(k);
      if (!record || (record.isDeleted && !includeDeleted)) continue;
      if (conversationId !== undefined && record.conversationId !== conversationId) continue;
      out.push(record);
    }
    return out;
  };

  const merge = (snapshot: ChatSnapshot) => {
    const k = key(snapshot.record.kind, snapshot.record.id);
    const known = confirmed.get(k);
    if (known && known.version >= snapshot.version) return false;
    confirmed.set(k, snapshot);
    return true;
  };

  const persist = () => {
    const storage = options.outbox;
    if (!storage) return Promise.resolve();
    persisting = persisting
      .catch(() => undefined)
      .then(() => {
        const intents = new Map<string, ChatPatch>(inflight);
        for (const [k, patch] of pending) {
          const earlier = intents.get(k);
          intents.set(k, earlier ? mergePatch(earlier, patch) : patch);
        }
        return saveOutbox(storage.storage, storage.seal.encrypt, [...intents.values()]);
      });
    return persisting;
  };

  const reportOutbox = () =>
    emit({
      type: "outbox",
      pending: pending.size + inflight.size,
      ...(stopped ? { stopped } : {}),
    });

  const scheduleFlush = (delay = 0) => {
    if (closed || stopped || flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = undefined;
      if (!retryTimer) void flush();
    }, delay);
  };

  const enqueue = (patch: Omit<ChatPatch, "seq" | "updatedAt">) => {
    if (stopped) throw new ChatStoreError("Chat storage stopped", 409, stopped);
    const full: ChatPatch = { ...patch, seq: ++seq, updatedAt: now() };
    const k = patchKey(full);
    const existing = pending.get(k);
    pending.set(k, existing ? mergePatch(existing, full) : full);
    scheduleFlush();
    reportOutbox();
    return persist();
  };

  const restore = (batch: readonly ChatPatch[]) => {
    const front = new Map<string, ChatPatch>();
    for (const patch of batch) {
      const k = patchKey(patch);
      if (!inflight.has(k)) continue;
      inflight.delete(k);
      const tried: ChatPatch = { ...patch, attempted: true };
      const later = pending.get(k);
      front.set(k, later ? mergePatch(tried, later) : tried);
    }
    for (const [k, patch] of pending) if (!front.has(k)) front.set(k, patch);
    pending = front;
  };

  const refresh = async (keys: Iterable<string>) => {
    const refs = [...new Set(keys)].map((k) => {
      const [kind, ...rest] = k.split("/");
      return { kind: kind as ChatRecordKind, id: rest.join("/") };
    });
    if (refs.length === 0) return;
    const found = await store.getMany(refs);
    const seen = new Set(found.map((s) => key(s.record.kind, s.record.id)));
    for (const snapshot of found) merge(snapshot);
    for (const ref of refs) {
      const k = key(ref.kind, ref.id);
      if (!seen.has(k)) confirmed.delete(k);
      checked.add(k);
    }
  };

  const drop = (
    patch: ChatPatch,
    reason: Extract<VaultChatEvent, { type: "dropped" }>["reason"]
  ) => {
    inflight.delete(patchKey(patch));
    pending.delete(patchKey(patch));
    emit({ type: "dropped", kind: patch.kind, id: patch.id, reason });
  };

  const announce = (records: readonly ChatRecord[]) => {
    const conversations = new Set<string>();
    let index = false;
    for (const r of records) {
      if (r.kind === "conversation") {
        index = true;
        if (r.isDeleted) conversations.add(r.id);
      } else if (r.kind === "message") conversations.add(r.conversationId);
      else if (r.kind === "summary") emit({ type: "summary", conversationId: r.conversationId });
      else if (r.kind === "memory_links") emit({ type: "links", conversationId: r.conversationId });
    }
    if (index) emit({ type: "conversations" });
    for (const conversationId of conversations) emit({ type: "messages", conversationId });
  };

  const send = async (batch: ChatPatch[]) => {
    const unknown = batch
      .filter(
        (p) =>
          p.attempted || (!confirmed.has(patchKey(p)) && !p.create && !checked.has(patchKey(p)))
      )
      .map(patchKey);
    await refresh(unknown);
    const writes = [];
    const sent: ChatPatch[] = [];
    const creating = new Set<string>();
    for (const patch of batch) {
      const base = confirmed.get(patchKey(patch));
      const write = toWrite(base, patch);
      if (write === undefined) {
        if (patch.delete) inflight.delete(patchKey(patch));
        else drop(patch, "missing");
        continue;
      }
      if (write === null) {
        inflight.delete(patchKey(patch));
        continue;
      }
      const parent = key("conversation", write.record.conversationId);
      if (
        write.record.kind !== "conversation" &&
        write.record.kind !== "project" &&
        !write.record.isDeleted &&
        !creating.has(write.record.conversationId) &&
        !confirmedLive(write.record.conversationId) &&
        (confirmed.has(parent) ||
          (checked.has(parent) && !pending.has(parent) && !inflight.has(parent)))
      ) {
        drop(patch, "conversation_deleted");
        continue;
      }
      if (write.record.kind === "conversation" && !write.record.isDeleted)
        creating.add(write.record.id);
      writes.push(write);
      sent.push(patch);
    }
    if (writes.length === 0) return;
    const results = await store.putMany(writes);
    results.forEach((snapshot, i) => {
      confirmed.set(patchKey(sent[i]), snapshot);
      checked.add(patchKey(sent[i]));
      inflight.delete(patchKey(sent[i]));
      if (snapshot.record.kind === "conversation" && snapshot.record.isDeleted)
        forgetConversation(snapshot.record.id);
    });
    channel?.postMessage("changed");
  };

  const confirmedLive = (conversationId: string) => {
    const conversation = confirmed.get(key("conversation", conversationId));
    return !!conversation && !conversation.record.isDeleted;
  };

  const backoff = (retryAfterMs?: number) => {
    failures++;
    const delay = retryAfterMs ?? Math.min(60_000, 1000 * 2 ** Math.min(failures - 1, 6));
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void flush();
    }, delay);
    return "wait" as const;
  };

  const handle = async (error: unknown, batch: ChatPatch[]): Promise<"retry" | "wait" | "stop"> => {
    const keys = batch.map(patchKey);
    if (!(error instanceof ChatStoreError)) {
      await refresh(keys).catch(() => undefined);
      return backoff();
    }
    if (terminalCodes.has(error.code ?? "")) {
      stopped = error.code;
      reportOutbox();
      return "stop";
    }
    if (error.code === "version_conflict" || error.code === "conversation_not_found") {
      await refresh([
        ...keys,
        ...batch.filter((p) => p.conversationId).map((p) => key("conversation", p.conversationId)),
      ]);
      return failures++ < 5 ? "retry" : backoff();
    }
    if (error.code === "private_chat_vector_limit_reached") {
      for (const p of batch) {
        const queued = pending.get(patchKey(p));
        if (queued?.embeddings)
          pending.set(patchKey(p), { ...queued, embeddings: undefined, embeddingModel: undefined });
      }
      emit({ type: "vector_quota" });
      return "retry";
    }
    if (
      error.code === "private_chat_storage_limit_reached" ||
      error.code === "invalid_record" ||
      error.status === 400
    ) {
      if (batch.length > 1) {
        isolate = batch.length;
        return "retry";
      }
      drop(batch[0], error.status === 413 ? "storage_quota" : "invalid");
      return "retry";
    }
    if (error.status === 429) return backoff(error.retryAfterMs);
    await refresh(keys).catch(() => undefined);
    return backoff();
  };

  const drain = async () => {
    await ready();
    while (pending.size > 0 && !stopped && !closed) {
      const batch = nextBatch(pending.values(), isolate > 0 ? 1 : undefined);
      for (const patch of batch) {
        pending.delete(patchKey(patch));
        inflight.set(patchKey(patch), patch);
      }
      try {
        await send(batch);
        failures = 0;
        if (isolate > 0) isolate--;
      } catch (error) {
        restore(batch);
        const outcome = await handle(error, batch);
        if (outcome !== "retry") break;
      } finally {
        reportOutbox();
      }
    }
    await persist();
  };

  const flush = (): Promise<void> => {
    flushing ??= drain()
      .catch(() => {
        backoff();
      })
      .finally(() => {
        flushing = null;
      });
    return flushing;
  };

  const forget = (k: string) => {
    confirmed.delete(k);
    checked.delete(k);
  };

  const forgetConversation = (conversationId: string) => {
    threads.delete(conversationId);
    for (const [k, snapshot] of confirmed)
      if (snapshot.record.conversationId === conversationId) forget(k);
    for (const [k, patch] of pending)
      if (patch.conversationId === conversationId && !patch.delete) pending.delete(k);
  };

  const evict = () => {
    while (threads.size > threadLimit) {
      const [oldest] = threads.keys();
      threads.delete(oldest);
      for (const [k, snapshot] of confirmed)
        if (
          snapshot.record.kind === "message" &&
          snapshot.record.conversationId === oldest &&
          !pending.has(k) &&
          !inflight.has(k)
        )
          forget(k);
    }
  };

  const loadThread = (conversationId: string): Promise<void> => {
    const known = threads.get(conversationId);
    if (known) {
      threads.delete(conversationId);
      threads.set(conversationId, known);
      return known;
    }
    const loading = (async () => {
      if (!confirmedLive(conversationId)) return;
      let page: string | undefined;
      do {
        const result = await store.list({
          kind: "message",
          conversationId,
          limit: 200,
          ...(page ? { cursor: page } : {}),
        });
        result.items.forEach(merge);
        page = result.nextCursor;
      } while (page);
    })();
    loading.catch(() => threads.delete(conversationId));
    threads.set(conversationId, loading);
    evict();
    return loading;
  };

  const applyRemote = (snapshot: ChatSnapshot) => {
    const { record } = snapshot;
    const k = key(record.kind, record.id);
    if (record.kind === "conversation") {
      if (!merge(snapshot)) return;
      if (record.isDeleted) forgetConversation(record.id);
      announce([record]);
      return;
    }
    if (record.kind === "project") return;
    const relevant =
      threads.has(record.conversationId) ||
      confirmed.has(k) ||
      (checked.has(k) && record.kind !== "message");
    if (relevant && merge(snapshot)) announce([record]);
  };

  const poll = (): Promise<void> => {
    polling ??= (async () => {
      await ready();
      let next = cursor ?? "";
      for (;;) {
        const page = await store.changes(next || undefined, { limit: 200 });
        page.items.forEach(applyRemote);
        next = page.nextCursor ?? page.changesCursor;
        if (!page.nextCursor) break;
      }
      cursor = next;
      pollFailures = 0;
    })()
      .catch(() => {
        pollFailures++;
      })
      .finally(() => {
        polling = null;
        schedulePoll();
      });
    return polling;
  };

  const schedulePoll = () => {
    clearTimeout(pollTimer);
    pollTimer = undefined;
    if (closed || pollIntervalMs <= 0 || !activity.isActive()) return;
    const delay = pollFailures
      ? Math.min(300_000, pollIntervalMs * 2 ** Math.min(pollFailures, 3))
      : pollIntervalMs;
    pollTimer = setTimeout(() => void poll(), delay);
  };

  const ready = (): Promise<void> => {
    readyPromise ??= (async () => {
      const account = await store.account();
      cursor = account.changesCursor ?? "";
      let page: string | undefined;
      do {
        const result = await store.list({
          kind: "conversation",
          limit: 200,
          ...(page ? { cursor: page } : {}),
        });
        result.items.forEach(merge);
        page = result.nextCursor;
      } while (page);
      if (options.outbox) {
        for (const patch of await loadOutbox(options.outbox.storage, options.outbox.seal.decrypt)) {
          const k = patchKey(patch);
          if (!pending.has(k)) pending.set(k, patch);
          seq = Math.max(seq, patch.seq);
        }
        if (pending.size) scheduleFlush();
      }
      schedulePoll();
    })();
    readyPromise.catch(() => {
      readyPromise = null;
    });
    return readyPromise;
  };

  const unsubscribeActivity = activity.subscribe(() => {
    if (!activity.isActive()) return;
    void poll();
    if (pending.size && !flushing) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
      void flush();
    }
  });
  if (channel) channel.onmessage = () => void poll();

  const conversation = async (conversationId: string): Promise<ChatRecord | undefined> => {
    await ready();
    const k = key("conversation", conversationId);
    if (!view(k) && !checked.has(k)) {
      const found = await store.get("conversation", conversationId);
      checked.add(k);
      if (found) merge(found);
    }
    return view(k);
  };

  const message = async (uniqueId: string): Promise<ChatRecord | undefined> => {
    await ready();
    const k = key("message", uniqueId);
    if (!view(k) && !checked.has(k)) {
      const found = await store.get("message", uniqueId);
      checked.add(k);
      if (found) merge(found);
    }
    const record = view(k);
    return record && !record.isDeleted && conversationLive(record.conversationId)
      ? record
      : undefined;
  };

  const child = async (kind: "summary" | "memory_links", conversationId: string) => {
    await ready();
    const k = key(kind, conversationId);
    if (!view(k) && !checked.has(k) && conversationLive(conversationId)) {
      const found = await store.get(kind, conversationId);
      checked.add(k);
      if (found) merge(found);
    }
    return view(k);
  };

  const thread = async (conversationId: string): Promise<ChatRecord[]> => {
    await ready();
    if (!conversationLive(conversationId)) return [];
    await loadThread(conversationId);
    return all("message", conversationId).sort(
      (a, b) => a.sortKey - b.sortKey || a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1)
    );
  };

  const ensureConversation = async (conversationId: string) => {
    const existing = await conversation(conversationId);
    if (existing?.isDeleted) throw new Error("Conversation was deleted");
    if (!existing) await backend.createConversation({ conversationId });
  };

  const storedMessage = async (uniqueId: string) => {
    const record = await message(uniqueId);
    return record ? toMessage(record) : null;
  };

  const patchMessage = async (
    uniqueId: string,
    patch: Pick<ChatPatch, "set" | "embeddings" | "embeddingModel">
  ): Promise<StoredMessage | null> => {
    const record = await message(uniqueId);
    if (!record) return null;
    await enqueue({
      kind: "message",
      id: uniqueId,
      conversationId: record.conversationId,
      ...patch,
    });
    emit({ type: "messages", conversationId: record.conversationId });
    const updated = view(key("message", uniqueId));
    return updated && !updated.isDeleted ? toMessage(updated) : null;
  };

  const observable = <T>(read: () => Promise<T>, matches: (event: VaultChatEvent) => boolean) =>
    ({
      subscribe(observer) {
        let active = true;
        const push = () =>
          read().then(
            (value) => active && observer.next(value),
            (error) => active && observer.error?.(error)
          );
        const off = backend.subscribe((event) => {
          if (matches(event)) void push();
        });
        void push();
        return {
          unsubscribe: () => {
            active = false;
            off();
          },
        };
      },
    }) satisfies ChatStorageObservable<T>;

  const backend: VaultChatBackend = {
    async getConversation(conversationId) {
      const record = await conversation(conversationId);
      return record && !record.isDeleted ? toConversation(record) : null;
    },
    async getConversations(query?: ConversationQueryOptions) {
      await ready();
      return all("conversation")
        .map(toConversation)
        .filter(
          (c) =>
            query?.projectId === undefined ||
            (query.projectId === null ? !c.projectId : c.projectId === query.projectId)
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    async createConversation(
      create?: CreateConversationOptions,
      defaultTitle = "New Conversation"
    ) {
      const conversationId = create?.conversationId || generateConversationId();
      const existing = await conversation(conversationId);
      if (existing?.isDeleted) throw new Error("Conversation was deleted");
      if (existing) return toConversation(existing);
      const at = now();
      await enqueue({
        kind: "conversation",
        id: conversationId,
        conversationId: "",
        create: {
          sortKey: at,
          createdAt: at,
          data: plain({
            title: create?.title || defaultTitle,
            projectId: create?.projectId,
            lastActivityAt: at,
          }),
        },
      });
      emit({ type: "conversations" });
      return toConversation(view(key("conversation", conversationId))!);
    },
    async updateConversationTitle(conversationId, title) {
      return updateConversation(conversationId, { title });
    },
    async updateConversationProject(conversationId, projectId) {
      return updateConversation(conversationId, { projectId });
    },
    async updateConversationPinned(conversationId, pinned) {
      return updateConversation(conversationId, { pinnedAt: pinned ? now() : null });
    },
    async deleteConversation(conversationId) {
      const record = await conversation(conversationId);
      if (!record || record.isDeleted) return false;
      for (const [k, patch] of pending)
        if (patch.conversationId === conversationId) pending.delete(k);
      await enqueue({ kind: "conversation", id: conversationId, conversationId: "", delete: true });
      threads.delete(conversationId);
      emit({ type: "conversations" });
      emit({ type: "messages", conversationId });
      return true;
    },
    observeConversations(query) {
      return observable(
        () => backend.getConversations(query),
        (event) => event.type === "conversations"
      );
    },
    async getMessages(conversationId) {
      return (await thread(conversationId)).map(toMessage);
    },
    async getMessagesPage(conversationId, page: GetMessagesPageOptions) {
      const limit = Math.floor(page.limit);
      if (!Number.isFinite(limit) || limit < 1) return [];
      const exclude = new Set(page.boundaryExcludeUniqueIds ?? []);
      const records = (await thread(conversationId)).filter(
        (r) =>
          page.beforeMessageId === undefined ||
          (exclude.size > 0 ? r.sortKey <= page.beforeMessageId : r.sortKey < page.beforeMessageId)
      );
      return records
        .filter((r) => !exclude.has(r.id))
        .slice(-limit)
        .map(toMessage);
    },
    async getMessageSkeletons(conversationId): Promise<MessageSkeleton[]> {
      return toSkeletons(await thread(conversationId));
    },
    async getMessageCount(conversationId) {
      return (await thread(conversationId)).length;
    },
    async getToolCallEventIds(conversationId) {
      const ids = new Set<string>();
      for (const record of await thread(conversationId)) {
        const events = record.data.toolCallEvents;
        if (!Array.isArray(events)) continue;
        for (const event of events)
          if (
            event &&
            typeof event === "object" &&
            !Array.isArray(event) &&
            typeof event.id === "string"
          )
            ids.add(event.id);
      }
      return ids;
    },
    async createMessage(create) {
      await ensureConversation(create.conversationId);
      await thread(create.conversationId);
      if (create.uniqueId) {
        const existing = view(key("message", create.uniqueId));
        if (existing && !existing.isDeleted) return toMessage(existing);
      }
      const uniqueId = create.uniqueId ?? `msg_${uuidv7()}`;
      const highest = Math.max(
        0,
        ...all("message", create.conversationId, true).map((r) => r.sortKey)
      );
      const at = now();
      const vector = acceptedVector(create.vector);
      await enqueue({
        kind: "message",
        id: uniqueId,
        conversationId: create.conversationId,
        create: {
          sortKey: Math.max(at * 1000, highest + 1),
          createdAt: at,
          data: messageData(create),
        },
        ...(vector ? { embeddings: [vector] } : {}),
        ...(vector && create.embeddingModel ? { embeddingModel: create.embeddingModel } : {}),
      });
      await enqueue({
        kind: "conversation",
        id: create.conversationId,
        conversationId: "",
        set: { lastActivityAt: at },
      });
      emit({ type: "messages", conversationId: create.conversationId });
      emit({ type: "conversations" });
      return toMessage(view(key("message", uniqueId))!);
    },
    async upsertMessage(upsert) {
      await ensureConversation(upsert.conversationId);
      await thread(upsert.conversationId);
      const existing = view(key("message", upsert.uniqueId));
      if (!existing || existing.isDeleted) return backend.createMessage(upsert);
      const vector = acceptedVector(upsert.vector);
      return (await patchMessage(upsert.uniqueId, {
        set: resumedFields(upsert),
        ...(vector ? { embeddings: [vector] } : {}),
        ...(vector && upsert.embeddingModel ? { embeddingModel: upsert.embeddingModel } : {}),
      }))!;
    },
    async updateMessageEmbedding(uniqueId, vector, embeddingModel) {
      const embedding = acceptedVector(vector);
      if (!embedding) return storedMessage(uniqueId);
      return patchMessage(uniqueId, {
        set: { embeddingModel, chunkOffsets: null },
        embeddings: [embedding],
        embeddingModel,
      });
    },
    async updateMessageChunks(uniqueId, chunks, embeddingModel) {
      const fitted = fitChunks(chunks);
      if (!fitted) return storedMessage(uniqueId);
      return patchMessage(uniqueId, {
        set: {
          embeddingModel,
          chunkOffsets: fitted.map((c) => [c.startOffset, c.endOffset]),
        },
        embeddings: fitted.map((c) => c.vector),
        embeddingModel,
      });
    },
    async updateMessageError(uniqueId, error) {
      return patchMessage(uniqueId, { set: { error } });
    },
    async updateMessageFeedback(uniqueId, feedback: MessageFeedback) {
      return patchMessage(uniqueId, { set: { feedback } });
    },
    async updateMessageFileIds(uniqueId, fileIds) {
      return patchMessage(uniqueId, { set: { fileIds } });
    },
    async clearMessages(conversationId) {
      for (const record of await thread(conversationId))
        await enqueue({ kind: "message", id: record.id, conversationId, delete: true });
      emit({ type: "messages", conversationId });
    },
    async deleteMessage(uniqueId) {
      const record = await message(uniqueId);
      if (!record) return null;
      await enqueue({
        kind: "message",
        id: uniqueId,
        conversationId: record.conversationId,
        delete: true,
      });
      emit({ type: "messages", conversationId: record.conversationId });
      return uniqueId;
    },
    observeMessages(conversationId) {
      return observable(
        () => backend.getMessages(conversationId),
        (event) => event.type === "messages" && event.conversationId === conversationId
      );
    },
    async getAllFiles(query?: Parameters<typeof getAllFilesOp>[1]) {
      await ready();
      if (query?.conversationId) await loadThread(query.conversationId);
      const files: StoredFileWithContext[] = [];
      for (const record of all("message", query?.conversationId)) {
        if (!conversationLive(record.conversationId)) continue;
        const stored = toMessage(record);
        for (const file of stored.files ?? [])
          files.push({
            ...file,
            conversationId: record.conversationId,
            createdAt: stored.createdAt,
            messageRole: stored.role,
          });
      }
      files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return query?.limit ? files.slice(0, query.limit) : files;
    },
    async write<T>(fn: (adapter: ChatStorageAdapter) => Promise<T>) {
      return fn(backend);
    },
    async searchChunks(queryVector, search: ChatChunkSearchOptions = {}) {
      const { limit = 10, minSimilarity = 0.5, conversationId, excludeConversationId } = search;
      const vector = acceptedVector(queryVector);
      if (!vector) return [];
      await flush();
      const hits = await store.search(vector, {
        limit: Math.min(50, limit * 3),
        kinds: ["message"],
        ...(conversationId ? { conversationId } : {}),
      });
      search.onStats?.({ rowsScanned: hits.length, rowsFetched: hits.length, cacheHits: 0 });
      const results: ChunkSearchResult[] = [];
      for (const hit of hits) {
        const model = hit.record.data.embeddingModel;
        if (
          hit.score < minSimilarity ||
          hit.record.conversationId === excludeConversationId ||
          (search.embeddingModel && typeof model === "string" && model !== search.embeddingModel)
        )
          continue;
        const stored = toMessage(hit.record);
        const span = chunkOffsets(hit.record)?.[hit.chunk];
        results.push({
          chunkText: span ? stored.content.slice(span[0], span[1]) : stored.content,
          message: stored,
          similarity: hit.score,
        });
        if (results.length >= limit) break;
      }
      return results;
    },
    async getSummary(conversationId): Promise<StoredConversationSummary | null> {
      const record = await child("summary", conversationId);
      return record && !record.isDeleted && record.data.summarizedUpTo ? toSummary(record) : null;
    },
    async upsertSummary(conversationId, summary, summarizedUpTo, tokenCount) {
      await child("summary", conversationId);
      const data = { summary, summarizedUpTo, tokenCount };
      await enqueue({
        kind: "summary",
        id: conversationId,
        conversationId,
        create: { sortKey: 0, createdAt: now(), data },
        set: data,
      });
      emit({ type: "summary", conversationId });
      return toSummary(view(key("summary", conversationId))!);
    },
    async deleteSummary(conversationId) {
      const record = await child("summary", conversationId);
      if (!record || record.isDeleted) return;
      await enqueue({
        kind: "summary",
        id: conversationId,
        conversationId,
        set: { summary: "", summarizedUpTo: "", tokenCount: 0 },
      });
      emit({ type: "summary", conversationId });
    },
    async getMemoryLinks(conversationId) {
      const record = await child("memory_links", conversationId);
      return record && !record.isDeleted ? toLinks(record) : [];
    },
    async addMemoryLinks(conversationId, items) {
      if (!conversationId || items.length === 0) return;
      await child("memory_links", conversationId);
      await enqueue({
        kind: "memory_links",
        id: conversationId,
        conversationId,
        create: { sortKey: 0, createdAt: now(), data: { links: [] } },
        linkOps: [{ add: items.map((i) => ({ memoryId: i.memoryId, score: i.score })), at: now() }],
      });
      emit({ type: "links", conversationId });
    },
    async clearMemoryLinks(conversationId) {
      const record = await child("memory_links", conversationId);
      if (!record || record.isDeleted) return;
      await enqueue({
        kind: "memory_links",
        id: conversationId,
        conversationId,
        linkOps: [{ clear: true }],
      });
      emit({ type: "links", conversationId });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    flush,
    poll,
    status: () => ({ pending: pending.size + inflight.size, ...(stopped ? { stopped } : {}) }),
    close() {
      closed = true;
      clearTimeout(flushTimer);
      clearTimeout(retryTimer);
      clearTimeout(pollTimer);
      unsubscribeActivity();
      channel?.close();
      listeners.clear();
    },
  };

  const updateConversation = async (conversationId: string, set: ChatData) => {
    const record = await conversation(conversationId);
    if (!record || record.isDeleted) return false;
    await enqueue({ kind: "conversation", id: conversationId, conversationId: "", set });
    emit({ type: "conversations" });
    return true;
  };

  void ready().catch(() => undefined);
  return backend;
}

/** A {@link ChatBackendFactory} that hands `useChatStorage` the same vault backend for every signer. */
export function vaultChatBackend(backend: VaultChatBackend): ChatBackendFactory {
  return () => backend;
}
