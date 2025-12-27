/**
 * Migration Utilities for Encrypted Data
 *
 * Handles migration from old encryption scheme (v1, no salt) to new scheme (v2, with salt).
 */

import { encryptData, decryptData, hasEncryptionKey } from "../../react/useEncryption";
import type { SignMessageFn } from "../../react/useEncryption";

/**
 * Encryption version markers
 */
const ENCRYPTION_PREFIX_V1 = "enc:v1:";
const ENCRYPTION_PREFIX_V2 = "enc:v2:";
const ENCRYPTION_PREFIX_LEGACY = "enc:"; // Old format, treat as v1

/**
 * Get the encryption version from an encrypted value
 */
export function getEncryptionVersion(value: string): "v1" | "v2" | null {
  if (value.startsWith(ENCRYPTION_PREFIX_V2)) return "v2";
  if (value.startsWith(ENCRYPTION_PREFIX_V1)) return "v1";
  if (value.startsWith(ENCRYPTION_PREFIX_LEGACY)) return "v1"; // Legacy
  return null; // Not encrypted
}

/**
 * Check if a value is encrypted with the old scheme (v1 or legacy)
 */
export function isOldEncryption(value: string): boolean {
  const version = getEncryptionVersion(value);
  return version === "v1";
}

/**
 * Derive old encryption key (same as current - SHA-256 of signature)
 * Note: Encryption key derivation hasn't changed, only HKDF salt for key pairs changed.
 * This function is kept for consistency and potential future changes.
 */
async function deriveOldEncryptionKey(
  signature: string
): Promise<string> {
  // Convert hex signature to bytes
  const sigBytes = hexToBytes(signature);

  // Hash with SHA-256 to get 32-byte key (same as current derivation)
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    sigBytes.buffer as ArrayBuffer
  );
  const hashBytes = new Uint8Array(hashBuffer);

  // Return as hex string
  return bytesToHex(hashBytes);
}

/**
 * Convert hex string to Uint8Array bytes
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
 * Convert Uint8Array bytes to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Decrypt a value using the old encryption scheme (v1)
 */
async function decryptOldValue(
  encryptedValue: string,
  oldKeyHex: string
): Promise<string> {
  // Extract encrypted payload
  let encryptedPayload: string;
  if (encryptedValue.startsWith(ENCRYPTION_PREFIX_V1)) {
    encryptedPayload = encryptedValue.slice(ENCRYPTION_PREFIX_V1.length);
  } else if (encryptedValue.startsWith(ENCRYPTION_PREFIX_LEGACY)) {
    encryptedPayload = encryptedValue.slice(ENCRYPTION_PREFIX_LEGACY.length);
  } else {
    throw new Error("Invalid old encryption format");
  }

  // Import old key
  const keyBytes = hexToBytes(oldKeyHex);
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // Convert hex to bytes
  const combined = hexToBytes(encryptedPayload);

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
 * Encrypt a value using the new encryption scheme (v2)
 */
async function encryptNewValue(
  plaintext: string,
  walletAddress: string
): Promise<string> {
  if (!hasEncryptionKey(walletAddress)) {
    throw new Error("Encryption key not available for new scheme");
  }

  const encrypted = await encryptData(plaintext, walletAddress);
  return `enc:v2:${encrypted}`;
}

/**
 * Migrate a single encrypted value from old scheme to new scheme
 * 
 * Note: Since encryption key derivation (SHA-256) hasn't changed, we can decrypt
 * old values with the current key. The migration mainly updates the prefix format.
 */
export async function migrateEncryptedValue(
  encryptedValue: string,
  walletAddress: string,
  signMessage: SignMessageFn
): Promise<string> {
  // Check if already migrated
  if (getEncryptionVersion(encryptedValue) === "v2") {
    return encryptedValue; // Already migrated
  }

  // Check if encrypted at all
  if (!getEncryptionVersion(encryptedValue)) {
    return encryptedValue; // Not encrypted, no migration needed
  }

  // Ensure encryption key is available (same key works for both old and new)
  if (!hasEncryptionKey(walletAddress)) {
    // Request key if not available using requestEncryptionKey
    const { requestEncryptionKey } = await import("../../react/useEncryption");
    await requestEncryptionKey(walletAddress, signMessage);
    
    if (!hasEncryptionKey(walletAddress)) {
      throw new Error("Encryption key not available after signing");
    }
  }

  // Extract encrypted payload (remove old prefix)
  let encryptedPayload: string;
  if (encryptedValue.startsWith(ENCRYPTION_PREFIX_V1)) {
    encryptedPayload = encryptedValue.slice(ENCRYPTION_PREFIX_V1.length);
  } else if (encryptedValue.startsWith(ENCRYPTION_PREFIX_LEGACY)) {
    encryptedPayload = encryptedValue.slice(ENCRYPTION_PREFIX_LEGACY.length);
  } else {
    throw new Error("Invalid old encryption format");
  }

  // Decrypt with current key (same derivation as old key - SHA-256 of signature)
  const plaintext = await decryptData(encryptedPayload, walletAddress);

  // Re-encrypt with new prefix format (v2)
  return await encryptNewValue(plaintext, walletAddress);
}

/**
 * Migration status storage key
 */
function getMigrationStatusKey(walletAddress: string): string {
  return `encryption_migration_${walletAddress.toLowerCase()}`;
}

/**
 * Check if migration has been completed for a wallet address
 */
export function hasMigrationCompleted(walletAddress: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const status = localStorage.getItem(getMigrationStatusKey(walletAddress));
    return status === "completed";
  } catch {
    return false;
  }
}

/**
 * Mark migration as completed for a wallet address
 */
export function markMigrationCompleted(walletAddress: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      getMigrationStatusKey(walletAddress),
      "completed"
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear migration status (for testing or re-migration)
 */
export function clearMigrationStatus(walletAddress: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getMigrationStatusKey(walletAddress));
  } catch {
    // Ignore storage errors
  }
}

