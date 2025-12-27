"use client";

const SIGN_MESSAGE =
  "The app is asking you to sign this message to generate a key, which will be used to encrypt data.";

/**
 * In-memory storage for encryption keys.
 * Keys are stored per wallet address and only persist for the session.
 * This is more secure than localStorage as keys are not persisted to disk
 * and are not accessible to XSS attacks after page reload.
 */
const encryptionKeyStore = new Map<string, string>();

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
 * Requests the user to sign a message to generate an encryption key.
 * If a key already exists in memory for the given wallet, resolves immediately.
 *
 * Note: Keys are stored in memory only and do not persist across page reloads.
 * This is a security feature - users must sign once per session to derive their key.
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

  // Request signature from user
  const signature = await signMessage(SIGN_MESSAGE);

  // Derive encryption key from signature
  const encryptionKey = await deriveKeyFromSignature(signature);

  // Store the derived key in memory
  setStoredKey(walletAddress, encryptionKey);
}

/**
 * Hook that provides on-demand encryption key management.
 * @param signMessage - Function to sign a message (from Privy's useSignMessage)
 * @returns Functions to request encryption keys
 * @category Hooks
 */
export function useEncryption(signMessage: SignMessageFn) {
  return {
    requestEncryptionKey: (walletAddress: string) =>
      requestEncryptionKey(walletAddress, signMessage),
  };
}

