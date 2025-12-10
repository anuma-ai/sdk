"use client";

const SIGN_MESSAGE =
  "The app is asking you to sign this message to generate a key, which will be used to encrypt data.";
const BASE_SIGNATURE_STORAGE_KEY = "privy_encryption_key";

/**
 * Gets the storage key for a specific wallet address
 * @param address - The wallet address
 * @returns The storage key
 */
function getStorageKey(address: string): string {
  return `${BASE_SIGNATURE_STORAGE_KEY}_${address}`;
}
/**
 * Safely gets an item from localStorage, handling SSR environments
 * @param key - The storage key
 * @returns The stored value or null if not available or in SSR
 */
function getStorageItem(key: string): string | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely sets an item in localStorage, handling SSR environments
 * @param key - The storage key
 * @param value - The value to store
 * @returns true if successful, false otherwise
 */
function setStorageItem(key: string, value: string): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
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
 * Derives a 32-byte encryption key from a signature using SHA-256
 */
async function deriveKeyFromSignature(signature: string): Promise<string> {
  // 1. Convert hex signature to bytes
  const sigBytes = hexToBytes(signature);

  // 2. Hash with SHA-256 to get 32-byte key
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    sigBytes.buffer as ArrayBuffer,
  );
  const hashBytes = new Uint8Array(hashBuffer);

  // 3. Return as hex string
  return bytesToHex(hashBytes);
}

/**
 * Gets the encryption key from localStorage and imports it as a CryptoKey
 */
async function getEncryptionKey(address: string): Promise<CryptoKey> {
  const storageKey = getStorageKey(address);
  const keyHex = getStorageItem(storageKey);
  if (!keyHex) {
    throw new Error("Encryption key not found. Please sign in first.");
  }

  const keyBytes = hexToBytes(keyHex);

  // Import the key for AES-GCM encryption
  return crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypts data using AES-GCM with the stored encryption key
 * @param plaintext - The data to encrypt (string or Uint8Array)
 * @returns Encrypted data as hex string (IV + ciphertext + auth tag)
 */
export async function encryptData(
  plaintext: string | Uint8Array,
  address: string,
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
    plaintextBytes.buffer as ArrayBuffer,
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
  address: string,
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
    encryptedData,
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
  address: string,
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
    encryptedData,
  );

  return new Uint8Array(decryptedData);
}

/**
 * Checks if an encryption key exists for the given wallet address
 */
export function hasEncryptionKey(address: string): boolean {
  const storageKey = getStorageKey(address);
  return getStorageItem(storageKey) !== null;
}

/**
 * Type for the signMessage function that client must provide
 */
export type SignMessageFn = (message: string) => Promise<string>;

/**
 * Requests the user to sign a message to generate an encryption key.
 * If a key already exists for the given wallet, resolves immediately.
 * @param walletAddress - The wallet address to generate the key for
 * @param signMessage - Function to sign a message (returns signature hex string)
 * @returns Promise that resolves when the key is available
 */
export async function requestEncryptionKey(
  walletAddress: string,
  signMessage: SignMessageFn,
): Promise<void> {
  const storageKey = getStorageKey(walletAddress);

  // Check if key already exists
  const existingKey = getStorageItem(storageKey);
  if (existingKey) {
    return; // Key already exists, no need to sign again
  }

  // Request signature from user
  const signature = await signMessage(SIGN_MESSAGE);

  // Derive encryption key from signature
  const encryptionKey = await deriveKeyFromSignature(signature);

  // Store the derived key in localStorage
  const stored = setStorageItem(storageKey, encryptionKey);
  if (!stored) {
    throw new Error("Failed to store encryption key in localStorage");
  }
}

/**
 * Hook that provides on-demand encryption key management.
 * @param signMessage - Function to sign a message (from Privy's useSignMessage)
 * @returns Functions to request encryption keys
 */
export function useEncryption(signMessage: SignMessageFn) {
  return {
    requestEncryptionKey: (walletAddress: string) =>
      requestEncryptionKey(walletAddress, signMessage),
  };
}
