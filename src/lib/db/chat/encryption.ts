/**
 * Chat Message Encryption Utilities
 *
 * Encrypts sensitive chat message fields at rest while keeping search/index fields unencrypted.
 */

import { encryptData, decryptData, hasEncryptionKey } from "../../../react/useEncryption";
import type { SignMessageFn } from "../../../react/useEncryption";
import {
  migrateEncryptedValue,
  hasMigrationCompleted,
  markMigrationCompleted,
  isOldEncryption,
} from "../migration";

/**
 * Fields that should be encrypted (sensitive content).
 * Only the content field is encrypted - vectors and embeddings remain unencrypted for search.
 */
const ENCRYPTED_FIELDS = ["content"] as const;

// Note: The following fields are NOT encrypted (indexes/search functionality):
// - message_id, conversation_id: DB indexes
// - vector, embedding: Vector for similarity search (must remain unencrypted for vector operations)
// - role, model: Metadata used for filtering
// - usage, sources, files: Metadata
// - is_deleted: Soft delete flag
// - uniqueId, id, _status, _changed, created_at, updated_at: DB internals

/**
 * Encryption version markers for migration support
 */
const ENCRYPTION_PREFIX_V1 = "enc:v1:";
const ENCRYPTION_PREFIX_V2 = "enc:v2:";
const ENCRYPTION_PREFIX_LEGACY = "enc:"; // Old format, treat as v1

/**
 * Current encryption version
 */
const CURRENT_ENCRYPTION_VERSION = "v2";

/**
 * Prefix to identify encrypted values.
 */
const ENCRYPTION_PREFIX = `enc:${CURRENT_ENCRYPTION_VERSION}:`;

/**
 * Maximum size for a single field value to encrypt (1MB)
 * Prevents DoS attacks via extremely large inputs
 */
const MAX_FIELD_SIZE = 1024 * 1024; // 1MB

/**
 * Check if a value is already encrypted (has our prefix)
 */
function isEncrypted(value: string): boolean {
  return (
    value.startsWith(ENCRYPTION_PREFIX) ||
    value.startsWith(ENCRYPTION_PREFIX_V1) ||
    value.startsWith(ENCRYPTION_PREFIX_LEGACY)
  );
}

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
 * Encrypt a single string value using the SDK's encryption.
 * Returns the encrypted value with a prefix for identification.
 *
 * @param value - The plain text value to encrypt
 * @param address - The user's wallet address (encryption key identifier)
 * @returns The encrypted value with prefix
 * @throws {Error} If encryption fails - prevents sensitive data from being stored unencrypted
 */
export async function encryptField(
  value: string,
  address: string
): Promise<string> {
  if (!value || isEncrypted(value)) {
    return value;
  }

  // Validate input size to prevent DoS
  if (value.length > MAX_FIELD_SIZE) {
    throw new Error(
      `Field value too large: ${value.length} bytes (max: ${MAX_FIELD_SIZE} bytes)`
    );
  }

  try {
    const encrypted = await encryptData(value, address);
    return `${ENCRYPTION_PREFIX}${encrypted}`;
  } catch (error) {
    // Throw error to prevent sensitive data from being stored unencrypted
    const message =
      error instanceof Error ? error.message : "Unknown encryption error";
    throw new Error(`Encryption failed: ${message}`);
  }
}

/**
 * Placeholder returned when decryption fails.
 * Allows UI to render a friendly message instead of gibberish.
 */
export const DECRYPTION_FAILED_PLACEHOLDER = "[Decryption Failed]";

/**
 * Decrypt a single string value using the SDK's decryption.
 * Supports both v1 (legacy) and v2 encryption formats.
 * Automatically migrates old encrypted values to new format.
 *
 * @param value - The encrypted value (with prefix)
 * @param address - The user's wallet address (encryption key identifier)
 * @param signMessage - Optional function to sign message for migration (required if old encryption detected)
 * @param onMigrated - Optional callback when a value is migrated
 * @returns The decrypted plain text, original value if not encrypted, or placeholder on error
 */
export async function decryptField(
  value: string,
  address: string,
  signMessage?: SignMessageFn,
  onMigrated?: (migratedValue: string) => Promise<void>
): Promise<string> {
  if (!value || !isEncrypted(value)) {
    return value;
  }

  try {
    // Check if this is old encryption and migration is needed
    // Note: We can decrypt old data even if migration is marked complete (for backward compatibility)
    // Migration is just to update the prefix format, not required for decryption
    if (isOldEncryption(value) && signMessage && !hasMigrationCompleted(address)) {
      try {
        // Migrate to new encryption (updates prefix format)
        const migratedValue = await migrateEncryptedValue(value, address, signMessage);
        
        // Callback to update the field in storage
        if (onMigrated) {
          await onMigrated(migratedValue);
        }
        
        // Mark migration as completed to prevent repeated attempts
        markMigrationCompleted(address);
        
        // Decrypt the newly migrated value
        const encryptedPayload = migratedValue.slice(ENCRYPTION_PREFIX_V2.length);
        return await decryptData(encryptedPayload, address);
      } catch (migrationError) {
        // Migration failed - try to decrypt with current key as fallback
        // (same key derivation, so this should work)
        if (process.env.NODE_ENV === "development") {
          console.warn("Migration failed, attempting decryption with current key:", migrationError);
        }
        // Fall through to normal decryption (which handles old prefixes)
        // This ensures old data can still be decrypted even if migration fails
      }
    }

    // Extract encrypted payload based on version
    let encryptedPayload: string;
    if (value.startsWith(ENCRYPTION_PREFIX_V2)) {
      encryptedPayload = value.slice(ENCRYPTION_PREFIX_V2.length);
    } else if (value.startsWith(ENCRYPTION_PREFIX_V1)) {
      encryptedPayload = value.slice(ENCRYPTION_PREFIX_V1.length);
    } else if (value.startsWith(ENCRYPTION_PREFIX_LEGACY)) {
      // Legacy format (v1)
      encryptedPayload = value.slice(ENCRYPTION_PREFIX_LEGACY.length);
    } else {
      // Should not happen, but handle gracefully
      return value;
    }

    return await decryptData(encryptedPayload, address);
  } catch (error) {
    // Log error details in development for debugging
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn("Decryption failed for field:", {
        address,
        valueLength: value.length,
        error: error instanceof Error ? error.message : error,
      });
    }
    // Return placeholder so UI can render a friendly message instead of gibberish
    return DECRYPTION_FAILED_PLACEHOLDER;
  }
}

/**
 * Message data structure with fields that may be encrypted
 */
export interface MessageData {
  content?: string;
  [key: string]: unknown;
}

/**
 * Encrypt sensitive fields in a message object.
 * Only encrypts the fields defined in ENCRYPTED_FIELDS.
 * Vectors and other indexed fields are left unencrypted.
 *
 * @param message - The message object with plain text fields
 * @param address - The user's wallet address
 * @returns A new message object with sensitive fields encrypted
 */
export async function encryptMessageFields<T extends MessageData>(
  message: T,
  address: string
): Promise<T> {
  const encrypted = { ...message };

  // Encrypt each sensitive field
  for (const field of ENCRYPTED_FIELDS) {
    const value = message[field];
    if (typeof value === "string" && value.length > 0) {
      encrypted[field] = await encryptField(value, address);
    }
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in a message object.
 * Only decrypts the fields defined in ENCRYPTED_FIELDS.
 * Automatically migrates old encrypted values to new format.
 * Also encrypts unencrypted fields when found (for users migrating to encryption).
 *
 * @param message - The message object with encrypted fields
 * @param address - The user's wallet address
 * @param signMessage - Optional function to sign message for migration (required if old encryption detected)
 * @param updateMessage - Optional function to update message in storage after migration/encryption
 * @returns A new message object with sensitive fields decrypted
 */
export async function decryptMessageFields<T extends MessageData>(
  message: T,
  address: string,
  signMessage?: SignMessageFn,
  updateMessage?: (id: string, data: Partial<T>) => Promise<void>
): Promise<T> {
  const decrypted = { ...message };

  // Process each sensitive field
  for (const field of ENCRYPTED_FIELDS) {
    const value = message[field];
    if (typeof value === "string" && value.length > 0) {
      // Check if field is unencrypted and needs encryption
      if (!isEncrypted(value)) {
        // Encrypt unencrypted field and update in storage
        if (updateMessage && (message as unknown as { uniqueId?: string }).uniqueId) {
          try {
            const encryptedValue = await encryptField(value, address);
            await updateMessage((message as unknown as { uniqueId: string }).uniqueId, {
              [field]: encryptedValue,
            } as Partial<T>);
            // Return decrypted value for local state (user sees plaintext)
            decrypted[field] = value;
          } catch (error) {
            // If encryption fails, return original value
            if (process.env.NODE_ENV === "development") {
              console.warn(`Failed to encrypt field ${field}:`, error);
            }
            decrypted[field] = value;
          }
        } else {
          // No update function, just return original value
          decrypted[field] = value;
        }
      } else {
        // Field is encrypted - decrypt it (and migrate if v1)
        const onMigrated = updateMessage && (message as unknown as { uniqueId?: string }).uniqueId
          ? async (migratedValue: string) => {
              await updateMessage((message as unknown as { uniqueId: string }).uniqueId, {
                [field]: migratedValue,
              } as Partial<T>);
            }
          : undefined;
        
        decrypted[field] = await decryptField(value, address, signMessage, onMigrated);
      }
    }
  }

  return decrypted;
}

/**
 * Batch encrypt multiple message objects.
 * Uses parallel processing for performance.
 *
 * @param messages - Array of message objects
 * @param address - The user's wallet address
 * @returns Array of message objects with encrypted fields
 */
export async function encryptMessagesBatch<T extends MessageData>(
  messages: T[],
  address: string
): Promise<T[]> {
  return Promise.all(
    messages.map((message) => encryptMessageFields(message, address))
  );
}

/**
 * Batch decrypt multiple message objects.
 * Uses parallel processing for performance.
 * Automatically migrates old encrypted values to new format.
 *
 * @param messages - Array of message objects
 * @param address - The user's wallet address
 * @param signMessage - Optional function to sign message for migration (required if old encryption detected)
 * @param updateMessage - Optional function to update message in storage after migration
 * @returns Array of message objects with decrypted fields
 */
export async function decryptMessagesBatch<T extends MessageData>(
  messages: T[],
  address: string,
  signMessage?: SignMessageFn,
  updateMessage?: (id: string, data: Partial<T>) => Promise<void>
): Promise<T[]> {
  return Promise.all(
    messages.map((message) =>
      decryptMessageFields(message, address, signMessage, updateMessage)
    )
  );
}

/**
 * Check if a message has any encrypted fields.
 * Useful for determining if migration is needed.
 */
export function hasEncryptedFields(message: MessageData): boolean {
  return ENCRYPTED_FIELDS.some((field) => {
    const value = message[field];
    return typeof value === "string" && isEncrypted(value);
  });
}

/**
 * Check if a message needs encryption (has unencrypted sensitive fields).
 */
export function needsEncryption(message: MessageData): boolean {
  return ENCRYPTED_FIELDS.some((field) => {
    const value = message[field];
    return typeof value === "string" && value.length > 0 && !isEncrypted(value);
  });
}

