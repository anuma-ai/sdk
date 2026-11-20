import {
  type ChatAttachment,
  type ChatJson,
  type ChatRecord,
  type ChatSnapshot,
  type ChatStore,
  ChatStoreError,
} from "./types.js";
import {
  attachmentIdPattern,
  plaintextBytes,
  uploadWindowMs,
  type VaultAttachmentJournal,
  type VaultAttachments,
  type VaultAttachmentSource,
} from "./vaultAttachments.js";
import { isObject, plain } from "./vaultRecords.js";

export interface MediaItemInput {
  /** The device's id for the file, such as `StoredMedia.mediaId`; the vault id is derived from it. */
  localId: string;
  name: string;
  mimeType: string;
  /** The feature that made the file, such as `upload`, `studio` or `voice`. */
  source: string;
  createdAt?: number;
  metadata?: { [key: string]: ChatJson };
}

/** A library file whose encrypted bytes vault holds as an attachment. */
export interface MediaItem {
  id: string;
  localId: string;
  name: string;
  mimeType: string;
  size: number;
  source: string;
  metadata?: { [key: string]: ChatJson };
  attachmentId: string;
  createdAt: number;
  updatedAt: number;
}

export interface VaultMediaLibraryOptions {
  store: ChatStore;
  attachments: VaultAttachments;
  /** A `createVaultRealtime` source for `private_chats`; each report catches up and tells subscribers about remote changes. */
  subscribeChanges?: (onChange: (connected: boolean) => void) => () => void;
  now?: () => number;
}

/** The account's library files in vault: list, store, read and delete them on any device. */
export interface VaultMediaLibrary {
  /** False when vault does not store media: `list` is empty, `read` null, `delete` false and `create` rejects with `media_unsupported`. */
  readonly enabled: boolean;
  /** Live items, newest first, after catching up with changes from other devices. */
  list(signal?: AbortSignal): Promise<MediaItem[]>;
  /** Stores a file once per `localId`; rejects with `media_deleted` when the item was deleted on any device. */
  create(
    item: MediaItemInput,
    bytes: Uint8Array | Blob | VaultAttachmentSource,
    signal?: AbortSignal
  ): Promise<MediaItem>;
  /** The decrypted bytes, or null when the item is gone or its upload has not finished. */
  read(id: string, signal?: AbortSignal): Promise<Uint8Array | null>;
  /** Deletes an item on every device; false when it was already gone. */
  delete(id: string, signal?: AbortSignal): Promise<boolean>;
  subscribe(listener: (event: { origin: "local" | "remote" }) => void): () => void;
  close(): void;
}

export interface LocalMediaItem extends MediaItemInput {
  read(): Promise<Uint8Array | Blob | VaultAttachmentSource | null>;
}

export interface MediaSeedOptions {
  store: ChatStore;
  attachments: VaultAttachments;
  /** Keeps each item's reservation so a rerun after a crash resumes it instead of uploading again. */
  journal: VaultAttachmentJournal;
  items: readonly LocalMediaItem[];
  /** Uploads at most this many files per run; rerun while `remaining` is above 0. Defaults to 20. */
  maxUploads?: number;
  now?: () => number;
  signal?: AbortSignal;
}

export interface MediaSeedResult {
  uploaded: number;
  /** Local ids of items deleted on another device. */
  deleted: string[];
  missing: string[];
  oversized: string[];
  /** Local ids another run may still be uploading; rerun after 16 minutes. */
  deferred: string[];
  /** Items left for the next run after `maxUploads` was reached. */
  remaining: number;
}

interface Candidate {
  id: string;
  size: number;
  committed: boolean;
  createdAt?: string;
}

interface MediaWriter {
  store: ChatStore;
  attachments: VaultAttachments;
  journal?: VaultAttachmentJournal;
  now: () => number;
  signal?: AbortSignal;
}

const maxWriteAttempts = 4;

/** The vault record id of a library file: a keyed hash of its device id, so vault cannot tell it and reruns agree on it. */
export async function mediaItemId(
  store: Pick<ChatStore, "sealedId">,
  localId: string
): Promise<string> {
  if (!store.sealedId) throw new Error("Media ids need a chat store that seals ids");
  return store.sealedId(`media\u0000${localId}`);
}

function mediaDeleted(): ChatStoreError {
  return new ChatStoreError("Media item was deleted", 409, "media_deleted");
}

function mediaUnsupported(): ChatStoreError {
  return new ChatStoreError("Vault does not store media", 0, "media_unsupported");
}

function journalKey(id: string): string {
  return JSON.stringify(["media", id]);
}

function recordedAttachment(snapshot: ChatSnapshot | null | undefined): string | undefined {
  const value = snapshot?.record.data.attachmentId;
  return typeof value === "string" ? value : undefined;
}

function toCandidate(attachment: ChatAttachment | null | undefined): Candidate | null {
  return attachment
    ? {
        id: attachment.id,
        size: plaintextBytes(attachment.sizeBytes),
        committed: attachment.state === "committed",
        createdAt: attachment.createdAt,
      }
    : null;
}

function toMediaItem(snapshot: ChatSnapshot): MediaItem | null {
  const { record } = snapshot;
  const { attachmentId, localId, name, mimeType, size, source, metadata } = record.data;
  if (
    record.isDeleted ||
    typeof attachmentId !== "string" ||
    !attachmentIdPattern.test(attachmentId) ||
    typeof localId !== "string" ||
    typeof name !== "string" ||
    typeof mimeType !== "string" ||
    typeof source !== "string" ||
    typeof size !== "number" ||
    !Number.isSafeInteger(size) ||
    size < 0 ||
    (metadata !== undefined && !isObject(metadata))
  )
    return null;
  return {
    id: record.id,
    localId,
    name,
    mimeType,
    size,
    source,
    ...(metadata ? { metadata: metadata as { [key: string]: ChatJson } } : {}),
    attachmentId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mediaRecord(
  id: string,
  item: MediaItemInput,
  attachment: Candidate,
  current: ChatSnapshot | null,
  at: number
): ChatRecord {
  const createdAt = current?.record.createdAt ?? item.createdAt ?? at;
  return {
    kind: "media",
    id,
    conversationId: "",
    sortKey: createdAt,
    createdAt,
    updatedAt: Math.max(at, (current?.record.updatedAt ?? 0) + 1),
    isDeleted: false,
    data: plain({
      localId: item.localId,
      name: item.name,
      mimeType: item.mimeType,
      size: attachment.size,
      source: item.source,
      attachmentId: attachment.id,
      metadata: item.metadata,
    }),
  };
}

async function storeMedia(
  writer: MediaWriter,
  item: MediaItemInput,
  read: () => Promise<Uint8Array | Blob | VaultAttachmentSource | null>,
  known?: ChatSnapshot | null
): Promise<{ snapshot: ChatSnapshot; uploaded: boolean } | "busy" | "missing"> {
  const { store, attachments, journal, now, signal } = writer;
  const id = await mediaItemId(store, item.localId);
  const key = journalKey(id);
  const lookup = async (attachmentId: string | null | undefined) =>
    toCandidate(
      attachmentId && attachmentIdPattern.test(attachmentId)
        ? (await store.attachments.get(attachmentId, signal))?.attachment
        : null
    );
  const uploading = (candidate: Candidate) =>
    candidate.createdAt !== undefined && now() < Date.parse(candidate.createdAt) + uploadWindowMs;
  const deleted = async (stray: Candidate | null) => {
    if (stray) await attachments.delete(stray.id, signal);
    await journal?.set(key, null);
    return mediaDeleted();
  };

  let current = known === undefined ? await store.get("media", id, signal) : known;
  let next = await lookup(await journal?.get(key));
  if (current?.record.isDeleted) throw await deleted(next);
  if (current && next?.id !== recordedAttachment(current)) {
    if (next) {
      if (uploading(next)) return "busy";
      await attachments.delete(next.id, signal);
    }
    next = await lookup(recordedAttachment(current));
  }
  let uploaded = false;
  for (let attempt = 1; ; attempt++) {
    if (!next) {
      const source = await read();
      if (!source) return "missing";
      const attachmentId = await attachments.upload(source, {
        signal,
        onReserved: (reserved) => journal?.set(key, reserved),
      });
      next = {
        id: attachmentId,
        size: source instanceof Uint8Array ? source.length : source.size,
        committed: false,
      };
      uploaded = true;
    }
    if (recordedAttachment(current) !== next.id) {
      try {
        [current] = await store.putMany(
          [
            {
              record: mediaRecord(id, item, next, current, now()),
              expectedVersion: current?.version ?? 0,
            },
          ],
          signal
        );
      } catch (error) {
        if (
          !(error instanceof ChatStoreError) ||
          error.code !== "version_conflict" ||
          attempt >= maxWriteAttempts
        )
          throw error;
        const latest = await store.get("media", id, signal);
        if (!latest || latest.record.isDeleted) throw await deleted(next);
        const theirs = recordedAttachment(latest);
        if (theirs !== next.id && theirs !== recordedAttachment(current)) {
          await attachments.delete(next.id, signal);
          next = await lookup(theirs);
        }
        current = latest;
        continue;
      }
    }
    if (!next.committed) {
      try {
        await attachments.commit(next.id, { kind: "media", id });
      } catch (error) {
        if (!(error instanceof ChatStoreError) || attempt >= maxWriteAttempts) throw error;
        if (error.code === "attachment_owner_not_found") throw await deleted(next);
        if (error.code === "attachment_not_uploaded") {
          if (uploading(next)) return "busy";
          await attachments.delete(next.id, signal);
        } else if (error.status !== 404) throw error;
        next = null;
        continue;
      }
    }
    await journal?.set(key, null);
    return { snapshot: current!, uploaded };
  }
}

/** Creates the media library for one account; build a new one after a wallet or key change. */
export function createVaultMediaLibrary(options: VaultMediaLibraryOptions): VaultMediaLibrary {
  const { store, attachments } = options;
  const now = options.now ?? Date.now;
  const enabled = store.mediaAttachments === true;
  const latest = new Map<string, ChatSnapshot>();
  const listeners = new Set<(event: { origin: "local" | "remote" }) => void>();
  let cursor: string | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  const emit = (origin: "local" | "remote") => {
    for (const listener of [...listeners]) listener({ origin });
  };

  const merge = (snapshot: ChatSnapshot) => {
    const known = latest.get(snapshot.record.id);
    if (known && known.version >= snapshot.version) return false;
    latest.set(snapshot.record.id, snapshot);
    return true;
  };

  const catchUp = (signal?: AbortSignal): Promise<boolean> => {
    const pages = async () => {
      let changed = false;
      for (;;) {
        const page = await store.changes(cursor, { kinds: ["media"], limit: 200, signal });
        for (const item of page.items) if (merge(item)) changed = true;
        cursor = page.nextCursor ?? page.changesCursor;
        if (!page.nextCursor) return changed;
      }
    };
    const next = queue.then(async () => {
      try {
        return await pages();
      } catch (error) {
        if (!(error instanceof ChatStoreError) || (error.status !== 400 && error.status !== 410))
          throw error;
        latest.clear();
        cursor = undefined;
        await pages();
        return true;
      }
    });
    queue = next.catch(() => undefined);
    return next;
  };

  const stopChanges =
    enabled && options.subscribeChanges
      ? options.subscribeChanges((connected) => {
          if (!connected) return;
          catchUp().then(
            (changed) => {
              if (changed) emit("remote");
            },
            () => undefined
          );
        })
      : undefined;

  return {
    enabled,
    async list(signal) {
      if (!enabled) return [];
      await catchUp(signal);
      return [...latest.values()]
        .map(toMediaItem)
        .filter((item): item is MediaItem => item !== null)
        .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? -1 : 1));
    },
    async create(item, bytes, signal) {
      if (!enabled) throw mediaUnsupported();
      const stored = await storeMedia({ store, attachments, now, signal }, item, () =>
        Promise.resolve(bytes)
      );
      if (typeof stored === "string")
        throw new ChatStoreError("Media item is uploading elsewhere", 409, "media_busy");
      merge(stored.snapshot);
      emit("local");
      return toMediaItem(stored.snapshot)!;
    },
    async read(id, signal) {
      if (!enabled) return null;
      let snapshot = latest.get(id);
      if (!snapshot) {
        const found = await store.get("media", id, signal);
        if (found) merge(found);
        snapshot = found ?? undefined;
      }
      const item = snapshot ? toMediaItem(snapshot) : null;
      return item ? attachments.read(item.attachmentId, signal) : null;
    },
    async delete(id, signal) {
      if (!enabled) return false;
      for (let attempt = 1; ; attempt++) {
        const current = await store.get("media", id, signal);
        if (!current || current.record.isDeleted) {
          if (current) merge(current);
          return false;
        }
        try {
          const [saved] = await store.putMany(
            [
              {
                record: {
                  ...current.record,
                  isDeleted: true,
                  updatedAt: Math.max(now(), current.record.updatedAt + 1),
                  data: {},
                },
                expectedVersion: current.version,
              },
            ],
            signal
          );
          merge(saved);
        } catch (error) {
          if (
            !(error instanceof ChatStoreError) ||
            error.code !== "version_conflict" ||
            attempt >= maxWriteAttempts
          )
            throw error;
          continue;
        }
        const attachmentId = recordedAttachment(current);
        if (attachmentId) await attachments.delete(attachmentId).catch(() => undefined);
        emit("local");
        return true;
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      stopChanges?.();
      listeners.clear();
    },
  };
}

/** Uploads this device's library files that vault lacks, at most `maxUploads` per run; safe to rerun after a crash without uploading a file twice. */
export async function seedMediaToVault(options: MediaSeedOptions): Promise<MediaSeedResult> {
  const { store, attachments, journal, signal } = options;
  if (!store.mediaAttachments) throw mediaUnsupported();
  const writer: MediaWriter = { store, attachments, journal, now: options.now ?? Date.now, signal };
  const maxUploads = options.maxUploads ?? 20;
  const result: MediaSeedResult = {
    uploaded: 0,
    deleted: [],
    missing: [],
    oversized: [],
    deferred: [],
    remaining: 0,
  };
  const ids = await Promise.all(options.items.map((item) => mediaItemId(store, item.localId)));
  const found = new Map(
    (
      await store.getMany(
        ids.map((id) => ({ kind: "media" as const, id })),
        signal
      )
    ).map((snapshot) => [snapshot.record.id, snapshot])
  );
  for (const [i, item] of options.items.entries()) {
    signal?.throwIfAborted();
    const known = found.get(ids[i]) ?? null;
    if (known && !known.record.isDeleted && !(await journal.get(journalKey(ids[i])))) continue;
    if (!known?.record.isDeleted && result.uploaded >= maxUploads) {
      result.remaining++;
      continue;
    }
    try {
      const stored = await storeMedia(writer, item, () => item.read(), known);
      if (stored === "missing") result.missing.push(item.localId);
      else if (stored === "busy") result.deferred.push(item.localId);
      else if (stored.uploaded) result.uploaded++;
    } catch (error) {
      if (!(error instanceof ChatStoreError)) throw error;
      if (error.code === "media_deleted") result.deleted.push(item.localId);
      else if (error.code === "attachment_too_large") result.oversized.push(item.localId);
      else throw error;
    }
  }
  return result;
}
