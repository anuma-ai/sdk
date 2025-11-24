"use client";

import { useEffect, useRef } from "react";
import { useSignMessage, useWallets } from "@privy-io/react-auth";

const SIGN_MESSAGE =
  "The app is asking you to sign this message to generate a key, which will be used to encrypt data.";
const SIGNATURE_STORAGE_KEY = "privy_encryption_key";

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
 * Gets the encryption key from localStorage and imports it as a CryptoKey
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyHex = localStorage.getItem(SIGNATURE_STORAGE_KEY);
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
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts data using AES-GCM with the stored encryption key
 * @param plaintext - The data to encrypt (string or Uint8Array)
 * @returns Encrypted data as hex string (IV + ciphertext + auth tag)
 */
export async function encryptData(
  plaintext: string | Uint8Array
): Promise<string> {
  const key = await getEncryptionKey();

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
export async function decryptData(encryptedHex: string): Promise<string> {
  const key = await getEncryptionKey();

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
  encryptedHex: string
): Promise<Uint8Array> {
  const key = await getEncryptionKey();

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

export function useEncryption(authenticated: boolean) {
  const { signMessage } = useSignMessage();
  const { wallets } = useWallets();
  const hasRequestedSignature = useRef(false);
  const hasCheckedStorage = useRef(false);

  useEffect(() => {
    // Early return if not authenticated or no wallets
    if (!authenticated || wallets.length === 0) {
      return;
    }

    // Always check localStorage first - if key exists, don't request again
    const existingKey = localStorage.getItem(SIGNATURE_STORAGE_KEY);
    if (existingKey) {
      if (!hasCheckedStorage.current) {
        hasCheckedStorage.current = true;
      }
      return;
    }

    // Request signature if we haven't already requested in this session
    const requestSignature = async () => {
      if (!hasRequestedSignature.current) {
        hasRequestedSignature.current = true;
        try {
          const { signature } = await signMessage(
            { message: SIGN_MESSAGE },
            {
              address: wallets[0].address,
            }
          );

          // Derive encryption key from signature
          const encryptionKey = await deriveKeyFromSignature(signature);

          // Store the derived key (not the raw signature) in localStorage
          localStorage.setItem(SIGNATURE_STORAGE_KEY, encryptionKey);
        } catch (error) {
          hasRequestedSignature.current = false; // Reset on error so user can retry
        }
      }
    };

    requestSignature();
  }, [
    authenticated,
    wallets.length > 0 ? wallets[0]?.address : null,
    signMessage,
  ]);

  // Reset the refs when user logs out
  useEffect(() => {
    if (!authenticated) {
      hasRequestedSignature.current = false;
      hasCheckedStorage.current = false;
    }
  }, [authenticated]);
}
