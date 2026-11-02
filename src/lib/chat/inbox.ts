import { createNearbyRequest } from "../memory/store/remotePersistence";
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
  return toBase64Url(new Uint8Array(await crypto.subtle.exportKey("raw", publicKey)));
}

/** Decrypt a sealed inbox item with the account's ECDH key pair. */
export async function openInboxItem(
  item: Pick<InboxItem, "id" | "sealed">,
  keyPair: CryptoKeyPair
): Promise<InboxPlaintext> {
  const envelope = JSON.parse(item.sealed) as Record<string, unknown>;
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
  const recipient = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
  const salt = new Uint8Array(epk.length + recipient.length);
  salt.set(epk);
  salt.set(recipient, epk.length);

  const ikm = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: encoder.encode(HKDF_INFO_PREFIX + item.id) },
    ikm,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(item.id) },
    key,
    ciphertext
  );

  const opened = JSON.parse(new TextDecoder().decode(plaintext)) as InboxPlaintext;
  if (opened.v !== 1 || opened.inference_id !== item.id || !opened.response) {
    throw new Error("Inbox item does not match its id");
  }
  return opened;
}
