import type { VaultAttachmentRef } from "../db/chat/types";
import type { MemoryKeyRing } from "../memory/store/memoryKeys";
import {
  type ChatAttachment,
  type ChatAttachmentOwnerKind,
  type ChatMultipartAttachments,
  type ChatPresignedUrl,
  type ChatRecord,
  type ChatStore,
  ChatStoreError,
} from "./types";
import { plain } from "./vaultRecords";

const frameVersion = 1;
const chunkedFrameVersion = 2;
const ivBytes = 12;
const tagBytes = 16;
const frameOverhead = 1 + ivBytes + tagBytes;
const maxCiphertextBytes = 50 * 1024 * 1024;
const chunkOverhead = ivBytes + tagBytes;
const chunkPlaintextBytes = 1024 * 1024;
const chunkCiphertextBytes = chunkPlaintextBytes + chunkOverhead;
const downloadWindowChunks = 4;
const partUrlBatch = 8;
const expirySkewMs = 30_000;
const maxRetryAfterMs = 30_000;
const maxRefWrites = 5;
export const uploadWindowMs = 16 * 60_000;
export const attachmentIdPattern = /^[0-9a-f]{32}$/;

/** The largest file vault stores in one encrypted frame; larger files need vault to take parts. */
export const maxVaultAttachmentBytes = maxCiphertextBytes - frameOverhead;

function chunkCount(plaintext: number): number {
  return Math.max(1, Math.ceil(plaintext / chunkPlaintextBytes));
}

function chunkedSize(plaintext: number): number {
  return 1 + plaintext + chunkOverhead * chunkCount(plaintext);
}

export function plaintextBytes(sizeBytes: number): number {
  if (sizeBytes <= maxCiphertextBytes) return sizeBytes - frameOverhead;
  return sizeBytes - 1 - chunkOverhead * Math.ceil((sizeBytes - 1) / chunkCiphertextBytes);
}

/** A file read in pieces, so a large upload never holds the whole file in memory. */
export interface VaultAttachmentSource {
  size: number;
  read(offset: number, length: number): Promise<Uint8Array>;
}

/** Where a streamed download writes decrypted bytes, in order. */
export interface VaultAttachmentSink {
  write(bytes: Uint8Array): void | Promise<void>;
}

/** Device-side store for decrypted attachment bytes, keyed by vault attachment id. */
export interface VaultAttachmentCache {
  get(attachmentId: string): Promise<Uint8Array | null>;
  set(attachmentId: string, bytes: Uint8Array): Promise<void>;
  delete(attachmentId: string): Promise<void>;
}

export interface VaultAttachmentOwner {
  kind: ChatAttachmentOwnerKind;
  id: string;
}

export interface VaultAttachmentsOptions {
  store: ChatStore;
  keyRing: MemoryKeyRing;
  cache?: VaultAttachmentCache;
  fetch?: typeof globalThis.fetch;
  retries?: number;
  retryDelayMs?: number;
  now?: () => number;
}

export interface VaultAttachmentUploadOptions {
  signal?: AbortSignal;
  /** Runs before any bytes leave the device, again for each new reservation. */
  onReserved?: (attachmentId: string) => void | Promise<void>;
}

/** Encrypted chat attachments in vault: upload, bind to a message, read back on any device, delete. */
export interface VaultAttachments {
  /** Encrypts and uploads a file, in parts when it is over 50 MiB and vault takes parts; the attachment stays pending until `commit`, and vault drops it after 24h. */
  upload(
    source: Uint8Array | Blob | VaultAttachmentSource,
    options?: VaultAttachmentUploadOptions
  ): Promise<string>;
  /** Binds an uploaded attachment to a message or summary that vault already holds. */
  commit(
    attachmentId: string,
    owner: VaultAttachmentOwner,
    signal?: AbortSignal
  ): Promise<ChatAttachment>;
  /** The decrypted bytes, or null when the attachment is gone or not yet committed. */
  read(attachmentId: string, signal?: AbortSignal): Promise<Uint8Array | null>;
  /** Downloads and decrypts into `sink` a few chunks at a time; false when the attachment is gone or not yet committed. */
  readTo(attachmentId: string, sink: VaultAttachmentSink, signal?: AbortSignal): Promise<boolean>;
  delete(attachmentId: string, signal?: AbortSignal): Promise<void>;
}

function additionalData(attachmentId: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`anuma-chat-attachment-v1:${attachmentId}`);
}

function chunkAdditionalData(
  attachmentId: string,
  index: number,
  last: boolean
): Uint8Array<ArrayBuffer> {
  const prefix = new TextEncoder().encode(`anuma-chat-attachment-v2:${attachmentId}`);
  const data = new Uint8Array(prefix.length + 5);
  data.set(prefix);
  new DataView(data.buffer).setUint32(prefix.length, index);
  data[prefix.length + 4] = last ? 1 : 0;
  return data;
}

function invalidAttachment(): never {
  throw new ChatStoreError("Attachment does not decrypt under this key", 0, "invalid_attachment");
}

function tooLarge(): never {
  throw new ChatStoreError("Attachment is larger than vault accepts", 413, "attachment_too_large");
}

function toSource(input: Uint8Array | Blob | VaultAttachmentSource): VaultAttachmentSource {
  if (input instanceof Uint8Array)
    return {
      size: input.length,
      read: (offset, length) => Promise.resolve(input.subarray(offset, offset + length)),
    };
  if ("read" in input) return input;
  return {
    size: input.size,
    read: async (offset, length) =>
      new Uint8Array(await input.slice(offset, offset + length).arrayBuffer()),
  };
}

function invalidSource(): never {
  throw new ChatStoreError(
    "Attachment source returned other bytes than its size",
    0,
    "invalid_source"
  );
}

async function readExactly(
  source: VaultAttachmentSource,
  offset: number,
  length: number
): Promise<Uint8Array> {
  const bytes = length > 0 ? await source.read(offset, length) : new Uint8Array(0);
  if (!(bytes instanceof Uint8Array) || bytes.length !== length) invalidSource();
  return bytes;
}

function sendableHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => name.toLowerCase() !== "content-length")
  );
}

function transientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function discardBody(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => undefined);
}

/** Creates the attachment client for one account and key; bytes are AES-GCM sealed with the ring's v3 key before upload. */
export function createVaultAttachments(options: VaultAttachmentsOptions): VaultAttachments {
  const { store, keyRing, cache } = options;
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  const retries = options.retries ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 500;
  const now = options.now ?? Date.now;

  const sleep = (ms: number, signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      signal?.throwIfAborted();
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(timer);
        reject(signal?.reason as Error);
      };
      signal?.addEventListener("abort", onAbort, { once: true });
    });

  const pause = (attempt: number, signal?: AbortSignal, atLeast = 0) =>
    sleep(Math.max(atLeast, retryDelayMs * 2 ** attempt), signal);

  const withRetry = async <T>(call: () => Promise<T>, signal?: AbortSignal): Promise<T> => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await call();
      } catch (error) {
        if (
          !(error instanceof ChatStoreError) ||
          !transientStatus(error.status) ||
          attempt >= retries ||
          (error.retryAfterMs ?? 0) > maxRetryAfterMs
        )
          throw error;
        await pause(attempt, signal, error.retryAfterMs);
      }
    }
  };

  const expired = (url: ChatPresignedUrl) => now() >= Date.parse(url.expiresAt) - expirySkewMs;

  const seal = async (bytes: Uint8Array, attachmentId: string) => {
    const iv = crypto.getRandomValues(new Uint8Array(ivBytes));
    const sealed = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: additionalData(attachmentId) },
        keyRing.v3,
        bytes as Uint8Array<ArrayBuffer>
      )
    );
    const frame = new Uint8Array(1 + ivBytes + sealed.length);
    frame[0] = frameVersion;
    frame.set(iv, 1);
    frame.set(sealed, 1 + ivBytes);
    return frame;
  };

  const open = async (frame: Uint8Array, attachmentId: string) => {
    if (frame.length < frameOverhead || frame[0] !== frameVersion) invalidAttachment();
    try {
      return new Uint8Array(
        await crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: frame.slice(1, 1 + ivBytes),
            additionalData: additionalData(attachmentId),
          },
          keyRing.v3,
          frame.slice(1 + ivBytes)
        )
      );
    } catch {
      return invalidAttachment();
    }
  };

  const put = async (
    upload: ChatPresignedUrl,
    body: Uint8Array<ArrayBuffer>,
    signal?: AbortSignal
  ): Promise<"stored" | "expired"> => {
    for (let attempt = 0; ; attempt++) {
      if (expired(upload)) return "expired";
      let response: Response;
      try {
        response = await fetcher(upload.url, {
          method: upload.method,
          headers: sendableHeaders(upload.headers),
          body,
          signal,
        });
      } catch (error) {
        if (signal?.aborted || attempt >= retries) throw error;
        await pause(attempt, signal);
        continue;
      }
      await discardBody(response);
      if (response.ok) return "stored";
      if (response.status === 403) return "expired";
      if (!transientStatus(response.status) || attempt >= retries)
        throw new ChatStoreError(
          `Attachment upload failed with ${response.status}`,
          response.status,
          "attachment_upload_failed"
        );
      await pause(attempt, signal);
    }
  };

  const sealChunk = async (
    plaintext: Uint8Array,
    attachmentId: string,
    index: number,
    last: boolean
  ) => {
    const iv = crypto.getRandomValues(new Uint8Array(ivBytes));
    const sealed = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: chunkAdditionalData(attachmentId, index, last) },
        keyRing.v3,
        plaintext as Uint8Array<ArrayBuffer>
      )
    );
    const chunk = new Uint8Array(ivBytes + sealed.length);
    chunk.set(iv);
    chunk.set(sealed, ivBytes);
    return chunk;
  };

  const openChunk = async (
    chunk: Uint8Array,
    attachmentId: string,
    index: number,
    last: boolean
  ) => {
    if (chunk.length < chunkOverhead) invalidAttachment();
    try {
      return new Uint8Array(
        await crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: chunk.slice(0, ivBytes),
            additionalData: chunkAdditionalData(attachmentId, index, last),
          },
          keyRing.v3,
          chunk.slice(ivBytes)
        )
      );
    } catch {
      return invalidAttachment();
    }
  };

  async function* chunks(
    source: VaultAttachmentSource,
    attachmentId: string,
    signal?: AbortSignal
  ) {
    yield Uint8Array.of(chunkedFrameVersion);
    const count = chunkCount(source.size);
    for (let index = 0; index < count; index++) {
      signal?.throwIfAborted();
      const offset = index * chunkPlaintextBytes;
      const length = Math.min(chunkPlaintextBytes, source.size - offset);
      yield sealChunk(
        await readExactly(source, offset, length),
        attachmentId,
        index,
        index === count - 1
      );
    }
  }

  const uploadParts = async (
    multipart: ChatMultipartAttachments,
    source: VaultAttachmentSource,
    uploadOptions?: VaultAttachmentUploadOptions
  ) => {
    const signal = uploadOptions?.signal;
    const size = chunkedSize(source.size);
    if (size > multipart.maxBytes) tooLarge();
    const { attachment, partBytes, partCount } = await withRetry(
      () => multipart.create(size, signal),
      signal
    );
    try {
      await uploadOptions?.onReserved?.(attachment.id);
      const pieces = chunks(source, attachment.id, signal);
      let carry = new Uint8Array(0);
      let urls = new Map<number, ChatPresignedUrl>();
      for (let part = 1; part <= partCount; part++) {
        const body = new Uint8Array(
          part < partCount ? partBytes : size - partBytes * (partCount - 1)
        );
        for (let filled = 0; filled < body.length; ) {
          if (carry.length === 0) carry = (await pieces.next()).value ?? invalidAttachment();
          const take = Math.min(body.length - filled, carry.length);
          body.set(carry.subarray(0, take), filled);
          carry = carry.subarray(take);
          filled += take;
        }
        for (let attempt = 0; ; attempt++) {
          let url = urls.get(part);
          if (!url) {
            const numbers = Array.from(
              { length: Math.min(partUrlBatch, partCount - part + 1) },
              (_, i) => part + i
            );
            const fresh = await withRetry(
              () => multipart.parts(attachment.id, numbers, signal),
              signal
            );
            urls = new Map(fresh.map((p) => [p.partNumber, p]));
            url = urls.get(part)!;
          }
          if ((await put(url, body, signal)) === "stored") break;
          urls.clear();
          if (attempt >= retries)
            throw new ChatStoreError(
              "Attachment storage rejected the upload URL",
              403,
              "attachment_upload_rejected"
            );
        }
      }
      return attachment.id;
    } catch (error) {
      await discardPending(attachment.id).catch(() => undefined);
      throw error;
    }
  };

  const download = async (
    url: ChatPresignedUrl,
    signal?: AbortSignal,
    range?: { start: number; end: number }
  ): Promise<Uint8Array | "expired" | "missing"> => {
    for (let attempt = 0; ; attempt++) {
      if (expired(url)) return "expired";
      let response: Response;
      try {
        response = await fetcher(url.url, {
          method: url.method,
          headers: {
            ...sendableHeaders(url.headers),
            ...(range ? { Range: `bytes=${range.start}-${range.end - 1}` } : {}),
          },
          signal,
        });
        if (response.ok && (!range || response.status === 206))
          return new Uint8Array(await response.arrayBuffer());
      } catch (error) {
        if (signal?.aborted || attempt >= retries) throw error;
        await pause(attempt, signal);
        continue;
      }
      await discardBody(response);
      if (response.ok)
        throw new ChatStoreError(
          "Attachment storage ignored the byte range",
          response.status,
          "attachment_range_unsupported"
        );
      if (response.status === 403) return "expired";
      if (response.status === 404) return "missing";
      if (!transientStatus(response.status) || attempt >= retries)
        throw new ChatStoreError(
          `Attachment download failed with ${response.status}`,
          response.status,
          "attachment_download_failed"
        );
      await pause(attempt, signal);
    }
  };

  const remove = async (attachmentId: string, signal?: AbortSignal) => {
    try {
      await withRetry(() => store.attachments.delete(attachmentId, signal), signal);
    } catch (error) {
      if (!(error instanceof ChatStoreError) || error.status !== 404) throw error;
    }
    await cache?.delete(attachmentId).catch(() => undefined);
  };

  const discardPending = async (attachmentId: string) => {
    const found = await store.attachments.get(attachmentId);
    if (found?.attachment.state === "pending") await remove(attachmentId);
  };

  const readInto = async (
    attachmentId: string,
    sink: VaultAttachmentSink,
    signal?: AbortSignal
  ) => {
    let found = await withRetry(() => store.attachments.get(attachmentId, signal), signal);
    if (!found?.download) return false;
    const size = found.attachment.sizeBytes;
    let url = found.download;
    const fetchBytes = async (range?: { start: number; end: number }) => {
      for (let attempt = 0; ; attempt++) {
        const bytes = await download(url, signal, range);
        if (bytes !== "expired") return bytes === "missing" ? null : bytes;
        if (attempt >= retries)
          throw new ChatStoreError(
            "Attachment storage rejected the download URL",
            403,
            "attachment_download_rejected"
          );
        found = await withRetry(() => store.attachments.get(attachmentId, signal), signal);
        if (!found?.download) return null;
        url = found.download;
      }
    };
    if (size <= maxCiphertextBytes) {
      const frame = await fetchBytes();
      if (!frame) return false;
      if (frame.length !== size) invalidAttachment();
      await sink.write(await open(frame, attachmentId));
      return true;
    }
    const count = Math.ceil((size - 1) / chunkCiphertextBytes);
    for (let index = 0; index < count; ) {
      const stop = Math.min(count, index + downloadWindowChunks);
      const start = index === 0 ? 0 : 1 + index * chunkCiphertextBytes;
      const end = Math.min(size, 1 + stop * chunkCiphertextBytes);
      const window = await fetchBytes({ start, end });
      if (!window) return false;
      if (window.length !== end - start || (index === 0 && window[0] !== chunkedFrameVersion))
        invalidAttachment();
      for (let offset = index === 0 ? 1 : 0; index < stop; index++) {
        const chunk = window.subarray(offset, offset + chunkCiphertextBytes);
        offset += chunk.length;
        await sink.write(await openChunk(chunk, attachmentId, index, index === count - 1));
      }
    }
    return true;
  };

  return {
    async upload(input, uploadOptions) {
      const signal = uploadOptions?.signal;
      const source = toSource(input);
      if (!Number.isSafeInteger(source.size) || source.size < 0) invalidSource();
      if (source.size > maxVaultAttachmentBytes) {
        if (!store.attachments.multipart) tooLarge();
        return uploadParts(store.attachments.multipart, source, uploadOptions);
      }
      const bytes = await readExactly(source, 0, source.size);
      const size = bytes.length + frameOverhead;
      for (let attempt = 0; ; attempt++) {
        const { attachment, upload } = await withRetry(
          () => store.attachments.create(size, signal),
          signal
        );
        try {
          await uploadOptions?.onReserved?.(attachment.id);
          const frame = await seal(bytes, attachment.id);
          if ((await put(upload, frame, signal)) === "stored") return attachment.id;
        } catch (error) {
          await discardPending(attachment.id).catch(() => undefined);
          throw error;
        }
        await remove(attachment.id).catch(() => undefined);
        if (attempt >= retries)
          throw new ChatStoreError(
            "Attachment storage rejected the upload URL",
            403,
            "attachment_upload_rejected"
          );
      }
    },
    commit(attachmentId, owner, signal) {
      return withRetry(() => store.attachments.commit(attachmentId, owner, signal), signal);
    },
    async read(attachmentId, signal) {
      if (!attachmentIdPattern.test(attachmentId)) invalidAttachment();
      const cached = await cache?.get(attachmentId).catch(() => null);
      if (cached) return cached;
      const pieces: Uint8Array[] = [];
      if (!(await readInto(attachmentId, { write: (piece) => void pieces.push(piece) }, signal)))
        return null;
      let bytes = pieces[0];
      if (pieces.length > 1) {
        bytes = new Uint8Array(pieces.reduce((total, piece) => total + piece.length, 0));
        let offset = 0;
        for (const piece of pieces) {
          bytes.set(piece, offset);
          offset += piece.length;
        }
      }
      await cache?.set(attachmentId, bytes).catch(() => undefined);
      return bytes;
    },
    readTo(attachmentId, sink, signal) {
      if (!attachmentIdPattern.test(attachmentId)) invalidAttachment();
      return readInto(attachmentId, sink, signal);
    },
    delete: remove,
  };
}

/** Where a migration run keeps the reservation it is working on, so a rerun resumes it instead of uploading again. */
export interface VaultAttachmentJournal {
  get(key: string): Promise<string | null>;
  set(key: string, attachmentId: string | null): Promise<void>;
}

export interface LocalMessageAttachment {
  /** `FileMetadata.id` or the media id listed in `fileIds`. */
  fileId: string;
  name: string;
  type: string;
  read(): Promise<Uint8Array | null>;
}

export interface MessageAttachmentMigrationOptions {
  store: ChatStore;
  attachments: VaultAttachments;
  journal: VaultAttachmentJournal;
  /** The message's vault id (`StoredMessage.uniqueId`); vault must already hold it. */
  messageId: string;
  files: readonly LocalMessageAttachment[];
  now?: () => number;
  signal?: AbortSignal;
}

export interface MessageAttachmentMigrationResult {
  refs: VaultAttachmentRef[];
  uploaded: number;
  missing: string[];
  oversized: string[];
  /** File ids another run may still be uploading; rerun after 16 minutes. */
  deferred: string[];
}

function validRef(value: unknown): value is VaultAttachmentRef {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const ref = value as Record<string, unknown>;
  return (
    typeof ref.attachmentId === "string" &&
    attachmentIdPattern.test(ref.attachmentId) &&
    typeof ref.fileId === "string" &&
    ref.fileId.length > 0 &&
    typeof ref.name === "string" &&
    typeof ref.type === "string" &&
    Number.isSafeInteger(ref.size) &&
    (ref.size as number) >= 0
  );
}

/** The vault attachment refs a message record carries; malformed entries are left out. */
export function vaultAttachmentRefs(record: Pick<ChatRecord, "data">): VaultAttachmentRef[] {
  const refs = record.data.vaultAttachments;
  return Array.isArray(refs) ? (refs as unknown[]).filter(validRef) : [];
}

function journalKey(messageId: string, fileId: string): string {
  return JSON.stringify([messageId, fileId]);
}

/** Copies a message's local files into vault and records their ids on the message; safe to rerun after a crash without uploading a file twice. */
export async function migrateMessageAttachments(
  options: MessageAttachmentMigrationOptions
): Promise<MessageAttachmentMigrationResult> {
  const { store, attachments, journal, messageId, signal } = options;
  const now = options.now ?? Date.now;
  const owner: VaultAttachmentOwner = { kind: "message", id: messageId };
  const ownerGone = () =>
    new ChatStoreError("Message is not in vault", 409, "attachment_owner_not_found");

  let snapshot = await store.get("message", messageId, signal);
  if (!snapshot || snapshot.record.isDeleted) throw ownerGone();
  const present = new Map(vaultAttachmentRefs(snapshot.record).map((r) => [r.fileId, r]));
  const uploadable = (attachment: ChatAttachment) =>
    attachment.state === "pending" && now() < Date.parse(attachment.createdAt) + uploadWindowMs;

  const lookup = async (attachmentId: string | null | undefined) =>
    attachmentId && attachmentIdPattern.test(attachmentId)
      ? ((await store.attachments.get(attachmentId, signal))?.attachment ?? null)
      : null;

  const bind = async (found: ChatAttachment | null): Promise<ChatAttachment | "busy" | null> => {
    if (!found) return null;
    if (found.state === "committed")
      return found.ownerKind === owner.kind && found.ownerId === owner.id ? found : null;
    try {
      return await attachments.commit(found.id, owner, signal);
    } catch (error) {
      if (!(error instanceof ChatStoreError) || error.code !== "attachment_not_uploaded")
        throw error;
      if (uploadable(found)) return "busy";
      await attachments.delete(found.id, signal);
      return null;
    }
  };

  const added: VaultAttachmentRef[] = [];
  const settled: string[] = [];
  const missing: string[] = [];
  const oversized: string[] = [];
  const deferred: string[] = [];
  const stale = new Set<string>();
  let uploaded = 0;
  for (const file of options.files) {
    signal?.throwIfAborted();
    const key = journalKey(messageId, file.fileId);
    const recorded = present.get(file.fileId);
    if (recorded) {
      const bound = await bind(await lookup(recorded.attachmentId));
      if (bound === "busy") {
        deferred.push(file.fileId);
        continue;
      }
      if (bound) {
        const stray = await lookup(await journal.get(key));
        if (stray && stray.id !== recorded.attachmentId) {
          if (uploadable(stray)) continue;
          await attachments.delete(stray.id, signal);
        }
        settled.push(key);
        continue;
      }
      stale.add(recorded.attachmentId);
    }
    const meta = { fileId: file.fileId, name: file.name, type: file.type };
    const resumed = await bind(await lookup(await journal.get(key)));
    if (resumed === "busy") {
      deferred.push(file.fileId);
      continue;
    }
    if (resumed) {
      added.push({ attachmentId: resumed.id, ...meta, size: plaintextBytes(resumed.sizeBytes) });
      settled.push(key);
      continue;
    }
    const bytes = await file.read();
    if (!bytes) {
      missing.push(file.fileId);
      continue;
    }
    if (bytes.length > maxVaultAttachmentBytes) {
      oversized.push(file.fileId);
      continue;
    }
    const attachmentId = await attachments.upload(bytes, {
      signal,
      onReserved: (id) => journal.set(key, id),
    });
    uploaded++;
    await attachments.commit(attachmentId, owner, signal);
    added.push({ attachmentId, ...meta, size: bytes.length });
    settled.push(key);
  }

  const superseded: string[] = [];
  for (let attempt = 0; added.length > 0; attempt++) {
    const refs = new Map(vaultAttachmentRefs(snapshot.record).map((r) => [r.fileId, r]));
    superseded.length = 0;
    for (const ref of added) {
      const prior = refs.get(ref.fileId);
      if (prior && prior.attachmentId !== ref.attachmentId && !stale.has(prior.attachmentId))
        superseded.push(ref.attachmentId);
      else refs.set(ref.fileId, ref);
    }
    if (superseded.length === added.length) break;
    try {
      [snapshot] = await store.putMany(
        [
          {
            record: {
              ...snapshot.record,
              data: { ...snapshot.record.data, ...plain({ vaultAttachments: [...refs.values()] }) },
            },
            expectedVersion: snapshot.version,
          },
        ],
        signal
      );
      break;
    } catch (error) {
      if (
        !(error instanceof ChatStoreError) ||
        error.code !== "version_conflict" ||
        attempt + 1 >= maxRefWrites
      )
        throw error;
      const latest = await store.get("message", messageId, signal);
      if (!latest || latest.record.isDeleted) throw ownerGone();
      snapshot = latest;
    }
  }
  for (const id of superseded) await attachments.delete(id, signal);
  for (const key of settled) await journal.set(key, null);
  return { refs: vaultAttachmentRefs(snapshot.record), uploaded, missing, oversized, deferred };
}
