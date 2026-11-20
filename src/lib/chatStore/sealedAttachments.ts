import { ChatStoreError } from "./types";

export const frameVersion = 1;
export const chunkedFrameVersion = 2;
export const ivBytes = 12;
const tagBytes = 16;
export const frameOverhead = 1 + ivBytes + tagBytes;
export const maxCiphertextBytes = 50 * 1024 * 1024;
export const chunkOverhead = ivBytes + tagBytes;
export const chunkPlaintextBytes = 1024 * 1024;
export const chunkCiphertextBytes = chunkPlaintextBytes + chunkOverhead;

export function additionalData(attachmentId: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`anuma-chat-attachment-v1:${attachmentId}`);
}

export function chunkAdditionalData(
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

export function invalidAttachment(): never {
  throw new ChatStoreError("Attachment does not decrypt under this key", 0, "invalid_attachment");
}

/** The plaintext size of a sealed attachment that is `sizeBytes` long as vault stores it. */
export function plaintextBytes(sizeBytes: number): number {
  if (sizeBytes <= maxCiphertextBytes) return sizeBytes - frameOverhead;
  return sizeBytes - 1 - chunkOverhead * Math.ceil((sizeBytes - 1) / chunkCiphertextBytes);
}

export function chunkTotal(sizeBytes: number): number {
  return Math.ceil((sizeBytes - 1) / chunkCiphertextBytes);
}

export async function openFrame(
  key: CryptoKey,
  frame: Uint8Array,
  attachmentId: string
): Promise<Uint8Array> {
  if (frame.length < frameOverhead || frame[0] !== frameVersion) invalidAttachment();
  try {
    return new Uint8Array(
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: frame.slice(1, 1 + ivBytes),
          additionalData: additionalData(attachmentId),
        },
        key,
        frame.slice(1 + ivBytes)
      )
    );
  } catch {
    return invalidAttachment();
  }
}

export async function openChunk(
  key: CryptoKey,
  chunk: Uint8Array,
  attachmentId: string,
  index: number,
  last: boolean
): Promise<Uint8Array> {
  if (chunk.length < chunkOverhead) invalidAttachment();
  try {
    return new Uint8Array(
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: chunk.slice(0, ivBytes),
          additionalData: chunkAdditionalData(attachmentId, index, last),
        },
        key,
        chunk.slice(ivBytes)
      )
    );
  } catch {
    return invalidAttachment();
  }
}

/** An attachment's ciphertext exactly as vault stores it, read from wherever the device keeps it. */
export interface SealedAttachment {
  key: CryptoKey;
  attachmentId: string;
  sizeBytes: number;
  read(start: number, end: number): Promise<Uint8Array>;
}

/** Decrypts plaintext bytes `start` up to `end` of a sealed attachment, reading only the chunks that hold them. */
export async function openSealedAttachment(
  sealed: SealedAttachment,
  start: number,
  end: number
): Promise<Uint8Array> {
  const from = Math.max(0, start);
  const to = Math.min(plaintextBytes(sealed.sizeBytes), end);
  if (to <= from) return new Uint8Array(0);
  if (sealed.sizeBytes <= maxCiphertextBytes) {
    const frame = await sealed.read(0, sealed.sizeBytes);
    return (await openFrame(sealed.key, frame, sealed.attachmentId)).slice(from, to);
  }
  const count = chunkTotal(sealed.sizeBytes);
  const first = Math.floor(from / chunkPlaintextBytes);
  const last = Math.floor((to - 1) / chunkPlaintextBytes);
  const readStart = first === 0 ? 0 : 1 + first * chunkCiphertextBytes;
  const readEnd = Math.min(sealed.sizeBytes, 1 + (last + 1) * chunkCiphertextBytes);
  const window = await sealed.read(readStart, readEnd);
  if (first === 0 && window[0] !== chunkedFrameVersion) invalidAttachment();
  const out = new Uint8Array(to - from);
  for (let index = first, offset = first === 0 ? 1 : 0; index <= last; index++) {
    const chunk = window.subarray(offset, offset + chunkCiphertextBytes);
    offset += chunk.length;
    const plain = await openChunk(
      sealed.key,
      chunk,
      sealed.attachmentId,
      index,
      index === count - 1
    );
    const chunkStart = index * chunkPlaintextBytes;
    const takeFrom = Math.max(chunkStart, from);
    out.set(
      plain.subarray(takeFrom - chunkStart, Math.min(to, chunkStart + plain.length) - chunkStart),
      takeFrom - from
    );
  }
  return out;
}
