/**
 * Receipt construction and verification.
 *
 * A PromptSeal receipt is a self-describing, self-verifying JSON object. The
 * schema is fixed at v0.1; any change to the on-disk fields after signing must
 * invalidate the receipt.
 *
 * Pipeline (mirrors Python `promptseal/receipt.py`):
 *     body = pick(receipt, CANONICAL_FIELDS)   // whitelist, NOT blacklist
 *     bytes = canonicalJson(body)              // sorted keys, compact, UTF-8
 *     event_hash = "sha256:" + hex(sha256(bytes))
 *     signature  = "ed25519:" + b64(ed25519.sign(bytes, sk))
 *     receipt    = { ...body, event_hash, signature }
 *
 * The whitelist matters: Dexie / IndexedDB round-trips can introduce a
 * storage-internal `id` field on retrieved rows. A blacklist
 * ("everything except event_hash and signature") would silently fold that id
 * into the canonical body and break verification on read-back. Whitelist
 * picks the nine canonical fields explicitly — extra fields are ignored.
 */
import {
  base64ToBytes,
  bytesToBase64,
  bytesToHex,
  canonicalJson,
  HASH_PREFIX,
  KEY_PREFIX,
  stripKeyPrefix,
  toBufferSource,
} from "./canonical";
import { publicKeyBytes, sign, verify } from "./crypto";

export const SCHEMA_VERSION = "0.1" as const;
export { HASH_PREFIX, KEY_PREFIX };

/**
 * Receipt schema v0.1 — byte-equal to Python `promptseal/receipt.py`.
 *
 * IMPORTANT: this type defines the canonical body. No storage-internal fields
 * (e.g. Dexie auto-id) belong here. Canonicalization MUST use a whitelist of
 * these fields — never a "everything except event_hash and signature"
 * blacklist — to prevent silent breakage on read-back from IndexedDB.
 */
export type Receipt = {
  schema_version: typeof SCHEMA_VERSION;
  agent_id: string;
  agent_erc8004_token_id: number | null;
  event_type:
    | "llm_start"
    | "llm_end"
    | "tool_start"
    | "tool_end"
    | "final_decision"
    | "error";
  timestamp: string;
  parent_hash: string | null;
  paired_event_hash: string | null;
  payload_excerpt: Record<string, unknown>;
  public_key: string;
  event_hash: string;
  signature: string;
};

/**
 * The fields that go into the canonical body — exactly nine, alphabetical.
 * Any other field on the receipt object is ignored during canonicalization.
 */
export const CANONICAL_FIELDS = [
  "agent_erc8004_token_id",
  "agent_id",
  "event_type",
  "paired_event_hash",
  "parent_hash",
  "payload_excerpt",
  "public_key",
  "schema_version",
  "timestamp",
] as const;

type CanonicalBody = {
  agent_erc8004_token_id: number | null;
  agent_id: string;
  event_type: string;
  paired_event_hash: string | null;
  parent_hash: string | null;
  payload_excerpt: Record<string, unknown>;
  public_key: string;
  schema_version: string;
  timestamp: string;
};

function pickCanonical(r: Record<string, unknown>): CanonicalBody {
  const body = {} as Record<string, unknown>;
  for (const k of CANONICAL_FIELDS) {
    body[k] = r[k] ?? null;
  }
  // Restore typed shape for required fields.
  return body as CanonicalBody;
}

/** Canonical bytes for *r*'s body, picked via whitelist (never blacklist). */
export function receiptBodyBytes(r: Receipt | Record<string, unknown>): Uint8Array {
  return canonicalJson(pickCanonical(r as Record<string, unknown>));
}

function nowIso(): string {
  // `2026-04-30T18:22:01.123Z` — milliseconds precision, Z suffix; matches
  // Python's `datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')`.
  const d = new Date();
  return d.toISOString();
}

export type BuildReceiptOptions = {
  sk: Uint8Array;
  agentId: string;
  agentErc8004TokenId: number | null;
  eventType: Receipt["event_type"];
  payloadExcerpt: Record<string, unknown>;
  parentHash: string | null;
  pairedEventHash?: string | null;
  timestamp?: string;
};

/** Build a fully signed receipt. */
export async function buildSignedReceipt(opts: BuildReceiptOptions): Promise<Receipt> {
  const pkBytes = await publicKeyBytes(opts.sk);
  const publicKeyStr = KEY_PREFIX + bytesToBase64(pkBytes);
  const body: CanonicalBody = {
    agent_erc8004_token_id: opts.agentErc8004TokenId,
    agent_id: opts.agentId,
    event_type: opts.eventType,
    paired_event_hash: opts.pairedEventHash ?? null,
    parent_hash: opts.parentHash,
    payload_excerpt: opts.payloadExcerpt,
    public_key: publicKeyStr,
    schema_version: SCHEMA_VERSION,
    timestamp: opts.timestamp ?? nowIso(),
  };
  const bodyBytes = canonicalJson(body);
  const digest = await crypto.subtle.digest("SHA-256", toBufferSource(bodyBytes));
  const eventHash = HASH_PREFIX + bytesToHex(new Uint8Array(digest));
  const sig = await sign(opts.sk, bodyBytes);
  const signature = KEY_PREFIX + bytesToBase64(sig);
  return {
    ...body,
    event_hash: eventHash,
    signature,
  } as Receipt;
}

/** Verify *r*'s event_hash and signature. Returns false on any failure. */
export async function verifyReceipt(r: Receipt | Record<string, unknown>): Promise<boolean> {
  try {
    const bodyBytes = receiptBodyBytes(r);
    const digest = await crypto.subtle.digest("SHA-256", toBufferSource(bodyBytes));
    const expectedHash = HASH_PREFIX + bytesToHex(new Uint8Array(digest));
    const eventHash = (r as Record<string, unknown>).event_hash;
    if (eventHash !== expectedHash) return false;
    const signatureStr = (r as Record<string, unknown>).signature;
    const publicKeyStr = (r as Record<string, unknown>).public_key;
    if (typeof signatureStr !== "string" || typeof publicKeyStr !== "string") return false;
    const sig = base64ToBytes(stripKeyPrefix(signatureStr));
    const pk = base64ToBytes(stripKeyPrefix(publicKeyStr));
    return await verify(pk, bodyBytes, sig);
  } catch {
    return false;
  }
}
