"use client";

import { getLogger } from "../lib/logger";

export const SIGN_MESSAGE =
  "The app is asking you to sign this message to generate a key, which will be used to encrypt data.";
/**
 * Encryption key version type.
 * - "v2": Legacy SHA-256 derived key (for reading enc:v2: data)
 * - "v3": HKDF derived key with domain separation (for new encryption)
 *
 * Raw signature bytes (Privy Solana `signMessage` returns a `Uint8Array`) are
 * not a stored version. Derive them with {@link deriveKeyFromSignatureBytes}.
 * {@link requestEncryptionKey} still derives v2 and v3 from a hex signature only.
 */
export type EncryptionKeyVersion = "v2" | "v3";

interface StoredKeys {
  legacy?: string;
  current?: string;
}

/**
 * Thrown by {@link getEncryptionKey} when the requested version is absent.
 * Distinct from AES-GCM auth-tag failures so decrypt callers can tell
 * "need to derive/hydrate this version" from "wrong key for intact ciphertext".
 */
export class EncryptionKeyMissingError extends Error {
  readonly address: string;
  readonly version: EncryptionKeyVersion;

  constructor(address: string, version: EncryptionKeyVersion) {
    super(
      `Encryption key (${version}) not found for ${address}. ` +
        `Please sign a message to generate your encryption key.`
    );
    this.name = "EncryptionKeyMissingError";
    this.address = address;
    this.version = version;
  }
}

/**
 * Options for {@link requestEncryptionKey}.
 */
export interface RequestEncryptionKeyOptions {
  /**
   * When true, re-derive and replace any existing in-memory keys for this
   * address. Default false preserves the historical "if present, return"
   * short-circuit. Prefer {@link refreshEncryptionKeyIfMatches} when the
   * caller has ciphertext that must keep working — force-replace can pin a
   * newly derived wrong key over a still-valid one.
   */
  force?: boolean;
}

const encryptionKeyStore = new Map<string, StoredKeys>();
const pendingKeyRequests = new Map<string, Promise<boolean>>();
const pendingCandidateDerives = new Map<string, Promise<DerivedKeyPair | null>>();
const refreshCandidatesByAddress = new Map<string, DerivedKeyPair>();
const divergentDeriveAddresses = new Set<string>();

type DerivedKeyPair = { legacy: string; current: string };

let sessionEpoch = 0;

const cryptoKeyCache = new Map<string, CryptoKey>();

const keyAvailableCallbacks = new Map<string, Set<() => void>>();

const clearAllEncryptionStateCallbacks = new Set<() => void>();

/**
 * Register a callback fired on every {@link clearAllEncryptionState}.
 * Useful for downstream caches that hold plaintext derived from
 * encrypted SDK fields and must be wiped on session teardown.
 *
 * Listener errors are swallowed to keep teardown deterministic.
 *
 * @returns Unsubscribe function.
 */
export function onClearAllEncryptionState(callback: () => void): () => void {
  clearAllEncryptionStateCallbacks.add(callback);
  return () => {
    clearAllEncryptionStateCallbacks.delete(callback);
  };
}

/**
 * Register a callback that fires when an encryption key becomes available for an address.
 * If the key is already available, the callback fires immediately.
 * @returns Unsubscribe function
 */
export function onKeyAvailable(address: string, callback: () => void): () => void {
  if (encryptionKeyStore.has(address)) {
    try {
      callback();
    } catch {
      /* ignore */
    }
  }

  let callbacks = keyAvailableCallbacks.get(address);
  if (!callbacks) {
    callbacks = new Set();
    keyAvailableCallbacks.set(address, callbacks);
  }
  callbacks.add(callback);

  return () => {
    callbacks.delete(callback);
    if (callbacks.size === 0) {
      keyAvailableCallbacks.delete(address);
    }
  };
}

function notifyKeyAvailable(address: string): void {
  const callbacks = keyAvailableCallbacks.get(address);
  if (callbacks) {
    for (const cb of callbacks) {
      try {
        cb();
      } catch {
        /* ignore listener errors */
      }
    }
  }
}

const keyPairStore = new Map<string, CryptoKeyPair>();

function getStoredKeyByVersion(address: string, version: EncryptionKeyVersion): string | null {
  const keys = encryptionKeyStore.get(address);
  if (!keys) return null;
  const value = version === "v2" ? keys.legacy : keys.current;
  return value ?? null;
}

function setStoredKey(address: string, keys: StoredKeys): void {
  encryptionKeyStore.set(address, keys);
}

/**
 * Clears the encryption key for a wallet address from memory
 * @param address - The wallet address
 */
export function clearEncryptionKey(address: string): void {
  encryptionKeyStore.delete(address);
  cryptoKeyCache.delete(`${address}:v2`);
  cryptoKeyCache.delete(`${address}:v3`);
  refreshCandidatesByAddress.delete(address);
  divergentDeriveAddresses.delete(address);
}

/**
 * Clears all encryption-related state from memory and any derived persistence.
 *
 * This is the canonical session-teardown entry point. It wipes every module-level
 * map that retains key material or listeners tied to a session: the raw
 * encryption keys, cached imported CryptoKey objects, availability callbacks,
 * pending sign-in flights, and derived ECDH key pairs. It also removes any
 * persisted ECDH key pairs from localStorage so they can't be decrypted by a
 * subsequent user on a shared browser.
 *
 * Call this on logout / session-end to prevent cross-user key leakage on shared
 * browsers. If you manage auth outside the SDK, wire this into your logout flow.
 *
 * @example
 * ```tsx
 * import { clearAllEncryptionState } from "@anuma/sdk/react";
 *
 * async function handleLogout() {
 *   clearAllEncryptionState();
 *   await privy.logout();
 * }
 * ```
 */
export function clearAllEncryptionState(): void {
  sessionEpoch += 1;

  encryptionKeyStore.clear();
  cryptoKeyCache.clear();
  keyAvailableCallbacks.clear();
  pendingKeyRequests.clear();
  pendingCandidateDerives.clear();
  refreshCandidatesByAddress.clear();
  divergentDeriveAddresses.clear();

  clearAllKeyPairs();

  for (const cb of clearAllEncryptionStateCallbacks) {
    try {
      cb();
    } catch {
      /* ignore listener errors */
    }
  }
}

/**
 * Clears all encryption keys from memory.
 *
 * @deprecated Use {@link clearAllEncryptionState} instead. This function is kept
 * as an alias for backwards compatibility and now delegates to the canonical
 * teardown, which additionally clears `keyAvailableCallbacks`, pending key
 * requests, and derived ECDH key pairs (both in-memory and persisted).
 */
export function clearAllEncryptionKeys(): void {
  clearAllEncryptionState();
}

function hexNibble(code: number): number {
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 65 && code <= 70) return code - 55;
  if (code >= 97 && code <= 102) return code - 87;
  return -1;
}

/**
 * Decodes a hex string into bytes.
 *
 * Throws on a non-string, an empty string, an odd length, or any non-hex
 * character. Strips one leading `0x` prefix. Does not accept raw signature
 * bytes — use {@link deriveKeyFromSignatureBytes} for those.
 *
 * Also used for ciphertext and stored key hex. Valid even-length hex,
 * including a `0x` prefix, decodes to the same bytes as before.
 *
 * @internal Exported for the non-hex rejection test.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== "string") {
    throw new TypeError(
      "hexToBytes: expected a hex string. Pass raw signature bytes to deriveKeyFromSignatureBytes instead of stringifying them."
    );
  }
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (cleanHex.length === 0 || cleanHex.length % 2 !== 0) {
    throw new Error(
      `hexToBytes: invalid hex string (expected a non-empty even length, got ${cleanHex.length})`
    );
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    const hi = hexNibble(cleanHex.charCodeAt(i));
    const lo = hexNibble(cleanHex.charCodeAt(i + 1));
    if (hi < 0 || lo < 0) {
      throw new Error(`hexToBytes: invalid hex string (non-hex character at index ${i})`);
    }
    bytes[i / 2] = (hi << 4) | lo;
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const SHARED_TEXT_ENCODER = new TextEncoder();
const SHARED_TEXT_DECODER = new TextDecoder();

function isValidWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

const AES_GCM_V3_INFO = "anuma-sdk-aes-gcm-v3";
const AES_GCM_V4_INFO = "anuma-sdk-aes-gcm-v4";
const MIN_SIGNATURE_BYTES = 64;

async function deriveHkdfAesKeyHex(signatureBytes: Uint8Array, info: string): Promise<string> {
  const sigBytes = new Uint8Array(signatureBytes);
  const ikm = await crypto.subtle.digest("SHA-256", sigBytes);
  const hkdfKey = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, [
    "deriveBits",
  ]);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: SHARED_TEXT_ENCODER.encode(info),
    },
    hkdfKey,
    256
  );
  return bytesToHex(new Uint8Array(derivedBits));
}

/**
 * Derives a 32-byte encryption key from a hex signature using SHA-256.
 * @internal Exported so a fixture test can pin enc:v2 output.
 */
export async function deriveKeyFromSignature(signature: string): Promise<string> {
  const sigBytes = hexToBytes(signature);
  const hashBuffer = await crypto.subtle.digest("SHA-256", sigBytes.buffer as ArrayBuffer);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Derives a 32-byte encryption key from a hex signature using HKDF with domain separation.
 * Uses SHA-256(signature) as IKM, then HKDF-Expand with app-specific info string.
 * This provides proper key derivation and prevents cross-app key reuse.
 * @internal Exported so a fixture test can pin enc:v3 output.
 */
export async function deriveKeyFromSignatureV3(signature: string): Promise<string> {
  return deriveHkdfAesKeyHex(hexToBytes(signature), AES_GCM_V3_INFO);
}

/**
 * Derives the bytes-native AES key from a raw signature.
 *
 * Privy Solana `signMessage` returns a `Uint8Array`. Pass those bytes here.
 * The signature is never hex-encoded, base58-encoded, or passed through
 * `String()`. That string round-trip is what made {@link hexToBytes} store
 * zeros for every non-hex pair and yield a low-entropy AES key.
 *
 * This is the derivation for the next key version (`anuma-sdk-aes-gcm-v4`).
 * {@link requestEncryptionKey} does not install it; v2 and v3 stay on the
 * hex-string path so existing ciphertext keeps decrypting. The return value
 * is the same 64-char hex form the in-memory store already uses.
 *
 * @param signature - Raw signature bytes. Must be at least 64 bytes.
 * @returns 32-byte AES-GCM key as hex, without a `0x` prefix.
 * @throws Error when `signature` is shorter than 64 bytes.
 * @category Encryption
 */
export async function deriveKeyFromSignatureBytes(signature: Uint8Array): Promise<string> {
  if (!(signature instanceof Uint8Array)) {
    throw new TypeError("deriveKeyFromSignatureBytes: expected a Uint8Array signature");
  }
  if (signature.byteLength < MIN_SIGNATURE_BYTES) {
    throw new Error(
      `deriveKeyFromSignatureBytes: signature must be at least ${MIN_SIGNATURE_BYTES} bytes, got ${signature.byteLength}`
    );
  }
  return deriveHkdfAesKeyHex(signature, AES_GCM_V4_INFO);
}

function getStoredKeyPair(address: string): CryptoKeyPair | null {
  return keyPairStore.get(address) ?? null;
}

function setStoredKeyPair(address: string, keyPair: CryptoKeyPair): void {
  keyPairStore.set(address, keyPair);
}

async function deriveKeyPairFromSignature(
  signature: string,
  address: string
): Promise<CryptoKeyPair> {
  const sigBytes = hexToBytes(signature);

  const seedBuffer = await crypto.subtle.digest("SHA-256", sigBytes.buffer as ArrayBuffer);
  const seed = new Uint8Array(seedBuffer);

  const hkdfKey = await crypto.subtle.importKey("raw", seed.buffer, { name: "HKDF" }, false, [
    "deriveBits",
  ]);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: SHARED_TEXT_ENCODER.encode(address.toLowerCase()),
      info: SHARED_TEXT_ENCODER.encode("ECDH-P256-KeyPair"),
    },
    hkdfKey,
    256
  );

  const privateKeyBytes = new Uint8Array(derivedBits);

  if (privateKeyBytes.every((b) => b === 0)) {
    privateKeyBytes[31] = 1;
  }

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    createPKCS8PrivateKey(privateKeyBytes),
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveBits", "deriveKey"]
  );

  const privateKeyJwk = await crypto.subtle.exportKey("jwk", privateKey);

  if (!privateKeyJwk.x || !privateKeyJwk.y) {
    throw new Error("Failed to derive public key from private key");
  }

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: privateKeyJwk.x,
      y: privateKeyJwk.y,
    },
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );

  return {
    privateKey,
    publicKey,
  };
}

function createPKCS8PrivateKey(privateKeyBytes: Uint8Array): ArrayBuffer {
  const ecPublicKeyOID = new Uint8Array([0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01]);
  const prime256v1OID = new Uint8Array([
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
  ]);

  const version = new Uint8Array([0x02, 0x01, 0x01]);
  const privateKeyOctet = new Uint8Array([0x04, 0x20, ...privateKeyBytes]);

  const ecPrivateKeyContent = new Uint8Array([...version, ...privateKeyOctet]);
  const ecPrivateKeyLength = ecPrivateKeyContent.length;
  const ecPrivateKeySeq = new Uint8Array([0x30, ecPrivateKeyLength, ...ecPrivateKeyContent]);

  const wrappedPrivateKey = new Uint8Array([0x04, ecPrivateKeySeq.length, ...ecPrivateKeySeq]);

  const algorithmIdContent = new Uint8Array([...ecPublicKeyOID, ...prime256v1OID]);
  const algorithmIdLength = algorithmIdContent.length;
  const algorithmIdSeq = new Uint8Array([0x30, algorithmIdLength, ...algorithmIdContent]);

  const pkcs8Version = new Uint8Array([0x02, 0x01, 0x00]);
  const pkcs8Content = new Uint8Array([...pkcs8Version, ...algorithmIdSeq, ...wrappedPrivateKey]);
  const pkcs8ContentLength = pkcs8Content.length;
  const pkcs8Seq = new Uint8Array([0x30, pkcs8ContentLength, ...pkcs8Content]);

  return pkcs8Seq.buffer;
}

/**
 * Gets the encryption key from in-memory storage and imports it as a CryptoKey.
 * The key must have been previously requested via requestEncryptionKey.
 * Uses a cache to avoid re-importing the same key on every call.
 *
 * @param address - The wallet address
 * @param version - Which key version to use (default: "v3" for HKDF key)
 * @returns The CryptoKey for AES-GCM encryption/decryption
 * @throws Error if the key hasn't been requested yet
 */
export async function getEncryptionKey(
  address: string,
  version: EncryptionKeyVersion = "v3"
): Promise<CryptoKey> {
  const cacheKey = `${address}:${version}`;
  const cachedKey = cryptoKeyCache.get(cacheKey);
  if (cachedKey) {
    return cachedKey;
  }

  const keyHex = getStoredKeyByVersion(address, version);
  if (!keyHex) {
    throw new EncryptionKeyMissingError(address, version);
  }

  const keyBytes = hexToBytes(keyHex);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

  cryptoKeyCache.set(cacheKey, cryptoKey);

  return cryptoKey;
}

/**
 * Encrypts data using AES-GCM with the stored encryption key.
 *
 * This function uses the encryption key previously generated via `requestEncryptionKey`
 * to encrypt data. The key must exist in memory before calling this function, or it
 * will throw an error prompting the user to sign a message.
 *
 * @param plaintext - The data to encrypt (string or Uint8Array)
 * @param address - The wallet address associated with the encryption key
 * @returns Encrypted data as hex string (IV + ciphertext + auth tag)
 * @throws Error if encryption key is not found in memory
 *
 * @example
 * ```tsx
 * import { encryptData, requestEncryptionKey } from "@anuma/sdk/react";
 *
 * // First, ensure encryption key exists
 * await requestEncryptionKey(walletAddress);
 *
 * // Then encrypt data
 * const encrypted = await encryptData("my secret data", walletAddress);
 * localStorage.setItem("mySecret", encrypted);
 * ```
 *
 * @category Encryption
 */
export async function encryptData(
  plaintext: string | Uint8Array,
  address: string
): Promise<string> {
  if (!isValidWalletAddress(address)) {
    throw new Error(
      `Invalid wallet address: ${address}. Address must start with 0x and be 42 characters (0x + 40 hex characters).`
    );
  }

  const key = await getEncryptionKey(address);
  return encryptDataWithKey(plaintext, key);
}

/**
 * Like {@link encryptData} but takes raw bytes and returns the raw encrypted
 * `[IV][ciphertext+tag]` Uint8Array instead of a hex string. Avoids the hex
 * round-trip (`encryptData` returns hex, which callers immediately convert back
 * to bytes) — for large binary media that hex string is a ~1.37x copy of the
 * whole payload. Use for binary uploads (e.g. enc:v3 media frames).
 *
 * @param plaintext - The raw bytes to encrypt
 * @param address - The wallet address associated with the encryption key
 * @returns Encrypted data as raw bytes (IV + ciphertext + auth tag)
 * @category Encryption
 */
export async function encryptDataBytes(
  plaintext: Uint8Array,
  address: string
): Promise<Uint8Array> {
  if (!isValidWalletAddress(address)) {
    throw new Error(
      `Invalid wallet address: ${address}. Address must start with 0x and be 42 characters (0x + 40 hex characters).`
    );
  }

  const key = await getEncryptionKey(address);
  return encryptBytesWithKey(plaintext, key);
}

/**
 * Decrypts data using AES-GCM with the stored encryption key.
 *
 * This function uses the encryption key previously generated via `requestEncryptionKey`
 * to decrypt data. The key must exist in memory before calling this function, or it
 * will throw an error prompting the user to sign a message.
 *
 * @param encryptedHex - Encrypted data as hex string (IV + ciphertext + auth tag)
 * @param address - The wallet address associated with the encryption key
 * @returns Decrypted data as string
 * @throws Error if encryption key is not found in memory or if decryption fails
 *
 * @example
 * ```tsx
 * import { decryptData, requestEncryptionKey } from "@anuma/sdk/react";
 *
 * // First, ensure encryption key exists
 * await requestEncryptionKey(walletAddress);
 *
 * // Then decrypt data
 * const encrypted = localStorage.getItem("mySecret");
 * if (encrypted) {
 *   const decrypted = await decryptData(encrypted, walletAddress);
 *   console.log("Decrypted:", decrypted);
 * }
 * ```
 *
 * @category Encryption
 */
export async function decryptData(
  encryptedHex: string,
  address: string,
  version: EncryptionKeyVersion = "v3"
): Promise<string> {
  const key = await getEncryptionKey(address, version);
  return decryptDataWithKey(encryptedHex, key);
}

/**
 * Decrypts data and returns as Uint8Array (for binary data)
 * @param encryptedHex - Encrypted data as hex string (IV + ciphertext + auth tag)
 * @returns Decrypted data as Uint8Array
 */
export async function decryptDataBytes(
  encryptedHex: string,
  address: string,
  version: EncryptionKeyVersion = "v3"
): Promise<Uint8Array> {
  const key = await getEncryptionKey(address, version);

  const combined = hexToBytes(encryptedHex);

  const iv = combined.subarray(0, 12) as Uint8Array<ArrayBuffer>;
  const encryptedData = combined.subarray(12) as Uint8Array<ArrayBuffer>;

  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encryptedData
  );

  return new Uint8Array(decryptedData);
}

/**
 * Like {@link decryptDataBytes} but takes the raw encrypted bytes
 * (`[IV][ciphertext+tag]`) directly instead of a hex string. Skips the
 * `hexToBytes` conversion — for large binary media the hex string the caller
 * would otherwise build is a ~1.37x copy of the whole payload (a ~1GB string
 * for a 500MB video), plus this avoids a second byte copy. Same key resolution
 * as decryptDataBytes.
 *
 * @param encrypted - Raw encrypted bytes (IV + ciphertext + auth tag), no hex
 * @param address - The wallet address associated with the encryption key
 * @param version - Encryption key version to decrypt with (defaults to "v3")
 * @returns Decrypted data as Uint8Array
 * @category Encryption
 */
export async function decryptDataBytesFromBytes(
  encrypted: Uint8Array,
  address: string,
  version: EncryptionKeyVersion = "v3"
): Promise<Uint8Array> {
  const key = await getEncryptionKey(address, version);

  const iv = encrypted.subarray(0, 12) as Uint8Array<ArrayBuffer>;
  const encryptedData = encrypted.subarray(12) as Uint8Array<ArrayBuffer>;

  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encryptedData
  );

  return new Uint8Array(decryptedData);
}

/**
 * Checks if an encryption key exists in memory for the given wallet address.
 *
 * @param address - Wallet address
 * @param version - When omitted, checks the **v3** (`current`) key — the key
 *   write/OPFS/encrypt paths need. Callers that only need to read legacy
 *   `enc:v2:` data should pass `"v2"` explicitly. (#561 / PR #828)
 */
export function hasEncryptionKey(address: string, version?: EncryptionKeyVersion): boolean {
  return getStoredKeyByVersion(address, version ?? "v3") !== null;
}

/**
 * Seed (or merge) raw key hex into the in-memory store without signing.
 *
 * Used by platform polyfills that hydrate from SecureStore / keychain where
 * one version may be missing — callers must not require both versions to
 * exist before the other becomes usable (#561).
 *
 * Existing versions are preserved when the corresponding argument is omitted.
 * Pass an explicit empty merge is not supported; omit the field to leave it.
 *
 * Each provided key must be 64 hex characters (32-byte AES key).
 */
export function seedEncryptionKeys(
  address: string,
  keys: { legacy?: string; current?: string }
): void {
  if (!isValidWalletAddress(address)) {
    throw new Error(
      `Invalid wallet address: ${address}. Address must start with 0x and be 42 characters (0x + 40 hex characters).`
    );
  }
  if (!keys.legacy && !keys.current) {
    throw new Error("seedEncryptionKeys: at least one of legacy or current is required");
  }
  if (keys.legacy !== undefined) {
    assertAes256KeyHex("legacy", keys.legacy);
  }
  if (keys.current !== undefined) {
    assertAes256KeyHex("current", keys.current);
  }

  const existing = encryptionKeyStore.get(address);
  const next: StoredKeys = {
    legacy: keys.legacy ?? existing?.legacy,
    current: keys.current ?? existing?.current,
  };
  setStoredKey(address, next);

  if (keys.legacy !== undefined) cryptoKeyCache.delete(`${address}:v2`);
  if (keys.current !== undefined) cryptoKeyCache.delete(`${address}:v3`);

  refreshCandidatesByAddress.delete(address);
  divergentDeriveAddresses.delete(address);

  notifyKeyAvailable(address);
}

const AES_256_KEY_HEX = /^[0-9a-fA-F]{64}$/;

function assertAes256KeyHex(field: string, value: string): void {
  if (!AES_256_KEY_HEX.test(value)) {
    throw new Error(
      `seedEncryptionKeys: ${field} must be 64 hex characters (32-byte AES key), got length ${value.length}`
    );
  }
}

async function encryptBytesWithKey(
  plaintext: string | Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> {
  const plaintextBytes =
    typeof plaintext === "string" ? SHARED_TEXT_ENCODER.encode(plaintext) : plaintext;

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    plaintextBytes as Uint8Array<ArrayBuffer>
  );

  const encryptedBytes = new Uint8Array(encryptedData);
  const combined = new Uint8Array(iv.length + encryptedBytes.length);
  combined.set(iv, 0);
  combined.set(encryptedBytes, iv.length);
  return combined;
}

/**
 * Encrypts data using a pre-fetched CryptoKey.
 * Use this for batch operations to avoid repeated key lookups.
 *
 * @param plaintext - The data to encrypt (string or Uint8Array)
 * @param key - The CryptoKey for AES-GCM encryption
 * @returns Encrypted data as hex string (IV + ciphertext + auth tag)
 * @internal
 */
export async function encryptDataWithKey(
  plaintext: string | Uint8Array,
  key: CryptoKey
): Promise<string> {
  return bytesToHex(await encryptBytesWithKey(plaintext, key));
}

/**
 * Decrypts data using a pre-fetched CryptoKey.
 * Use this for batch operations to avoid repeated key lookups.
 *
 * @param encryptedHex - Encrypted data as hex string (IV + ciphertext + auth tag)
 * @param key - The CryptoKey for AES-GCM decryption
 * @returns Decrypted data as string
 * @internal
 */
export async function decryptDataWithKey(encryptedHex: string, key: CryptoKey): Promise<string> {
  const combined = hexToBytes(encryptedHex);

  const iv = combined.subarray(0, 12) as Uint8Array<ArrayBuffer>;
  const encryptedData = combined.subarray(12) as Uint8Array<ArrayBuffer>;

  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encryptedData
  );

  return SHARED_TEXT_DECODER.decode(decryptedData);
}

/**
 * Batch encrypt multiple values efficiently with a single key lookup.
 * Much faster than calling encryptData for each value individually.
 *
 * @param values - Array of plaintext values to encrypt
 * @param address - The wallet address associated with the encryption key
 * @returns Array of encrypted values as hex strings
 * @throws Error if encryption key is not found in memory
 *
 * @example
 * ```tsx
 * const encrypted = await encryptDataBatch(
 *   ["secret1", "secret2", "secret3"],
 *   walletAddress
 * );
 * ```
 *
 * @category Encryption
 */
export async function encryptDataBatch(
  values: (string | Uint8Array)[],
  address: string
): Promise<string[]> {
  if (!isValidWalletAddress(address)) {
    throw new Error(
      `Invalid wallet address: ${address}. Address must start with 0x and be 42 characters (0x + 40 hex characters).`
    );
  }

  const key = await getEncryptionKey(address);

  return Promise.all(values.map((value) => encryptDataWithKey(value, key)));
}

/**
 * Batch decrypt multiple values efficiently with a single key lookup.
 * Much faster than calling decryptData for each value individually.
 *
 * @param encryptedValues - Array of encrypted hex strings
 * @param address - The wallet address associated with the encryption key
 * @returns Array of decrypted plaintext values
 * @throws Error if encryption key is not found in memory or decryption fails
 *
 * @example
 * ```tsx
 * const decrypted = await decryptDataBatch(
 *   [encrypted1, encrypted2, encrypted3],
 *   walletAddress
 * );
 * ```
 *
 * @category Encryption
 */
export async function decryptDataBatch(
  encryptedValues: string[],
  address: string
): Promise<string[]> {
  const key = await getEncryptionKey(address);

  return Promise.all(encryptedValues.map((value) => decryptDataWithKey(value, key)));
}

/**
 * Options for signing messages.
 */
export interface SignMessageOptions {
  /** Whether to show wallet UI during signing. Default: true */
  showWalletUIs?: boolean;
}

/**
 * Type for the signMessage function that client must provide.
 * This is typically from Privy's useSignMessage hook.
 *
 * The resolved value must be a hex signature (`0x`-prefixed or bare). A
 * non-hex string — including `String(uint8Array)` or a base58 signature —
 * throws from key derivation instead of becoming a zero-filled AES key.
 * Raw signature bytes go to {@link deriveKeyFromSignatureBytes}.
 */
export type SignMessageFn = (message: string, options?: SignMessageOptions) => Promise<string>;

/**
 * Type for embedded wallet signer function that enables silent signing.
 * For Privy embedded wallets, this can sign programmatically without user interaction
 * when configured correctly in the Privy dashboard.
 */
export type EmbeddedWalletSignerFn = (
  message: string,
  options?: SignMessageOptions
) => Promise<string>;

/**
 * Requests the user to sign a message to generate an encryption key.
 * If a key already exists in memory for the given wallet, resolves immediately
 * unless {@link RequestEncryptionKeyOptions.force} is set.
 *
 * Note: Keys are stored in memory only and do not persist across page reloads.
 * This is a security feature - users must sign once per session to derive their key.
 *
 * When a seeded/pinned store already has keys and the fresh derive does not
 * match any of them, the store is left unchanged and this resolves to `false`
 * (without firing {@link onKeyAvailable}). Callers that need write readiness
 * should check the return value or {@link hasEncryptionKey} before encrypting
 * so they can surface a re-unlock UI instead of failing downstream (#828).
 *
 * @param walletAddress - The wallet address to generate the key for
 * @param signMessage - Function to sign a message (returns signature hex string)
 * @param embeddedWalletSigner - Optional function for silent signing with embedded wallets
 * @param options - Optional flags (e.g. force re-derive)
 * @returns `true` when keys are available after the call; `false` when a
 *   divergent derive left the store unchanged (or the session was torn down
 *   mid-flight).
 */
export async function requestEncryptionKey(
  walletAddress: string,
  signMessage: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn,
  options?: RequestEncryptionKeyOptions
): Promise<boolean> {
  if (!isValidWalletAddress(walletAddress)) {
    throw new Error(
      `Invalid wallet address: ${walletAddress}. Address must start with 0x and be 42 characters (0x + 40 hex characters).`
    );
  }

  if (
    !options?.force &&
    getStoredKeyByVersion(walletAddress, "v3") &&
    getStoredKeyByVersion(walletAddress, "v2")
  ) {
    return true;
  }

  if (!options?.force && divergentDeriveAddresses.has(walletAddress)) {
    return false;
  }

  if (!options?.force) {
    const pending = pendingKeyRequests.get(walletAddress);
    if (pending) {
      return pending;
    }
  }

  const startEpoch = sessionEpoch;
  const promise = (async (): Promise<boolean> => {
    const signOptions: SignMessageOptions = { showWalletUIs: false };
    let signature: string;
    try {
      if (embeddedWalletSigner) {
        signature = await embeddedWalletSigner(SIGN_MESSAGE, signOptions);
      } else {
        signature = await signMessage(SIGN_MESSAGE, signOptions);
      }
    } catch (error) {
      if (embeddedWalletSigner && error instanceof Error) {
        getLogger().warn(
          "Embedded wallet signing failed, falling back to standard signMessage:",
          error.message
        );
        signature = await signMessage(SIGN_MESSAGE, signOptions);
      } else {
        throw error;
      }
    }

    const [legacyKey, currentKey] = await Promise.all([
      deriveKeyFromSignature(signature),
      deriveKeyFromSignatureV3(signature),
    ]);

    if (sessionEpoch !== startEpoch) {
      return false;
    }

    const existing = encryptionKeyStore.get(walletAddress);
    if (!options?.force && existing && (existing.legacy || existing.current)) {
      const matchesCurrent = Boolean(existing.current && existing.current === currentKey);
      const matchesLegacy = Boolean(existing.legacy && existing.legacy === legacyKey);
      if (!matchesCurrent && !matchesLegacy) {
        getLogger().warn(
          "requestEncryptionKey: derived keys do not match existing store; leaving unchanged"
        );
        divergentDeriveAddresses.add(walletAddress);
        return false;
      }
      setStoredKey(walletAddress, {
        legacy: existing.legacy ?? legacyKey,
        current: existing.current ?? currentKey,
      });
    } else {
      setStoredKey(walletAddress, { legacy: legacyKey, current: currentKey });
    }
    cryptoKeyCache.delete(`${walletAddress}:v2`);
    cryptoKeyCache.delete(`${walletAddress}:v3`);
    refreshCandidatesByAddress.delete(walletAddress);
    divergentDeriveAddresses.delete(walletAddress);

    notifyKeyAvailable(walletAddress);
    return true;
  })();

  pendingKeyRequests.set(walletAddress, promise);
  try {
    return await promise;
  } finally {
    if (pendingKeyRequests.get(walletAddress) === promise) {
      pendingKeyRequests.delete(walletAddress);
    }
  }
}

/**
 * Re-derive encryption keys from a fresh signature and commit them **only if**
 * they successfully decrypt `probeCiphertext` (a prefixed `enc:v2:` / `enc:v3:`
 * value). If they do not, the existing in-memory keys are left untouched.
 *
 * Concurrent calls for the same wallet share one sign+derive. Each caller then
 * probes **its own** ciphertext against those candidates, so mixed-era messages
 * in one `Promise.all` batch can still recover when only the leader's probe
 * misses (#828 review). Failed candidates are memoized for the session so
 * pagination does not re-prompt on every page when the wallet has changed.
 *
 * @returns true when keys were refreshed (probe decrypted); false when the
 *   probe failed under the candidate keys (store unchanged) or the probe was
 *   not encrypted.
 */
export async function refreshEncryptionKeyIfMatches(
  walletAddress: string,
  probeCiphertext: string,
  signMessage: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<boolean> {
  if (!isValidWalletAddress(walletAddress)) {
    throw new Error(
      `Invalid wallet address: ${walletAddress}. Address must start with 0x and be 42 characters (0x + 40 hex characters).`
    );
  }

  const parsed = parsePrefixedCiphertext(probeCiphertext);
  if (!parsed) {
    return false;
  }

  const cached = refreshCandidatesByAddress.get(walletAddress);
  if (cached) {
    return tryCommitCandidatesIfProbeMatches(walletAddress, parsed, cached);
  }

  let derivePromise = pendingCandidateDerives.get(walletAddress);
  if (!derivePromise) {
    derivePromise = (async () => {
      const candidates = await deriveRefreshCandidates(signMessage, embeddedWalletSigner);
      if (candidates) {
        refreshCandidatesByAddress.set(walletAddress, candidates);
      }
      return candidates;
    })().finally(() => {
      if (pendingCandidateDerives.get(walletAddress) === derivePromise) {
        pendingCandidateDerives.delete(walletAddress);
      }
    });
    pendingCandidateDerives.set(walletAddress, derivePromise);
  }

  const candidates = await derivePromise;
  if (!candidates) {
    return false;
  }

  return tryCommitCandidatesIfProbeMatches(walletAddress, parsed, candidates);
}

function parsePrefixedCiphertext(
  probeCiphertext: string
): { version: EncryptionKeyVersion; encryptedData: string } | null {
  const version = probeCiphertext.startsWith("enc:v3:")
    ? ("v3" as const)
    : probeCiphertext.startsWith("enc:v2:")
      ? ("v2" as const)
      : null;
  if (!version) return null;
  const encryptedData = probeCiphertext.slice(
    version === "v3" ? "enc:v3:".length : "enc:v2:".length
  );
  if (encryptedData.length < 56 || !/^[0-9a-f]+$/i.test(encryptedData)) {
    return null;
  }
  return { version, encryptedData };
}

async function deriveRefreshCandidates(
  signMessage: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<DerivedKeyPair | null> {
  const startEpoch = sessionEpoch;
  const signOptions: SignMessageOptions = { showWalletUIs: false };
  let signature: string;
  try {
    if (embeddedWalletSigner) {
      signature = await embeddedWalletSigner(SIGN_MESSAGE, signOptions);
    } else {
      signature = await signMessage(SIGN_MESSAGE, signOptions);
    }
  } catch (error) {
    if (embeddedWalletSigner && error instanceof Error) {
      getLogger().warn(
        "Embedded wallet signing failed during key refresh, falling back to standard signMessage:",
        error.message
      );
      signature = await signMessage(SIGN_MESSAGE, signOptions);
    } else {
      throw error;
    }
  }

  const [legacyKey, currentKey] = await Promise.all([
    deriveKeyFromSignature(signature),
    deriveKeyFromSignatureV3(signature),
  ]);

  if (sessionEpoch !== startEpoch) {
    return null;
  }

  return { legacy: legacyKey, current: currentKey };
}

async function tryCommitCandidatesIfProbeMatches(
  walletAddress: string,
  parsed: { version: EncryptionKeyVersion; encryptedData: string },
  candidates: DerivedKeyPair
): Promise<boolean> {
  const candidateHex = parsed.version === "v2" ? candidates.legacy : candidates.current;
  const keyBytes = hexToBytes(candidateHex);
  const candidateCryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

  try {
    await decryptDataWithKey(parsed.encryptedData, candidateCryptoKey);
  } catch {
    getLogger().warn(
      "refreshEncryptionKeyIfMatches: candidate keys failed to decrypt probe; leaving store unchanged"
    );
    return false;
  }

  setStoredKey(walletAddress, { legacy: candidates.legacy, current: candidates.current });
  cryptoKeyCache.delete(`${walletAddress}:v2`);
  cryptoKeyCache.delete(`${walletAddress}:v3`);
  divergentDeriveAddresses.delete(walletAddress);
  notifyKeyAvailable(walletAddress);
  return true;
}

const KEYPAIR_STORAGE_PREFIX = "ecdh_keypair_";

async function persistKeyPair(address: string, startEpoch: number): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const keyPair = getStoredKeyPair(address);
  if (!keyPair) {
    throw new Error("Key pair not found in memory. Cannot persist.");
  }

  const keys = encryptionKeyStore.get(address);
  if (!keys) {
    throw new Error("Encryption key not found. Cannot persist keypair without encryption key.");
  }

  try {
    const cryptoApi =
      (typeof globalThis !== "undefined" && globalThis.crypto) ||
      (typeof window !== "undefined" && window.crypto) ||
      crypto;

    const privateKeyJwk = await cryptoApi.subtle.exportKey("jwk", keyPair.privateKey);

    const publicKeyJwk = await cryptoApi.subtle.exportKey("jwk", keyPair.publicKey);

    const keyPairData = {
      privateKey: privateKeyJwk,
      publicKey: publicKeyJwk,
    };

    const key = await getEncryptionKey(address);
    const plaintextBytes = SHARED_TEXT_ENCODER.encode(JSON.stringify(keyPairData));

    const iv = cryptoApi.getRandomValues(new Uint8Array(12));

    const encryptedData = await cryptoApi.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      plaintextBytes.buffer
    );

    const encryptedBytes = new Uint8Array(encryptedData);
    const combined = new Uint8Array(iv.length + encryptedBytes.length);
    combined.set(iv, 0);
    combined.set(encryptedBytes, iv.length);

    const storageKey = `${KEYPAIR_STORAGE_PREFIX}${address}`;
    const encryptedHex = bytesToHex(combined);
    if (sessionEpoch !== startEpoch) {
      return;
    }
    localStorage.setItem(storageKey, encryptedHex);
  } catch (err) {
    // eslint-disable-next-line preserve-caught-error -- ES2020 target doesn't support ErrorOptions
    throw new Error(
      `Failed to persist keypair: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function loadPersistedKeyPair(address: string): Promise<CryptoKeyPair | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = `${KEYPAIR_STORAGE_PREFIX}${address}`;
  const encryptedHex = localStorage.getItem(storageKey);

  if (!encryptedHex) {
    return null;
  }

  try {
    const keys = encryptionKeyStore.get(address);
    if (!keys) {
      return null;
    }

    const combined = hexToBytes(encryptedHex);
    const iv = combined.subarray(0, 12) as Uint8Array<ArrayBuffer>;
    const encryptedData = combined.subarray(12) as Uint8Array<ArrayBuffer>;

    let decryptedData: ArrayBuffer;
    try {
      const key = await getEncryptionKey(address, "v3");
      decryptedData = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encryptedData);
    } catch {
      const legacyKey = await getEncryptionKey(address, "v2");
      decryptedData = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        legacyKey,
        encryptedData
      );
    }

    const decryptedJson = SHARED_TEXT_DECODER.decode(decryptedData);
    const keyPairData = JSON.parse(decryptedJson) as {
      privateKey: JsonWebKey;
      publicKey: JsonWebKey;
    };

    const privateKey = await crypto.subtle.importKey(
      "jwk",
      keyPairData.privateKey,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveBits", "deriveKey"]
    );

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      keyPairData.publicKey,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      []
    );

    return {
      privateKey,
      publicKey,
    };
  } catch (error) {
    localStorage.removeItem(storageKey);
    getLogger().warn(
      `Failed to load persisted keypair for ${address}: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

function clearPersistedKeyPair(address: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const storageKey = `${KEYPAIR_STORAGE_PREFIX}${address}`;
  localStorage.removeItem(storageKey);
}

async function getKeyPair(
  address: string,
  signMessage: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<CryptoKeyPair> {
  const existingKeyPair = getStoredKeyPair(address);
  if (existingKeyPair) {
    return existingKeyPair;
  }

  await requestKeyPair(address, signMessage, embeddedWalletSigner);
  const keyPair = getStoredKeyPair(address);
  if (!keyPair) {
    throw new Error("Key pair not found. Please sign a message to generate your key pair.");
  }
  return keyPair;
}

/**
 * Requests the user to sign a message to generate an ECDH key pair.
 * If a key pair already exists in memory for the given wallet, resolves immediately.
 *
 * Note: Key pairs are stored in memory only and do not persist across page reloads.
 * This is a security feature - users must sign once per session to derive their key pair.
 *
 * @param walletAddress - The wallet address to generate the key pair for
 * @param signMessage - Function to sign a message (returns signature hex string)
 * @param embeddedWalletSigner - Optional function for silent signing with embedded wallets
 * @returns Promise that resolves when the key pair is available
 */
export async function requestKeyPair(
  walletAddress: string,
  signMessage: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<void> {
  if (!isValidWalletAddress(walletAddress)) {
    throw new Error(
      `Invalid wallet address: ${walletAddress}. Address must start with 0x and be 42 characters (0x + 40 hex characters).`
    );
  }

  const existingKeyPair = getStoredKeyPair(walletAddress);
  if (existingKeyPair) {
    return;
  }

  const startEpoch = sessionEpoch;

  try {
    const persistedKeyPair = await loadPersistedKeyPair(walletAddress);
    if (persistedKeyPair) {
      if (sessionEpoch !== startEpoch) return;
      setStoredKeyPair(walletAddress, persistedKeyPair);
      return;
    }
  } catch (error) {
    getLogger().warn(
      `Failed to load persisted keypair, generating new one: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const signOptions: SignMessageOptions = { showWalletUIs: false };
  let signature: string;
  try {
    if (embeddedWalletSigner) {
      signature = await embeddedWalletSigner(SIGN_MESSAGE, signOptions);
    } else {
      signature = await signMessage(SIGN_MESSAGE, signOptions);
    }
  } catch (error) {
    if (embeddedWalletSigner && error instanceof Error) {
      getLogger().warn(
        "Embedded wallet signing failed, falling back to standard signMessage:",
        error.message
      );
      signature = await signMessage(SIGN_MESSAGE, signOptions);
    } else {
      throw error;
    }
  }

  const keyPair = await deriveKeyPairFromSignature(signature, walletAddress);

  if (sessionEpoch !== startEpoch) {
    return;
  }

  setStoredKeyPair(walletAddress, keyPair);

  try {
    const keys = encryptionKeyStore.get(walletAddress);
    if (keys) {
      await persistKeyPair(walletAddress, startEpoch);
    }
  } catch (error) {
    getLogger().warn(
      `Failed to persist keypair (will regenerate on next session): ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Exports the public key for a wallet address as SPKI format (base64)
 * @param address - The wallet address
 * @param signMessage - Function to sign a message (returns signature hex string)
 * @param embeddedWalletSigner - Optional function for silent signing with embedded wallets
 * @returns The public key as base64-encoded SPKI string
 */
export async function exportPublicKey(
  address: string,
  signMessage: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<string> {
  const keyPair = await getKeyPair(address, signMessage, embeddedWalletSigner);

  const spkiBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const spkiBytes = new Uint8Array(spkiBuffer);

  return btoa(String.fromCharCode(...spkiBytes));
}

/**
 * Checks if a key pair exists in memory for the given wallet address
 * @param address - The wallet address
 * @returns True if key pair exists, false otherwise
 */
export function hasKeyPair(address: string): boolean {
  return getStoredKeyPair(address) !== null;
}

/**
 * Clears the key pair for a wallet address from memory and localStorage
 * @param address - The wallet address
 */
export function clearKeyPair(address: string): void {
  keyPairStore.delete(address);
  clearPersistedKeyPair(address);
}

/**
 * Clears all key pairs from memory and any persisted entries in localStorage.
 *
 * Matches the persistence behavior of the per-address {@link clearKeyPair};
 * without this, `clearAllKeyPairs()` would leave `ecdh_keypair_*` ciphertext
 * behind in storage while `clearKeyPair(address)` removes it.
 */
export function clearAllKeyPairs(): void {
  keyPairStore.clear();

  if (typeof localStorage !== "undefined") {
    try {
      const staleKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith(KEYPAIR_STORAGE_PREFIX)) {
          staleKeys.push(key);
        }
      }
      for (const key of staleKeys) {
        try {
          localStorage.removeItem(key);
        } catch {
          /* ignore per-entry storage errors */
        }
      }
    } catch {
      /* ignore storage errors (e.g. localStorage access denied) */
    }
  }
}

/**
 * Result returned by the useEncryption hook.
 * @category Hooks
 */
export interface UseEncryptionResult {
  /** Request and generate an encryption key for a wallet address */
  requestEncryptionKey: (walletAddress: string) => Promise<boolean>;
  /** Request and generate an ECDH key pair for a wallet address */
  requestKeyPair: (walletAddress: string) => Promise<void>;
  /** Export the public key for a wallet address as base64-encoded SPKI */
  exportPublicKey: (walletAddress: string) => Promise<string>;
  /** Check if a key pair exists in memory for a wallet address */
  hasKeyPair: (walletAddress: string) => boolean;
  /** Clear the key pair for a wallet address from memory */
  clearKeyPair: (walletAddress: string) => void;
}

/**
 * Hook that provides encryption key management for securing local data.
 *
 * This hook helps you encrypt and decrypt data using a key derived from a wallet
 * signature. It requires `@privy-io/react-auth` for wallet authentication. Keys are
 * stored in memory only and do not persist across page reloads for security.
 *
 * ## How it works
 *
 * 1. User signs a message with their wallet
 * 2. The signature is used to deterministically derive an encryption key
 * 3. The key is stored in memory (not localStorage) for the session
 * 4. Data can be encrypted/decrypted using this key
 * 5. On page reload, user must sign again to derive the key
 *
 * ## Security Features
 *
 * - **In-memory only**: Keys never touch disk or localStorage
 * - **Deterministic**: Same wallet + signature always generates same key
 * - **Session-scoped**: Keys cleared on page reload
 * - **XSS-resistant**: Keys not accessible after page reload
 *
 * ## Embedded Wallet Support
 *
 * For Privy embedded wallets, you can provide an `embeddedWalletSigner` function
 * to enable silent signing without user confirmation modals. This is useful for
 * deterministic key generation that should happen automatically.
 *
 * @param signMessage - Function to sign a message (from Privy's useSignMessage hook)
 * @param embeddedWalletSigner - Optional function for silent signing with embedded wallets
 * @returns Functions to request encryption keys and manage key pairs
 *
 * @example
 * ```tsx
 * import { usePrivy, useWallets } from "@privy-io/react-auth";
 * import { useEncryption, encryptData, decryptData } from "@anuma/sdk/react";
 *
 * function SecureComponent() {
 *   const { user, signMessage } = usePrivy();
 *   const { wallets } = useWallets();
 *   const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
 *
 *   // Create silent signer for embedded wallets
 *   const embeddedSigner = useCallback(async (message: string) => {
 *     if (embeddedWallet) {
 *       const { signature } = await embeddedWallet.signMessage({ message });
 *       return signature;
 *     }
 *     throw new Error('No embedded wallet');
 *   }, [embeddedWallet]);
 *
 *   const { requestEncryptionKey } = useEncryption(signMessage, embeddedSigner);
 *
 *   // Request encryption key when user is authenticated
 *   useEffect(() => {
 *     if (user?.wallet?.address) {
 *       // This will use silent signing for embedded wallets
 *       await requestEncryptionKey(user.wallet.address);
 *     }
 *   }, [user]);
 *
 *   // Encrypt data
 *   const saveSecret = async (text: string) => {
 *     const encrypted = await encryptData(text, user.wallet.address);
 *     localStorage.setItem("mySecret", encrypted);
 *   };
 *
 *   // Decrypt data
 *   const loadSecret = async () => {
 *     const encrypted = localStorage.getItem("mySecret");
 *     if (encrypted) {
 *       const decrypted = await decryptData(encrypted, user.wallet.address);
 *       console.log(decrypted);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={() => saveSecret("my secret data")}>Encrypt & Save</button>
 *       <button onClick={loadSecret}>Load & Decrypt</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Standard usage with external wallets (shows confirmation modal)
 * import { usePrivy } from "@privy-io/react-auth";
 * import { useEncryption, encryptData, decryptData } from "@anuma/sdk/react";
 *
 * function SecureComponent() {
 *   const { user, signMessage } = usePrivy();
 *   const { requestEncryptionKey } = useEncryption(signMessage);
 *
 *   // Request encryption key when user is authenticated
 *   useEffect(() => {
 *     if (user?.wallet?.address) {
 *       // This will prompt user to sign if key doesn't exist
 *       await requestEncryptionKey(user.wallet.address);
 *     }
 *   }, [user]);
 * }
 * ```
 *
 * @example
 * ```tsx
 * // ECDH key pair generation for end-to-end encryption
 * import { usePrivy } from "@privy-io/react-auth";
 * import { useEncryption } from "@anuma/sdk/react";
 *
 * function E2EEComponent() {
 *   const { signMessage } = usePrivy();
 *   const { requestKeyPair, exportPublicKey } = useEncryption(signMessage);
 *
 *   const setupEncryption = async (walletAddress: string) => {
 *     // Generate deterministic ECDH key pair from wallet signature
 *     await requestKeyPair(walletAddress);
 *
 *     // Export public key to share with others
 *     const publicKey = await exportPublicKey(walletAddress);
 *     console.log("Share this public key:", publicKey);
 *   };
 * }
 * ```
 *
 * @category Hooks
 */
export function useEncryption(
  signMessage: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): UseEncryptionResult {
  return {
    requestEncryptionKey: (walletAddress: string) =>
      requestEncryptionKey(walletAddress, signMessage, embeddedWalletSigner),
    requestKeyPair: (walletAddress: string) =>
      requestKeyPair(walletAddress, signMessage, embeddedWalletSigner),
    exportPublicKey: (walletAddress: string) =>
      exportPublicKey(walletAddress, signMessage, embeddedWalletSigner),
    hasKeyPair: (walletAddress: string) => hasKeyPair(walletAddress),
    clearKeyPair: (walletAddress: string) => clearKeyPair(walletAddress),
  };
}
