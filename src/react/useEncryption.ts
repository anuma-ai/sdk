"use client";

const SIGN_MESSAGE =
  "The app is asking you to sign this message to generate encryption keys, which will be used to encrypt data and for encryption with cloud services.";

/**
 * In-memory storage for encryption keys.
 * Keys are stored per wallet address and only persist for the session.
 * This is more secure than localStorage as keys are not persisted to disk
 * and are not accessible to XSS attacks after page reload.
 */
const encryptionKeyStore = new Map<string, string>();

/**
 * In-memory storage for ECDH key pairs.
 * Key pairs are stored per wallet address and only persist for the session.
 * Private keys are never stored to disk and are not accessible to XSS attacks after page reload.
 */
const keyPairStore = new Map<string, CryptoKeyPair>();

/**
 * Gets the encryption key for a wallet address from in-memory storage
 * @param address - The wallet address
 * @returns The stored key hex string or null if not available
 */
function getStoredKey(address: string): string | null {
  return encryptionKeyStore.get(address) ?? null;
}

/**
 * Stores an encryption key for a wallet address in memory
 * @param address - The wallet address
 * @param keyHex - The encryption key as hex string
 */
function setStoredKey(address: string, keyHex: string): void {
  encryptionKeyStore.set(address, keyHex);
}

/**
 * Clears the encryption key for a wallet address from memory
 * @param address - The wallet address
 */
export function clearEncryptionKey(address: string): void {
  encryptionKeyStore.delete(address);
}

/**
 * Clears all encryption keys from memory
 */
export function clearAllEncryptionKeys(): void {
  encryptionKeyStore.clear();
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
 * Derives a 32-byte encryption key from a signature using SHA-256
 */
async function deriveKeyFromSignature(signature: string): Promise<string> {
  // 1. Convert hex signature to bytes
  const sigBytes = hexToBytes(signature);

  // 2. Hash with SHA-256 to get 32-byte key
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    sigBytes.buffer as ArrayBuffer
  );
  const hashBytes = new Uint8Array(hashBuffer);

  // 3. Return as hex string
  return bytesToHex(hashBytes);
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
 * Uses the wallet address as HKDF salt for deterministic key pair derivation.
 * 
 * @param signature - The signature from signing the message
 * @param walletAddress - The wallet address (used as HKDF salt)
 * @returns The derived ECDH key pair
 */
async function deriveKeyPairFromSignature(
  signature: string,
  walletAddress: string
): Promise<CryptoKeyPair> {
  // 1. Convert hex signature to bytes
  const sigBytes = hexToBytes(signature);

  // 2. Hash with SHA-256 to get 32-byte seed
  const seedBuffer = await crypto.subtle.digest(
    "SHA-256",
    sigBytes.buffer as ArrayBuffer
  );
  const seed = new Uint8Array(seedBuffer);

  // 3. Convert wallet address to bytes for use as HKDF salt
  // Remove '0x' prefix if present and convert to bytes
  const addressBytes = hexToBytes(walletAddress);

  // 4. Use HKDF to derive key material for ECDH private key
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    seed.buffer as ArrayBuffer,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  // 5. Derive 32 bytes for ECDH P-256 private key using wallet address as salt
  // Create a new Uint8Array to ensure proper type compatibility
  const saltBytes = new Uint8Array(addressBytes);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: saltBytes, // Use wallet address as salt for deterministic derivation
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
 * Gets the encryption key from in-memory storage and imports it as a CryptoKey
 */
async function getEncryptionKey(address: string): Promise<CryptoKey> {
  const keyHex = getStoredKey(address);
  if (!keyHex) {
    throw new Error(
      "Encryption key not found. Please sign a message to generate your encryption key."
    );
  }

  const keyBytes = hexToBytes(keyHex);

  // Import the key for AES-GCM encryption
  return crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts data using AES-GCM with the stored encryption key
 * @param plaintext - The data to encrypt (string or Uint8Array)
 * @returns Encrypted data as hex string (IV + ciphertext + auth tag)
 */
export async function encryptData(
  plaintext: string | Uint8Array,
  address: string
): Promise<string> {
  const key = await getEncryptionKey(address);

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
 * Decrypts data using AES-GCM with the stored encryption key
 * @param encryptedHex - Encrypted data as hex string (IV + ciphertext + auth tag)
 * @returns Decrypted data as string
 */
export async function decryptData(
  encryptedHex: string,
  address: string
): Promise<string> {
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

  // Convert decrypted bytes to string
  return new TextDecoder().decode(decryptedData);
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
 * Checks if an encryption key exists in memory for the given wallet address
 */
export function hasEncryptionKey(address: string): boolean {
  return getStoredKey(address) !== null;
}

/**
 * Type for the signMessage function that client must provide
 */
export type SignMessageFn = (message: string) => Promise<string>;

/**
 * Check if an error is a rate limit error (429) from Privy API
 */
function isRateLimitError(error: unknown): boolean {
  if (!error) return false;
  
  // Check for 429 status code in error object
  if (typeof error === "object") {
    const err = error as { status?: number; statusCode?: number; code?: string; message?: string };
    if (err.status === 429 || err.statusCode === 429) return true;
    if (err.code === "429" || err.code === "RATE_LIMIT_EXCEEDED") return true;
    if (err.message?.includes("429") || err.message?.toLowerCase().includes("rate limit")) return true;
  }
  
  // Check error message string
  if (typeof error === "string") {
    return error.includes("429") || error.toLowerCase().includes("rate limit");
  }
  
  return false;
}

/**
 * Retry a signMessage call with exponential backoff for rate limit errors
 * @param signMessage - Function to sign a message
 * @param message - Message to sign
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param initialDelay - Initial delay in ms (default: 1000)
 * @returns Signature string
 */
async function signMessageWithRetry(
  signMessage: SignMessageFn,
  message: string,
  maxRetries = 3,
  initialDelay = 1000
): Promise<string> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await signMessage(message);
    } catch (error) {
      lastError = error;
      
      // Only retry on rate limit errors
      if (!isRateLimitError(error)) {
        throw error; // Don't retry non-rate-limit errors
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw new Error(
          `Rate limit exceeded: Unable to sign message after ${maxRetries + 1} attempts. ` +
          `Please wait a moment and try again. Privy allows 5 signatures per 60 seconds.`
        );
      }
      
      // Exponential backoff: delay = initialDelay * 2^attempt
      // Cap at 60 seconds (Privy's rate limit window)
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt),
        60000 // Max 60 seconds
      );
      
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[Encryption] Rate limit hit (attempt ${attempt + 1}/${maxRetries + 1}). ` +
          `Retrying in ${Math.ceil(delay / 1000)}s...`
        );
      }
      
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Requests the user to sign a message to generate an encryption key.
 * If a key already exists in memory for the given wallet, resolves immediately.
 *
 * Note: Keys are stored in memory only and do not persist across page reloads.
 * This is a security feature - users must sign once per session to derive their key.
 *
 * Handles Privy rate limits (429 errors) with automatic retry and exponential backoff.
 *
 * @param walletAddress - The wallet address to generate the key for
 * @param signMessage - Function to sign a message (returns signature hex string)
 * @returns Promise that resolves when the key is available
 */
export async function requestEncryptionKey(
  walletAddress: string,
  signMessage: SignMessageFn
): Promise<void> {
  // Check if key already exists in memory
  const existingKey = getStoredKey(walletAddress);
  if (existingKey) {
    return; // Key already exists in memory, no need to sign again
  }

  // Request signature from user with retry logic for rate limits
  const signature = await signMessageWithRetry(signMessage, SIGN_MESSAGE);

  // Derive encryption key from signature
  const encryptionKey = await deriveKeyFromSignature(signature);

  // Store the derived key in memory
  setStoredKey(walletAddress, encryptionKey);
}

/**
 * Gets the key pair for a wallet address, generating it if needed
 * @param address - The wallet address
 * @param signMessage - Function to sign a message (returns signature hex string)
 * @returns The ECDH key pair
 * @throws Error if key pair doesn't exist and signature is required but not available
 */
async function getKeyPair(
  address: string,
  signMessage: SignMessageFn
): Promise<CryptoKeyPair> {
  const existingKeyPair = getStoredKeyPair(address);
  if (existingKeyPair) {
    return existingKeyPair;
  }

  // Key pair doesn't exist, need to request it
  await requestKeyPair(address, signMessage);
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
 * Handles Privy rate limits (429 errors) with automatic retry and exponential backoff.
 *
 * @param walletAddress - The wallet address to generate the key pair for
 * @param signMessage - Function to sign a message (returns signature hex string)
 * @returns Promise that resolves when the key pair is available
 */
export async function requestKeyPair(
  walletAddress: string,
  signMessage: SignMessageFn
): Promise<void> {
  // Check if key pair already exists in memory
  const existingKeyPair = getStoredKeyPair(walletAddress);
  if (existingKeyPair) {
    return; // Key pair already exists in memory, no need to sign again
  }

  // Request signature from user with retry logic for rate limits
  const signature = await signMessageWithRetry(signMessage, SIGN_MESSAGE);

  // Derive key pair from signature using wallet address as HKDF salt
  const keyPair = await deriveKeyPairFromSignature(signature, walletAddress);

  // Store the derived key pair in memory
  setStoredKeyPair(walletAddress, keyPair);
}

/**
 * Exports the public key for a wallet address as SPKI format (base64)
 * @param address - The wallet address
 * @param signMessage - Function to sign a message (returns signature hex string)
 * @returns The public key as base64-encoded SPKI string
 */
export async function exportPublicKey(
  address: string,
  signMessage: SignMessageFn
): Promise<string> {
  const keyPair = await getKeyPair(address, signMessage);

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
 * Clears the key pair for a wallet address from memory
 * @param address - The wallet address
 */
export function clearKeyPair(address: string): void {
  keyPairStore.delete(address);
}

/**
 * Clears all key pairs from memory
 */
export function clearAllKeyPairs(): void {
  keyPairStore.clear();
}

/**
 * Hook that provides on-demand encryption key management.
 * @param signMessage - Function to sign a message (from Privy's useSignMessage)
 * @returns Functions to request encryption keys and manage key pairs
 * @category Hooks
 */
export function useEncryption(signMessage: SignMessageFn) {
  return {
    requestEncryptionKey: (walletAddress: string) =>
      requestEncryptionKey(walletAddress, signMessage),
    requestKeyPair: (walletAddress: string) =>
      requestKeyPair(walletAddress, signMessage),
    exportPublicKey: (walletAddress: string) =>
      exportPublicKey(walletAddress, signMessage),
    hasKeyPair: (walletAddress: string) => hasKeyPair(walletAddress),
    clearKeyPair: (walletAddress: string) => clearKeyPair(walletAddress),
  };
}

