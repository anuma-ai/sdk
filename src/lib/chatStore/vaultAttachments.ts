import type { VaultAttachmentRef } from "../db/chat/types";
import type { MemoryKeyRing } from "../memory/store/memoryKeys";
import {
  type ChatAttachment,
  type ChatPresignedUrl,
  type ChatRecord,
  type ChatStore,
  ChatStoreError,
} from "./types";
import { plain } from "./vaultRecords";

const frameVersion = 1;
const ivBytes = 12;
const tagBytes = 16;
const frameOverhead = 1 + ivBytes + tagBytes;
const maxCiphertextBytes = 50 * 1024 * 1024;
const expirySkewMs = 30_000;
const maxRetryAfterMs = 30_000;
const maxRefWrites = 5;
const uploadWindowMs = 16 * 60_000;
const attachmentIdPattern = /^[0-9a-f]{32}$/;

/** The largest file vault stores, after the encryption frame is added. */
export const maxVaultAttachmentBytes = maxCiphertextBytes - frameOverhead;

/** Device-side store for decrypted attachment bytes, keyed by vault attachment id. */
export interface VaultAttachmentCache {
  get(attachmentId: string): Promise<Uint8Array | null>;
  set(attachmentId: string, bytes: Uint8Array): Promise<void>;
  delete(attachmentId: string): Promise<void>;
}

export interface VaultAttachmentOwner {
  kind: "message" | "summary";
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
  /** Encrypts and uploads `bytes`; the attachment stays pending until `commit`, and vault drops it after 24h. */
  upload(bytes: Uint8Array, options?: VaultAttachmentUploadOptions): Promise<string>;
  /** Binds an uploaded attachment to a message or summary that vault already holds. */
  commit(
    attachmentId: string,
    owner: VaultAttachmentOwner,
    signal?: AbortSignal
  ): Promise<ChatAttachment>;
  /** The decrypted bytes, or null when the attachment is gone or not yet committed. */
  read(attachmentId: string, signal?: AbortSignal): Promise<Uint8Array | null>;
  delete(attachmentId: string, signal?: AbortSignal): Promise<void>;
}

function additionalData(attachmentId: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`anuma-chat-attachment-v1:${attachmentId}`);
}

function invalidAttachment(): never {
  throw new ChatStoreError("Attachment does not decrypt under this key", 0, "invalid_attachment");
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

  const download = async (
    url: ChatPresignedUrl,
    signal?: AbortSignal
  ): Promise<Uint8Array | "expired" | "missing"> => {
    for (let attempt = 0; ; attempt++) {
      if (expired(url)) return "expired";
      let response: Response;
      try {
        response = await fetcher(url.url, {
          method: url.method,
          headers: sendableHeaders(url.headers),
          signal,
        });
        if (response.ok) return new Uint8Array(await response.arrayBuffer());
      } catch (error) {
        if (signal?.aborted || attempt >= retries) throw error;
        await pause(attempt, signal);
        continue;
      }
      await discardBody(response);
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

  return {
    async upload(bytes, uploadOptions) {
      const signal = uploadOptions?.signal;
      if (!(bytes instanceof Uint8Array) || bytes.length > maxVaultAttachmentBytes)
        throw new ChatStoreError(
          "Attachment is larger than vault accepts",
          413,
          "attachment_too_large"
        );
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
      for (let attempt = 0; ; attempt++) {
        const found = await withRetry(() => store.attachments.get(attachmentId, signal), signal);
        if (!found?.download) return null;
        const frame = await download(found.download, signal);
        if (frame === "missing") return null;
        if (frame === "expired") {
          if (attempt >= retries)
            throw new ChatStoreError(
              "Attachment storage rejected the download URL",
              403,
              "attachment_download_rejected"
            );
          continue;
        }
        if (frame.length !== found.attachment.sizeBytes) invalidAttachment();
        const bytes = await open(frame, attachmentId);
        await cache?.set(attachmentId, bytes).catch(() => undefined);
        return bytes;
      }
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
      added.push({ attachmentId: resumed.id, ...meta, size: resumed.sizeBytes - frameOverhead });
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
