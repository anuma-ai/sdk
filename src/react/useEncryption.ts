"use client";

import {
  storeKey as idbStoreKey,
  loadKey as idbLoadKey,
  loadAllEntries as idbLoadAllEntries,
  removeKey as idbRemoveKey,
  removeAllKeys as idbRemoveAllKeys,
} from "./encryptionKeyStorage";

export const SIGN_MESSAGE =
  "The app is asking you to sign this message to generate a key, which will be used to encrypt data.";

/**
 * Primary in-memory cache for non-extractable CryptoKey objects.
 * The CryptoKey handles cannot be exported or serialized — an XSS attacker
 * can use them for encrypt/decrypt on the current page but cannot extract
 * the raw key bytes.
 */
const cryptoKeyCache = new Map<string, CryptoKey>();

/**
 * Set of wallet addresses whose keys are known to exist (in-memory or IndexedDB).
 * Enables synchronous `hasEncryptionKey()` checks without async IndexedDB reads.
 */
const knownAddresses = new Set<string>();

/**
 * Callbacks to notify when an encryption key becomes available for a wallet.
 * Used by the queue system to auto-flush operations once keys are ready.
 */
const keyAvailableCallbacks = new Map<string, Set<() => void>>();

/**
 * Register a callback that fires when an encryption key becomes available for an address.
 * If the key is already available, the callback fires immediately.
 * @returns Unsubscribe function
 */
export function onKeyAvailable(address: string, callback: () => void): () => void {
  // If key is already available, fire immediately
  if (knownAddresses.has(address)) {
    try { callback(); } catch { /* ignore */ }
    // Still register for future re-availability (e.g., after key clear + re-derive)
  }

  let callbacks = keyAvailableCallbacks.get(address);
  if (!callbacks) {
    callbacks = new Set();
    keyAvailableCallbacks.set(address, callbacks);
  }
  callbacks.add(callback);

  return () => {
    callbacks!.delete(callback);
    if (callbacks!.size === 0) {
      keyAvailableCallbacks.delete(address);
    }
  };
}

/**
 * Notify all registered listeners that an encryption key is now available.
 * Called internally after requestEncryptionKey succeeds.
 */
function notifyKeyAvailable(address: string): void {
  const callbacks = keyAvailableCallbacks.get(address);
  if (callbacks) {
    for (const cb of callbacks) {
      try { cb(); } catch { /* ignore listener errors */ }
    }
  }
}

/**
 * In-memory storage for ECDH key pairs.
 * Key pairs are stored per wallet address and only persist for the session.
 * Private keys are never stored to disk and are not accessible to XSS attacks after page reload.
 */
const keyPairStore = new Map<string, CryptoKeyPair>();

/**
 * Stores a CryptoKey for a wallet address in memory and persists to IndexedDB.
 * Broadcasts availability to sibling tabs after the IndexedDB write commits.
 * @param address - The wallet address
 * @param cryptoKey - The non-extractable CryptoKey
 */
async function setStoredKey(address: string, cryptoKey: CryptoKey): Promise<void> {
  cryptoKeyCache.set(address, cryptoKey);
  knownAddresses.add(address);

  // Persist to IndexedDB — await so the broadcast only fires after commit
  try {
    await idbStoreKey(address, cryptoKey);
  } catch {
    // IndexedDB unavailable (React Native, private browsing, etc.)
  }

  // Notify sibling tabs via BroadcastChannel (after IDB commit)
  try {
    const bc = new BroadcastChannel("reverbia-encryption-keys");
    bc.postMessage({ type: "key-available", address });
    bc.close();
  } catch {
    // BroadcastChannel unavailable
  }
}

/**
 * Loads a CryptoKey from IndexedDB into the in-memory cache.
 * Returns the CryptoKey or null if not found.
 * @param address - The wallet address
 */
async function loadStoredKey(address: string): Promise<CryptoKey | null> {
  // Fast path: already in memory
  const cached = cryptoKeyCache.get(address);
  if (cached) return cached;

  // Slow path: check IndexedDB
  try {
    const key = await idbLoadKey(address);
    if (key) {
      cryptoKeyCache.set(address, key);
      knownAddresses.add(address);
      return key;
    }
  } catch {
    // IndexedDB unavailable
  }

  return null;
}

/**
 * Clears the encryption key for a wallet address from memory and IndexedDB.
 * @param address - The wallet address
 */
export function clearEncryptionKey(address: string): void {
  cryptoKeyCache.delete(address);
  knownAddresses.delete(address);

  // Fire-and-forget IndexedDB cleanup
  try {
    idbRemoveKey(address).catch(() => {});
  } catch {
    // IndexedDB unavailable
  }
}

/**
 * Clears all encryption keys from memory and IndexedDB.
 */
export function clearAllEncryptionKeys(): void {
  cryptoKeyCache.clear();
  knownAddresses.clear();

  // Fire-and-forget IndexedDB cleanup
  try {
    idbRemoveAllKeys().catch(() => {});
  } catch {
    // IndexedDB unavailable
  }
}

/**
 * Converts a hex string to Uint8Array bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Converts Uint8Array bytes to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validates a wallet address format
 * @param address - The wallet address to validate
 * @returns true if the address is valid (starts with 0x and is 42 characters)
 */
function isValidWalletAddress(address: string): boolean {
  // Must start with 0x and be exactly 42 characters (0x + 40 hex chars)
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Derives a non-extractable AES-GCM CryptoKey from a signature using SHA-256.
 * The raw key bytes exist only as an ArrayBuffer between digest() and importKey(),
 * then are garbage collected. The returned CryptoKey handle cannot be exported.
 */
async function deriveKeyFromSignature(signature: string): Promise<CryptoKey> {
  // 1. Convert hex signature to bytes
  const sigBytes = hexToBytes(signature);

  // 2. Hash with SHA-256 to get 32-byte key material
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    sigBytes.buffer as ArrayBuffer
  );

  // 3. Import as non-extractable CryptoKey — raw bytes are never exposed to JS
  return crypto.subtle.importKey(
    "raw",
    hashBuffer,
    { name: "AES-GCM" },
    false, // NON-EXTRACTABLE
    ["encrypt", "decrypt"]
  );
}

/**
 * Gets the stored key pair for a wallet address from in-memory storage
 * @param address - The wallet address
 * @returns The stored key pair or null if not available
 */
function getStoredKeyPair(address: string): CryptoKeyPair | null {
  return keyPairStore.get(address) ?? null;
}

/**
 * Stores a key pair for a wallet address in memory
 * @param address - The wallet address
 * @param keyPair - The ECDH key pair
 */
function setStoredKeyPair(address: string, keyPair: CryptoKeyPair): void {
  keyPairStore.set(address, keyPair);
}

/**
 * Derives an ECDH P-256 key pair from a signature using HKDF
 * The key pair is deterministically generated from the signature and wallet address.
 * @param signature - The wallet signature
 * @param address - The wallet address (used as HKDF salt for domain separation)
 */
async function deriveKeyPairFromSignature(
  signature: string,
  address: string
): Promise<CryptoKeyPair> {
  // 1. Convert hex signature to bytes
  const sigBytes = hexToBytes(signature);

  // 2. Hash with SHA-256 to get 32-byte seed
  const seedBuffer = await crypto.subtle.digest(
    "SHA-256",
    sigBytes.buffer as ArrayBuffer
  );
  const seed = new Uint8Array(seedBuffer);

  // 3. Use HKDF to derive key material for ECDH private key
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    seed.buffer as ArrayBuffer,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  // 4. Derive 32 bytes for ECDH P-256 private key
  // Use wallet address as salt for domain separation while maintaining determinism
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode(address.toLowerCase()), // Wallet address as salt
      info: new TextEncoder().encode("ECDH-P256-KeyPair"), // Context info
    },
    hkdfKey,
    256 // 32 bytes = 256 bits
  );

  const privateKeyBytes = new Uint8Array(derivedBits);

  // 5. Ensure the private key is non-zero (P-256 requirement)
  if (privateKeyBytes.every((b) => b === 0)) {
    privateKeyBytes[31] = 1;
  }

  // 6. Import as ECDH private key using PKCS#8 format
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    await createPKCS8PrivateKey(privateKeyBytes),
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true, // extractable so we can export to JWK
    ["deriveBits", "deriveKey"]
  );

  // 7. Export private key as JWK to get public key coordinates
  // JWK format includes both private and public key information
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", privateKey);
  
  if (!privateKeyJwk.x || !privateKeyJwk.y) {
    throw new Error("Failed to derive public key from private key");
  }

  // 8. Import the public key from JWK
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
    true, // extractable
    [] // no key usage needed for public key
  );

  return {
    privateKey,
    publicKey,
  };
}

/**
 * Creates a minimal PKCS#8 structure for an ECDH P-256 private key
 * PKCS#8 format: SEQUENCE { version, AlgorithmIdentifier, OCTET STRING (ECPrivateKey) }
 */
async function createPKCS8PrivateKey(
  privateKeyBytes: Uint8Array
): Promise<ArrayBuffer> {
  // OIDs for ECDH P-256
  // ecPublicKey: 1.2.840.10045.2.1
  const ecPublicKeyOID = new Uint8Array([
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
  ]);
  // prime256v1: 1.2.840.10045.3.1.7
  const prime256v1OID = new Uint8Array([
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
  ]);

  // ECPrivateKey structure: SEQUENCE { version INTEGER(1), privateKey OCTET STRING }
  const version = new Uint8Array([0x02, 0x01, 0x01]); // INTEGER 1
  const privateKeyOctet = new Uint8Array([
    0x04, 0x20, // OCTET STRING, 32 bytes
    ...privateKeyBytes,
  ]);

  // Build ECPrivateKey SEQUENCE
  const ecPrivateKeyContent = new Uint8Array([
    ...version,
    ...privateKeyOctet,
  ]);
  const ecPrivateKeyLength = ecPrivateKeyContent.length;
  const ecPrivateKeySeq = new Uint8Array([
    0x30, // SEQUENCE
    ecPrivateKeyLength, // Length
    ...ecPrivateKeyContent,
  ]);

  // Wrap ECPrivateKey in OCTET STRING
  const wrappedPrivateKey = new Uint8Array([
    0x04, // OCTET STRING
    ecPrivateKeySeq.length, // Length
    ...ecPrivateKeySeq,
  ]);

  // AlgorithmIdentifier: SEQUENCE { algorithm OID, parameters OID }
  const algorithmIdContent = new Uint8Array([
    ...ecPublicKeyOID,
    ...prime256v1OID,
  ]);
  const algorithmIdLength = algorithmIdContent.length;
  const algorithmIdSeq = new Uint8Array([
    0x30, // SEQUENCE
    algorithmIdLength, // Length
    ...algorithmIdContent,
  ]);

  // Full PKCS#8: SEQUENCE { version INTEGER(0), algorithmId, privateKey }
  const pkcs8Version = new Uint8Array([0x02, 0x01, 0x00]); // INTEGER 0
  const pkcs8Content = new Uint8Array([
    ...pkcs8Version,
    ...algorithmIdSeq,
    ...wrappedPrivateKey,
  ]);
  const pkcs8ContentLength = pkcs8Content.length;
  const pkcs8Seq = new Uint8Array([
    0x30, // SEQUENCE
    pkcs8ContentLength, // Length
    ...pkcs8Content,
  ]);

  return pkcs8Seq.buffer;
}


/**
 * Gets the non-extractable CryptoKey for a wallet address.
 * Checks in-memory cache first, then falls back to IndexedDB.
 * The key must have been previously requested via requestEncryptionKey.
 *
 * @param address - The wallet address
 * @returns The non-extractable CryptoKey for AES-GCM encryption/decryption
 * @throws Error if the key hasn't been requested yet
 */
export async function getEncryptionKey(address: string): Promise<CryptoKey> {
  // Fast path: in-memory cache
  const cachedKey = cryptoKeyCache.get(address);
  if (cachedKey) {
    return cachedKey;
  }

  // Slow path: try IndexedDB (handles page refresh recovery)
  const idbKey = await loadStoredKey(address);
  if (idbKey) {
    return idbKey;
  }

  throw new Error(
    "Encryption key not found. Please sign a message to generate your encryption key."
  );
}

/**
 * Encrypts data deterministically using AES-GCM with a deterministic IV
 * Same plaintext + address always produces same ciphertext (for queryable fields)
 */
export async function encryptDataDeterministic(
  plaintext: string | Uint8Array,
  address: string
): Promise<string> {
  // Validate wallet address format
  if (!isValidWalletAddress(address)) {
    throw new Error(
      `Invalid wallet address: ${address}. Address must start with 0x and be 42 characters (0x + 40 hex characters).`
    );
  }

  const key = await getEncryptionKey(address);

  // Convert plaintext to Uint8Array if it's a string
  const plaintextBytes =
    typeof plaintext === "string"
      ? new TextEncoder().encode(plaintext)
      : plaintext;

  // Derive deterministic IV from plaintext and address
  const input = `${address}:${typeof plaintext === "string" ? plaintext : new TextDecoder().decode(plaintext)}`;
  const inputBytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", inputBytes.buffer);
  const hashBytes = new Uint8Array(hashBuffer);
  const iv = hashBytes.slice(0, 12); // AES-GCM requires 12-byte IV

  // Encrypt the data
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    plaintextBytes.buffer as ArrayBuffer
  );

  // Combine IV + encrypted data (which includes auth tag)
  const encryptedBytes = new Uint8Array(encryptedData);
  const combined = new Uint8Array(iv.length + encryptedBytes.length);
  combined.set(iv, 0);
  combined.set(encryptedBytes, iv.length);

  // Return as hex string
  return bytesToHex(combined);
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
 * import { encryptData, requestEncryptionKey } from "@reverbia/sdk/react";
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
  // Validate wallet address format
  if (!isValidWalletAddress(address)) {
    throw new Error(
      `Invalid wallet address: ${address}. Address must start with 0x and be 42 characters (0x + 40 hex characters).`
    );
  }

  const key = await getEncryptionKey(address);
  return encryptDataWithKey(plaintext, key);
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
 * import { decryptData, requestEncryptionKey } from "@reverbia/sdk/react";
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
  address: string
): Promise<string> {
  const key = await getEncryptionKey(address);
  return decryptDataWithKey(encryptedHex, key);
}

/**
 * Decrypts data and returns as Uint8Array (for binary data)
 * @param encryptedHex - Encrypted data as hex string (IV + ciphertext + auth tag)
 * @returns Decrypted data as Uint8Array
 */
export async function decryptDataBytes(
  encryptedHex: string,
  address: string
): Promise<Uint8Array> {
  const key = await getEncryptionKey(address);

  // Convert hex to bytes
  const combined = hexToBytes(encryptedHex);

  // Extract IV (first 12 bytes) and encrypted data (rest)
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);

  // Decrypt the data
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
 * Checks if an encryption key exists (in-memory or known via IndexedDB) for the given wallet address.
 * This is synchronous — it checks the `knownAddresses` set which is populated on init and on key derivation.
 */
export function hasEncryptionKey(address: string): boolean {
  return knownAddresses.has(address);
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
  // Convert plaintext to Uint8Array if it's a string
  const plaintextBytes =
    typeof plaintext === "string"
      ? new TextEncoder().encode(plaintext)
      : plaintext;

  // Generate a random 12-byte IV (initialization vector)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the data
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    plaintextBytes.buffer as ArrayBuffer
  );

  // Combine IV + encrypted data (which includes auth tag)
  const encryptedBytes = new Uint8Array(encryptedData);
  const combined = new Uint8Array(iv.length + encryptedBytes.length);
  combined.set(iv, 0);
  combined.set(encryptedBytes, iv.length);

  // Return as hex string
  return bytesToHex(combined);
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
export async function decryptDataWithKey(
  encryptedHex: string,
  key: CryptoKey
): Promise<string> {
  // Convert hex to bytes
  const combined = hexToBytes(encryptedHex);

  // Extract IV (first 12 bytes) and encrypted data (rest)
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);

  // Decrypt the data
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encryptedData
  );

  // Convert decrypted bytes to string
  return new TextDecoder().decode(decryptedData);
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
  // Validate wallet address format
  if (!isValidWalletAddress(address)) {
    throw new Error(
      `Invalid wallet address: ${address}. Address must start with 0x and be 42 characters (0x + 40 hex characters).`
    );
  }

  // Get key once for all operations
  const key = await getEncryptionKey(address);

  // Encrypt all values in parallel
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
  // Get key once for all operations
  const key = await getEncryptionKey(address);

  // Decrypt all values in parallel
  return Promise.all(
    encryptedValues.map((value) => decryptDataWithKey(value, key))
  );
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
 */
export type SignMessageFn = (
  message: string,
  options?: SignMessageOptions
) => Promise<string>;

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
 * If a key already exists in memory for the given wallet, resolves immediately.
 *
 * Note: Keys are stored in memory only and do not persist across page reloads.
 * This is a security feature - users must sign once per session to derive their key.
 *
 * @param walletAddress - The wallet address to generate the key for
 * @param signMessage - Function to sign a message (returns signature hex string)
 * @param embeddedWalletSigner - Optional function for silent signing with embedded wallets
 * @returns Promise that resolves when the key is available
 */
export async function requestEncryptionKey(
  walletAddress: string,
  signMessage: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<void> {
  // Validate wallet address format
  if (!isValidWalletAddress(walletAddress)) {
    throw new Error(
      `Invalid wallet address: ${walletAddress}. Address must start with 0x and be 42 characters (0x + 40 hex characters).`
    );
  }

  // Check if key already exists in memory or IndexedDB
  if (knownAddresses.has(walletAddress)) {
    return; // Key already exists, no need to sign again
  }
  // Also check IndexedDB in case init hasn't run yet
  try {
    const idbKey = await loadStoredKey(walletAddress);
    if (idbKey) return;
  } catch {
    // IndexedDB unavailable — continue to derive
  }

  // Prefer embedded wallet signer for silent signing, fall back to standard signMessage
  // Always disable wallet UIs for a seamless experience
  const signOptions: SignMessageOptions = { showWalletUIs: false };
  let signature: string;
  try {
    if (embeddedWalletSigner) {
      signature = await embeddedWalletSigner(SIGN_MESSAGE, signOptions);
    } else {
      signature = await signMessage(SIGN_MESSAGE, signOptions);
    }
  } catch (error) {
    // If embedded wallet signer fails, fall back to standard signMessage
    if (embeddedWalletSigner && error instanceof Error) {
      console.warn("Embedded wallet signing failed, falling back to standard signMessage:", error.message);
      signature = await signMessage(SIGN_MESSAGE, signOptions);
    } else {
      throw error;
    }
  }

  // Derive non-extractable CryptoKey from signature
  const cryptoKey = await deriveKeyFromSignature(signature);

  // Store the CryptoKey in memory + IndexedDB (awaits IDB commit)
  await setStoredKey(walletAddress, cryptoKey);

  // Notify listeners that key is now available (triggers queue flush, etc.)
  notifyKeyAvailable(walletAddress);
}

/**
 * Storage key prefix for persisted keypairs
 */
const KEYPAIR_STORAGE_PREFIX = "ecdh_keypair_";

/**
 * Persists an ECDH keypair to localStorage with AES-GCM encryption
 * The private key is encrypted using the encryption key derived from the wallet signature
 * @param address - The wallet address
 * @returns Promise that resolves when keypair is persisted
 * @throws Error if encryption key is not available or persistence fails
 */
async function persistKeyPair(address: string): Promise<void> {
  if (typeof window === "undefined") {
    return; // SSR - skip persistence
  }

  const keyPair = getStoredKeyPair(address);
  if (!keyPair) {
    throw new Error("Key pair not found in memory. Cannot persist.");
  }

  // Ensure encryption key exists (needed to encrypt the private key)
  if (!hasEncryptionKey(address)) {
    throw new Error(
      "Encryption key not found. Cannot persist keypair without encryption key."
    );
  }

  try {
    // Get crypto object - prefer globalThis for proper context binding
    const cryptoApi = (typeof globalThis !== "undefined" && globalThis.crypto) || 
                      (typeof window !== "undefined" && window.crypto) || 
                      crypto;
    
    // Export private key as JWK (extractable format)
    const privateKeyJwk = await cryptoApi.subtle.exportKey("jwk", keyPair.privateKey);
    
    // Export public key as JWK for reconstruction
    const publicKeyJwk = await cryptoApi.subtle.exportKey("jwk", keyPair.publicKey);

    // Combine both keys in a JSON structure
    const keyPairData = {
      privateKey: privateKeyJwk,
      publicKey: publicKeyJwk,
    };

    // Encrypt the keypair data using AES-GCM
    const key = await getEncryptionKey(address);
    const plaintextBytes = new TextEncoder().encode(JSON.stringify(keyPairData));
    
    // Generate a random IV for encryption
    const iv = cryptoApi.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encryptedData = await cryptoApi.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      plaintextBytes.buffer as ArrayBuffer
    );

    // Combine IV + encrypted data
    const encryptedBytes = new Uint8Array(encryptedData);
    const combined = new Uint8Array(iv.length + encryptedBytes.length);
    combined.set(iv, 0);
    combined.set(encryptedBytes, iv.length);

    // Store in localStorage
    const storageKey = `${KEYPAIR_STORAGE_PREFIX}${address}`;
    const encryptedHex = bytesToHex(combined);
    localStorage.setItem(storageKey, encryptedHex);
  } catch (error) {
    throw new Error(
      `Failed to persist keypair: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Loads a persisted ECDH keypair from localStorage and decrypts it
 * @param address - The wallet address
 * @returns The decrypted keypair or null if not found
 * @throws Error if decryption fails or keypair is corrupted
 */
async function loadPersistedKeyPair(address: string): Promise<CryptoKeyPair | null> {
  if (typeof window === "undefined") {
    return null; // SSR - no localStorage
  }

  const storageKey = `${KEYPAIR_STORAGE_PREFIX}${address}`;
  const encryptedHex = localStorage.getItem(storageKey);
  
  if (!encryptedHex) {
    return null;
  }

  try {
    // Ensure encryption key exists (needed to decrypt)
    if (!hasEncryptionKey(address)) {
      // Cannot decrypt without encryption key - return null
      return null;
    }

    // Decrypt the keypair data
    const key = await getEncryptionKey(address);
    const combined = hexToBytes(encryptedHex);
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Decrypt
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encryptedData
    );

    // Parse the JSON structure
    const decryptedJson = new TextDecoder().decode(decryptedData);
    const keyPairData = JSON.parse(decryptedJson) as {
      privateKey: JsonWebKey;
      publicKey: JsonWebKey;
    };

    // Reimport the private key
    const privateKey = await crypto.subtle.importKey(
      "jwk",
      keyPairData.privateKey,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true, // extractable
      ["deriveBits", "deriveKey"]
    );

    // Reimport the public key
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      keyPairData.publicKey,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true, // extractable
      [] // no key usage needed for public key
    );

    return {
      privateKey,
      publicKey,
    };
  } catch (error) {
    // If decryption fails, remove corrupted data and return null
    localStorage.removeItem(storageKey);
    console.warn(
      `Failed to load persisted keypair for ${address}: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

/**
 * Clears a persisted keypair from localStorage
 * @param address - The wallet address
 */
function clearPersistedKeyPair(address: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const storageKey = `${KEYPAIR_STORAGE_PREFIX}${address}`;
  localStorage.removeItem(storageKey);
}

/**
 * Gets the key pair for a wallet address, generating it if needed
 * @param address - The wallet address
 * @param signMessage - Function to sign a message (returns signature hex string)
 * @param embeddedWalletSigner - Optional function for silent signing with embedded wallets
 * @returns The ECDH key pair
 * @throws Error if key pair doesn't exist and signature is required but not available
 */
async function getKeyPair(
  address: string,
  signMessage: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<CryptoKeyPair> {
  const existingKeyPair = getStoredKeyPair(address);
  if (existingKeyPair) {
    return existingKeyPair;
  }

  // Key pair doesn't exist, need to request it
  await requestKeyPair(address, signMessage, embeddedWalletSigner);
  const keyPair = getStoredKeyPair(address);
  if (!keyPair) {
    throw new Error(
      "Key pair not found. Please sign a message to generate your key pair."
    );
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
  // Validate wallet address format
  if (!isValidWalletAddress(walletAddress)) {
    throw new Error(
      `Invalid wallet address: ${walletAddress}. Address must start with 0x and be 42 characters (0x + 40 hex characters).`
    );
  }

  // Check if key pair already exists in memory
  const existingKeyPair = getStoredKeyPair(walletAddress);
  if (existingKeyPair) {
    return; // Key pair already exists in memory, no need to sign again
  }

  // Try to load from localStorage if encryption key is available
  try {
    const persistedKeyPair = await loadPersistedKeyPair(walletAddress);
    if (persistedKeyPair) {
      // Store in memory for faster access
      setStoredKeyPair(walletAddress, persistedKeyPair);
      return; // Successfully loaded from persistence, no need to sign
    }
  } catch (error) {
    // If loading fails, continue to generate new keypair
    console.warn(
      `Failed to load persisted keypair, generating new one: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Prefer embedded wallet signer for silent signing, fall back to standard signMessage
  // Always disable wallet UIs for a seamless experience
  const signOptions: SignMessageOptions = { showWalletUIs: false };
  let signature: string;
  try {
    if (embeddedWalletSigner) {
      signature = await embeddedWalletSigner(SIGN_MESSAGE, signOptions);
    } else {
      signature = await signMessage(SIGN_MESSAGE, signOptions);
    }
  } catch (error) {
    // If embedded wallet signer fails, fall back to standard signMessage
    if (embeddedWalletSigner && error instanceof Error) {
      console.warn("Embedded wallet signing failed, falling back to standard signMessage:", error.message);
      signature = await signMessage(SIGN_MESSAGE, signOptions);
    } else {
      throw error;
    }
  }

  // Derive key pair from signature
  const keyPair = await deriveKeyPairFromSignature(signature, walletAddress);

  // Store the derived key pair in memory
  setStoredKeyPair(walletAddress, keyPair);

  // Persist to localStorage if encryption key is available
  try {
    // Ensure encryption key exists before persisting
    if (hasEncryptionKey(walletAddress)) {
      await persistKeyPair(walletAddress);
    }
  } catch (error) {
    // Persistence is optional - log warning but don't fail
    console.warn(
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

  // Export public key as SPKI format
  const spkiBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const spkiBytes = new Uint8Array(spkiBuffer);

  // Convert to base64
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
 * Clears all key pairs from memory
 */
export function clearAllKeyPairs(): void {
  keyPairStore.clear();
}

/**
 * @internal Test-only: clears in-memory caches without touching IndexedDB.
 * Simulates a page refresh where module-level variables reset but IndexedDB persists.
 */
export function _resetInMemoryForTesting(): void {
  cryptoKeyCache.clear();
  knownAddresses.clear();
}

// ---------------------------------------------------------------------------
// Lifecycle: init, multi-tab coordination
// ---------------------------------------------------------------------------

/** BroadcastChannel for multi-tab key notifications. */
let keyChannel: BroadcastChannel | null = null;

/**
 * Initialize encryption key state from IndexedDB.
 * Call this early in the app lifecycle (e.g., in a root-level effect).
 *
 * - Loads all IndexedDB entries into `knownAddresses` and `cryptoKeyCache`
 * - Listens for BroadcastChannel messages from sibling tabs
 *
 * Keys persist in IndexedDB until explicitly cleared via `clearEncryptionKey()`
 * or `clearAllEncryptionKeys()` (e.g., on logout). The non-extractable CryptoKey
 * handles cannot be exported, so persistence carries no additional risk.
 */
export async function initEncryptionKeys(): Promise<void> {
  // 1. Load entries into in-memory caches
  try {
    const entries = await idbLoadAllEntries();
    for (const entry of entries) {
      cryptoKeyCache.set(entry.address, entry.key);
      knownAddresses.add(entry.address);
    }
  } catch {
    // IndexedDB unavailable
  }

  // 2. Listen for sibling tab key notifications
  try {
    if (!keyChannel) {
      keyChannel = new BroadcastChannel("reverbia-encryption-keys");
      keyChannel.onmessage = async (event) => {
        if (event.data?.type === "key-available" && event.data.address) {
          const addr = event.data.address as string;
          if (!cryptoKeyCache.has(addr)) {
            // Load from IndexedDB
            try {
              const key = await idbLoadKey(addr);
              if (key) {
                cryptoKeyCache.set(addr, key);
                knownAddresses.add(addr);
                notifyKeyAvailable(addr);
              }
            } catch {
              // Ignore
            }
          }
        }
      };
    }
  } catch {
    // BroadcastChannel unavailable
  }
}

/**
 * Result returned by the useEncryption hook.
 * @category Hooks
 */
export interface UseEncryptionResult {
  /** Request and generate an encryption key for a wallet address */
  requestEncryptionKey: (walletAddress: string) => Promise<void>;
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
 * 2. The signature is used to deterministically derive a non-extractable CryptoKey
 * 3. The opaque CryptoKey handle is cached in memory and persisted in IndexedDB
 * 4. Data can be encrypted/decrypted using this key
 * 5. On page reload, the CryptoKey is restored from IndexedDB without re-signing
 *
 * ## Security Features
 *
 * - **Non-extractable**: CryptoKey cannot be exported — `exportKey()` throws
 * - **Deterministic**: Same wallet + signature always generates same key
 * - **XSS-resistant**: Attacker can use key in-situ but cannot exfiltrate raw bytes
 * - **Persistent**: Keys survive page refreshes via IndexedDB, cleared only on explicit logout
 *
 * ## Initialization
 *
 * Call `initEncryptionKeys()` early in the app lifecycle to restore keys from
 * IndexedDB and enable multi-tab coordination.
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
 * import { useEncryption, encryptData, decryptData } from "@reverbia/sdk/react";
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
 * import { useEncryption, encryptData, decryptData } from "@reverbia/sdk/react";
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
 * import { useEncryption } from "@reverbia/sdk/react";
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

