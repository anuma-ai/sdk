/**
 * OPFS (Origin Private File System) storage utilities with encryption support.
 *
 * This module provides encrypted file storage using the browser's OPFS API
 * and wallet-based encryption keys.
 */

import { getLogger } from "../logger";

// Internal placeholder format - never shown to clients
// Uses a format that won't be interpreted as markdown
export const FILE_PLACEHOLDER_PREFIX = "__SDKFILE__";
const FILE_PLACEHOLDER_SUFFIX = "__";
// Match file IDs like "media_019c0630-8b7a-760c-863e-b6c676fd50d3"
export const FILE_PLACEHOLDER_REGEX = /__SDKFILE__([a-zA-Z0-9_-]+)__/g;

/**
 * Creates an internal file placeholder for a given file ID.
 * This placeholder is used internally and should never be shown to clients.
 */
export function createFilePlaceholder(fileId: string): string {
  return `${FILE_PLACEHOLDER_PREFIX}${fileId}${FILE_PLACEHOLDER_SUFFIX}`;
}

/**
 * Extracts file IDs from content containing placeholders.
 */
export function extractFileIds(content: string): string[] {
  const matches = content.matchAll(FILE_PLACEHOLDER_REGEX);
  return Array.from(matches, (m) => m[1]);
}

/**
 * Checks if the browser supports OPFS.
 */
export function isOPFSSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "storage" in navigator &&
    "getDirectory" in navigator.storage
  );
}

const OLD_DIR_NAME = "reverbia-sdk-files";
const NEW_DIR_NAME = "anuma-sdk-files";

let migrationDone = false;

/**
 * Migrates files from the old "reverbia-sdk-files" directory to the new
 * "anuma-sdk-files" directory, then removes the old directory.
 * Runs at most once per session.
 */
async function migrateOldDirectory(root: FileSystemDirectoryHandle): Promise<void> {
  if (migrationDone) return;
  migrationDone = true;

  let oldDir: FileSystemDirectoryHandle;
  try {
    oldDir = await root.getDirectoryHandle(OLD_DIR_NAME);
  } catch {
    // Old directory doesn't exist, nothing to migrate
    return;
  }

  const newDir = await root.getDirectoryHandle(NEW_DIR_NAME, { create: true });

  for await (const [name, handle] of oldDir as any) {
    if (handle.kind !== "file") continue;

    // Skip if the file already exists in the new directory
    try {
      await newDir.getFileHandle(name);
      continue;
    } catch {
      // File doesn't exist in new dir, proceed with copy
    }

    const file = await (handle as FileSystemFileHandle).getFile();
    const dest = await newDir.getFileHandle(name, { create: true });
    const writable = await dest.createWritable();
    await writable.write(await file.arrayBuffer());
    await writable.close();
  }

  await root.removeEntry(OLD_DIR_NAME, { recursive: true });
}

/**
 * Gets the OPFS root directory for SDK file storage.
 * On first call, migrates any files from the legacy directory.
 */
async function getSDKDirectory(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  await migrateOldDirectory(root);
  return root.getDirectoryHandle(NEW_DIR_NAME, { create: true });
}

/**
 * Converts a Uint8Array to a hex string.
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Converts a hex string to a Uint8Array.
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Encrypts a blob using AES-GCM with wallet-derived key.
 *
 * @param blob - The blob to encrypt
 * @param encryptionKey - The CryptoKey for encryption
 * @returns Encrypted data as hex string (IV + ciphertext)
 */
async function encryptBlob(blob: Blob, encryptionKey: CryptoKey): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const plaintext = new Uint8Array(arrayBuffer);

  // Generate random 12-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, encryptionKey, plaintext);

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return bytesToHex(combined);
}

/**
 * Decrypts encrypted hex data back to a Uint8Array.
 *
 * @param encryptedHex - The encrypted data as hex string
 * @param encryptionKey - The CryptoKey for decryption
 * @returns Decrypted data as Uint8Array
 */
async function decryptToBytes(encryptedHex: string, encryptionKey: CryptoKey): Promise<Uint8Array> {
  const combined = hexToBytes(encryptedHex);

  // Extract IV (first 12 bytes) and ciphertext
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, encryptionKey, ciphertext);

  return new Uint8Array(decrypted);
}

/**
 * File metadata stored alongside encrypted content.
 */
interface StoredFileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  sourceUrl?: string;
  createdAt: number;
}

/**
 * Writes an encrypted file to OPFS.
 *
 * @param fileId - Unique identifier for the file
 * @param blob - The file content
 * @param encryptionKey - CryptoKey for encryption
 * @param metadata - Optional metadata (name, type, sourceUrl)
 */
export async function writeEncryptedFile(
  fileId: string,
  blob: Blob,
  encryptionKey: CryptoKey,
  metadata?: { name?: string; sourceUrl?: string }
): Promise<void> {
  if (!isOPFSSupported()) {
    throw new Error("OPFS is not supported in this browser");
  }

  const dir = await getSDKDirectory();

  // Encrypt the blob
  const encryptedHex = await encryptBlob(blob, encryptionKey);

  // Store encrypted content
  const contentHandle = await dir.getFileHandle(`${fileId}.enc`, {
    create: true,
  });
  const contentWritable = await contentHandle.createWritable();
  await contentWritable.write(encryptedHex);
  await contentWritable.close();

  // Store metadata (unencrypted - just IDs and types, no sensitive data)
  const fileMetadata: StoredFileMetadata = {
    id: fileId,
    name: metadata?.name || `file-${fileId}`,
    type: blob.type || "application/octet-stream",
    size: blob.size,
    sourceUrl: metadata?.sourceUrl,
    createdAt: Date.now(),
  };

  const metaHandle = await dir.getFileHandle(`${fileId}.meta.json`, {
    create: true,
  });
  const metaWritable = await metaHandle.createWritable();
  await metaWritable.write(JSON.stringify(fileMetadata));
  await metaWritable.close();
}

/**
 * Reads and decrypts a file from OPFS.
 *
 * @param fileId - The file identifier
 * @param encryptionKey - CryptoKey for decryption
 * @returns The decrypted blob, or null if not found
 */
export async function readEncryptedFile(
  fileId: string,
  encryptionKey: CryptoKey
): Promise<{ blob: Blob; metadata: StoredFileMetadata } | null> {
  if (!isOPFSSupported()) {
    throw new Error("OPFS is not supported in this browser");
  }

  const dir = await getSDKDirectory();

  try {
    // Read encrypted content
    const contentHandle = await dir.getFileHandle(`${fileId}.enc`);
    const contentFile = await contentHandle.getFile();
    const encryptedHex = await contentFile.text();

    // Read metadata
    const metaHandle = await dir.getFileHandle(`${fileId}.meta.json`);
    const metaFile = await metaHandle.getFile();
    const metadata: StoredFileMetadata = JSON.parse(await metaFile.text());

    // Decrypt
    const decryptedBytes = await decryptToBytes(encryptedHex, encryptionKey);
    const blob = new Blob([decryptedBytes.buffer as ArrayBuffer], { type: metadata.type });

    return { blob, metadata };
  } catch (error) {
    // File not found or other error
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return null;
    }
    throw error;
  }
}

/**
 * Deletes a file from OPFS.
 *
 * @param fileId - The file identifier
 */
export async function deleteEncryptedFile(fileId: string): Promise<void> {
  if (!isOPFSSupported()) {
    throw new Error("OPFS is not supported in this browser");
  }

  const dir = await getSDKDirectory();

  try {
    await dir.removeEntry(`${fileId}.enc`);
    await dir.removeEntry(`${fileId}.meta.json`);
  } catch {
    // Ignore if files don't exist
  }
}

/**
 * Checks if a file exists in OPFS.
 *
 * @param fileId - The file identifier
 */
export async function fileExists(fileId: string): Promise<boolean> {
  if (!isOPFSSupported()) {
    return false;
  }

  const dir = await getSDKDirectory();

  try {
    await dir.getFileHandle(`${fileId}.enc`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Manager for blob URLs to prevent memory leaks.
 * Tracks active blob URLs and provides cleanup functionality.
 */
export class BlobUrlManager {
  private activeUrls = new Map<string, string>(); // fileId -> blobUrl

  /**
   * Creates a blob URL for a file and tracks it.
   */
  createUrl(fileId: string, blob: Blob): string {
    // Revoke existing URL if any
    this.revokeUrl(fileId);

    const url = URL.createObjectURL(blob);
    this.activeUrls.set(fileId, url);
    return url;
  }

  /**
   * Gets the active blob URL for a file, if any.
   */
  getUrl(fileId: string): string | undefined {
    return this.activeUrls.get(fileId);
  }

  /**
   * Revokes a blob URL and removes it from tracking.
   */
  revokeUrl(fileId: string): void {
    const url = this.activeUrls.get(fileId);
    if (url) {
      URL.revokeObjectURL(url);
      this.activeUrls.delete(fileId);
    }
  }

  /**
   * Revokes all tracked blob URLs.
   */
  revokeAll(): void {
    for (const url of this.activeUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.activeUrls.clear();
  }

  /**
   * Gets the count of active blob URLs.
   */
  get size(): number {
    return this.activeUrls.size;
  }
}

/**
 * Resolves file placeholders in content to blob URLs.
 *
 * @param content - The message content with placeholders
 * @param encryptionKey - CryptoKey for decryption
 * @param blobManager - BlobUrlManager to track URLs
 * @returns Content with placeholders replaced by blob URLs
 */
export async function resolveFilePlaceholders(
  content: string,
  encryptionKey: CryptoKey,
  blobManager: BlobUrlManager
): Promise<string> {
  const fileIds = [...new Set(extractFileIds(content))];

  if (fileIds.length === 0) {
    return content;
  }

  // Resolve all files in parallel and build a map
  const results = await Promise.all(
    fileIds.map(async (fileId) => {
      // Check if we already have a URL for this file
      let url = blobManager.getUrl(fileId);
      const wasCached = !!url;

      if (!url) {
        // Read and decrypt the file
        const result = await readEncryptedFile(fileId, encryptionKey);
        if (result) {
          url = blobManager.createUrl(fileId, result.blob);
        } else {
          getLogger().warn(`[resolveFilePlaceholders] File not found: ${fileId}`);
        }
      } else {
        getLogger().debug(`[resolveFilePlaceholders] Using cached URL for ${fileId}`);
      }

      return { fileId, url, wasCached };
    })
  );

  // Build a map of fileId -> url for efficient lookup
  const fileIdToUrlMap = new Map<string, string>();
  for (const { fileId, url } of results) {
    if (url) {
      fileIdToUrlMap.set(fileId, url);
    }
  }

  // Replace placeholders one at a time in order to ensure correct mapping
  // This avoids any potential issues with regex callback processing order
  let resolvedContent = content;
  for (const [fileId, url] of fileIdToUrlMap) {
    const placeholder = createFilePlaceholder(fileId);
    // Escape the placeholder for use in regex
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Create a non-global regex for this specific placeholder
    const placeholderRegex = new RegExp(escapedPlaceholder, "g");
    // Use unique alt text with fileId to prevent UI blobUrlMap collisions
    const replacement = `![image-${fileId}](${url})`;

    resolvedContent = resolvedContent.replace(placeholderRegex, replacement);
  }

  return resolvedContent;
}
