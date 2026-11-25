import {
  type EmbeddedWalletSignerFn,
  getKeyPair,
  getStoredKeyPair,
  type SignMessageFn,
} from "../../react/useEncryption";
import type { StoredMessage } from "../db/chat/types";
import { createNearbyRequest } from "../memory/store/remotePersistence";
import type { ChatBackend } from "../storage/ChatBackend";
import type { ApiResponse } from "./useChat/strategies/types";

/**
 * A finished background answer, as portal sealed it into the vault inbox.
 * @public
 */
export type InboxPlaintext = {
  v: 1;
  inference_id: string;
  conversation_id: string;
  parent_message_id: string | null;
  assistant_message_id?: string | null;
  api_type: "responses" | "completions";
  model: string;
  status: "completed" | "tool_request";
  pending_tool: string | null;
  response: ApiResponse;
  finished_at: string;
};

/**
 * One sealed item in the vault inbox.
 * @public
 */
export type InboxItem = { id: string; sealed: string; created_at: string };

/**
 * The account's vault inbox and the public key portal seals answers to.
 * @public
 */
export interface VaultInbox {
  putPublicKey(publicKey: string): Promise<void>;
  list(): Promise<InboxItem[]>;
  remove(id: string): Promise<void>;
}

const ENVELOPE_ALG = "ECDH-ES+HKDF-SHA256+A256GCM";
const HKDF_INFO_PREFIX = "anuma-inbox-v1:";
const P256_COORDINATE_BYTES = 32;
const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: unknown): Uint8Array<ArrayBuffer> {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new Error("Inbox envelope field is not base64url");
  }
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function isInboxItem(value: unknown): value is InboxItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.sealed === "string";
}

/**
 * The vault inbox client, under the same `/api/private-chats` routes as the chat store.
 * @public
 */
export function createVaultInbox(options: {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}): VaultInbox {
  const request = createNearbyRequest(options, "/api/private-chats");
  return {
    putPublicKey: async (publicKey) => {
      await request("/public-key", {
        method: "PUT",
        body: JSON.stringify({ public_key: publicKey }),
      });
    },
    list: async () => {
      const body = (await request("/inbox")) as { items?: unknown } | null;
      return Array.isArray(body?.items) ? body.items.filter(isInboxItem) : [];
    },
    remove: async (id) => {
      await request(`/inbox/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
  };
}

/** The 65-byte uncompressed P-256 point, base64url, as vault stores it. */
export async function exportInboxPublicKey(publicKey: CryptoKey): Promise<string> {
  return toBase64Url(await exportUncompressedPoint(publicKey));
}

function toP256Coordinate(value: unknown): Uint8Array<ArrayBuffer> {
  const decoded = fromBase64Url(value);
  if (decoded.length > P256_COORDINATE_BYTES) {
    throw new Error("Inbox public key coordinate is too long");
  }
  const coordinate = new Uint8Array(P256_COORDINATE_BYTES);
  coordinate.set(decoded, P256_COORDINATE_BYTES - decoded.length);
  return coordinate;
}

async function exportUncompressedPoint(publicKey: CryptoKey): Promise<Uint8Array> {
  const { x, y } = await crypto.subtle.exportKey("jwk", publicKey);
  const point = new Uint8Array(1 + P256_COORDINATE_BYTES * 2);
  point[0] = 4;
  point.set(toP256Coordinate(x), 1);
  point.set(toP256Coordinate(y), 1 + P256_COORDINATE_BYTES);
  return point;
}

async function openEnvelope(
  sealed: string,
  sealId: string,
  keyPair: CryptoKeyPair
): Promise<ArrayBuffer> {
  const envelope = JSON.parse(sealed) as Record<string, unknown> | null;
  if (!envelope || typeof envelope !== "object") throw new Error("Malformed inbox envelope");
  if (envelope.v !== 1 || envelope.alg !== ENVELOPE_ALG) {
    throw new Error("Unsupported inbox envelope");
  }
  const epk = fromBase64Url(envelope.epk);
  const iv = fromBase64Url(envelope.iv);
  const ciphertext = fromBase64Url(envelope.ct);
  if (epk.length !== 65 || iv.length !== 12) throw new Error("Malformed inbox envelope");

  const ephemeral = await crypto.subtle.importKey(
    "raw",
    epk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const shared = await crypto.subtle.deriveBits(
    { name: "ECDH", public: ephemeral },
    keyPair.privateKey,
    256
  );
  const recipient = await exportUncompressedPoint(keyPair.publicKey);
  const salt = new Uint8Array(epk.length + recipient.length);
  salt.set(epk);
  salt.set(recipient, epk.length);

  const ikm = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: encoder.encode(HKDF_INFO_PREFIX + sealId) },
    ikm,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(sealId) },
    key,
    ciphertext
  );
}

/** Decrypt text that portal sealed to the account's inbox public key under a seal id. */
export async function openSealedText(
  sealed: string,
  sealId: string,
  keyPair: CryptoKeyPair
): Promise<string> {
  return new TextDecoder().decode(await openEnvelope(sealed, sealId, keyPair));
}

/**
 * Open text that portal sealed to the wallet's inbox key under a seal id.
 * @public
 */
export async function openInboxSealedText(
  options: {
    walletAddress?: string;
    signMessage?: SignMessageFn;
    embeddedWalletSigner?: EmbeddedWalletSignerFn;
  },
  sealed: string,
  sealId: string
): Promise<string> {
  const { walletAddress, signMessage, embeddedWalletSigner } = options;
  const keyPair = !walletAddress
    ? null
    : signMessage
      ? await getKeyPair(walletAddress, signMessage, embeddedWalletSigner)
      : getStoredKeyPair(walletAddress);
  if (!keyPair) {
    throw new Error("No inbox key: set walletAddress and signMessage to open a sealed value");
  }
  return openSealedText(sealed, sealId, keyPair);
}

/** Decrypt a sealed inbox item with the account's ECDH key pair. */
export async function openInboxItem(
  item: Pick<InboxItem, "id" | "sealed">,
  keyPair: CryptoKeyPair
): Promise<InboxPlaintext> {
  const plaintext = await openEnvelope(item.sealed, item.id, keyPair);
  const opened = JSON.parse(new TextDecoder().decode(plaintext)) as InboxPlaintext;
  if (opened.v !== 1 || opened.inference_id !== item.id || !opened.response) {
    throw new Error("Inbox item does not match its id");
  }
  return opened;
}

/**
 * Outcome of delivering one vault inbox item.
 * @public
 */
export type InboxDeliveryResult = {
  id: string;
  conversationId: string | null;
  status: "stored" | "delivered" | "elsewhere" | "unreadable" | "retry";
  assistantMessage: StoredMessage | null;
  error?: string;
};

function inboxReplaces(row: StoredMessage, opened: InboxPlaintext): boolean {
  if (row.error) return true;
  return row.wasStopped === true && opened.status === "completed";
}

export async function clearTurnErrors(
  backend: Pick<ChatBackend, "getMessagesByIds" | "updateMessageError">,
  answer: StoredMessage
): Promise<StoredMessage> {
  const parentId = answer.parentMessageId;
  if (parentId) {
    const [parent] = await backend.getMessagesByIds([parentId]);
    if (parent?.error) await backend.updateMessageError(parentId, null);
  }
  if (!answer.error) return answer;
  return (await backend.updateMessageError(answer.uniqueId, null)) ?? answer;
}

/** Store every inbox answer that belongs to a turn on this device, then remove it from the inbox. */
export async function deliverInboxAnswers(options: {
  inbox: VaultInbox;
  keyPair: CryptoKeyPair;
  backend: Pick<ChatBackend, "getMessagesByIds" | "getConversation" | "confirmMessagePersisted">;
  store: (opened: InboxPlaintext, messageId: string) => Promise<StoredMessage>;
  complete?: (opened: InboxPlaintext, answer: StoredMessage) => Promise<void>;
}): Promise<InboxDeliveryResult[]> {
  const { inbox, keyPair, backend, store, complete } = options;
  const results: InboxDeliveryResult[] = [];
  for (const item of await inbox.list()) {
    let opened: InboxPlaintext;
    try {
      opened = await openInboxItem(item, keyPair);
    } catch (err) {
      results.push({
        id: item.id,
        conversationId: null,
        status: "unreadable",
        assistantMessage: null,
        error: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
    const base = { id: item.id, conversationId: opened.conversation_id };
    try {
      const messageId = opened.assistant_message_id ?? `msg_bg_${opened.inference_id}`;
      const [found] = await backend.getMessagesByIds([messageId]);
      const existing = found && inboxReplaces(found, opened) ? undefined : found;
      if (!found) {
        const parent = opened.parent_message_id;
        const ownsTurn = parent
          ? (await backend.getMessagesByIds([parent])).length > 0
          : (await backend.getConversation(opened.conversation_id)) !== null;
        if (!ownsTurn) {
          results.push({ ...base, status: "elsewhere", assistantMessage: null });
          continue;
        }
      }
      const stored = existing ?? (await store(opened, messageId));
      await backend.confirmMessagePersisted?.(stored);
      if (complete) await complete(opened, stored);
      await inbox.remove(item.id);
      results.push({
        ...base,
        status: existing ? "delivered" : "stored",
        assistantMessage: stored,
      });
    } catch (err) {
      results.push({
        ...base,
        status: "retry",
        assistantMessage: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}
