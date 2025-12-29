/**
 * Memory Encryption Utilities
 *
 * Encrypts sensitive memory fields at rest while keeping search/index fields unencrypted.
 * Based on the implementation from ai-memoryless-client.
 */

import { encryptData, decryptData, hasEncryptionKey } from "../../../react/useEncryption";
import type { SignMessageFn } from "../../../react/useEncryption";
import {
  migrateEncryptedValue,
  isOldEncryption,
} from "../migration";

/**
 * Fields that should be encrypted (sensitive content).
 * These fields contain user data that needs protection at rest.
 */
const ENCRYPTED_FIELDS = ["value", "rawEvidence", "key", "namespace"] as const;

// Note: The following fields are NOT encrypted (indexes/search functionality):
// - memory_id, conversation_id: DB indexes
// - embedding: Vector for similarity search (must remain unencrypted for vector operations)
// - type, confidence, pii: Metadata used for filtering
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
 * This allows us to distinguish encrypted data from plain data during migration.
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
    // Always migrate v1 fields when encountered (if signMessage and onMigrated are provided)
    // The migration status check is removed to allow individual field migrations
    if (isOldEncryption(value) && signMessage && onMigrated) {
      try {
        // Migrate to new encryption (updates prefix format)
        const migratedValue = await migrateEncryptedValue(value, address, signMessage);
        
        // Callback to update the field in storage
        await onMigrated(migratedValue);
        
        // Decrypt the newly migrated value
        const encryptedPayload = migratedValue.slice(ENCRYPTION_PREFIX_V2.length);
        return await decryptData(encryptedPayload, address);
      } catch (migrationError) {
        // Migration failed - log error for monitoring (all environments)
        const errorMessage = migrationError instanceof Error ? migrationError.message : "Unknown migration error";
        // eslint-disable-next-line no-console
        console.warn("Migration failed, attempting decryption with current key:", {
          error: errorMessage,
          address,
        });
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
    // Log error details for security monitoring (all environments)
    const errorMessage = error instanceof Error ? error.message : "Unknown decryption error";
    // eslint-disable-next-line no-console
    console.error("Decryption failed for field:", {
      address,
      valueLength: value.length,
      error: errorMessage,
    });
    
    // Throw error instead of returning placeholder to enable proper error handling
    // and security monitoring. UI components should catch and handle these errors.
    throw new Error(`Decryption failed: ${errorMessage}`);
  }
}

/**
 * Memory data structure with fields that may be encrypted
 */
export interface MemoryData {
  value?: string;
  rawEvidence?: string;
  key?: string;
  namespace?: string;
  [key: string]: unknown;
}

/**
 * Encrypt sensitive fields in a memory object.
 * Only encrypts the fields defined in ENCRYPTED_FIELDS.
 * Embeddings and other indexed fields are left unencrypted.
 *
 * @param memory - The memory object with plain text fields
 * @param address - The user's wallet address
 * @returns A new memory object with sensitive fields encrypted
 */
export async function encryptMemoryFields<T extends MemoryData>(
  memory: T,
  address: string
): Promise<T> {
  const encrypted = { ...memory };

  // Encrypt each sensitive field in parallel for performance
  // Use Promise.allSettled to catch all errors, then throw if any failed
  // This ensures atomic behavior - either all fields encrypt or none
  const encryptionPromises = ENCRYPTED_FIELDS.map(async (field) => {
    const value = memory[field];
    if (typeof value === "string" && value.length > 0) {
      try {
        encrypted[field] = await encryptField(value, address);
      } catch (error) {
        // Re-throw with field context for better error messages
        throw new Error(`Failed to encrypt field ${field}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  });

  const results = await Promise.allSettled(encryptionPromises);
  
  // Check if any encryption failed
  const failures = results.filter(r => r.status === "rejected");
  if (failures.length > 0) {
    // Throw error with details of which fields failed
    const errorMessages = failures.map(f => 
      f.status === "rejected" ? (f.reason instanceof Error ? f.reason.message : String(f.reason)) : ""
    ).join("; ");
    throw new Error(`Encryption failed for ${failures.length} field(s): ${errorMessages}`);
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in a memory object.
 * Only decrypts the fields defined in ENCRYPTED_FIELDS.
 * Automatically migrates old encrypted values to new format.
 * Also encrypts unencrypted fields when found (for users migrating to encryption).
 *
 * @param memory - The memory object with encrypted fields
 * @param address - The user's wallet address
 * @param signMessage - Optional function to sign message for migration (required if old encryption detected)
 * @param updateMemory - Optional function to update memory in storage after migration/encryption
 * @returns A new memory object with sensitive fields decrypted
 */
export async function decryptMemoryFields<T extends MemoryData>(
  memory: T,
  address: string,
  signMessage?: SignMessageFn,
  updateMemory?: (id: string, data: Partial<T>) => Promise<void>
): Promise<T> {
  const decrypted = { ...memory };

  // Process each sensitive field in parallel for performance
  const decryptionPromises = ENCRYPTED_FIELDS.map(async (field) => {
    const value = memory[field];
    if (typeof value === "string" && value.length > 0) {
      // Check if field is unencrypted and needs encryption
      if (!isEncrypted(value)) {
        // Encrypt unencrypted field and update in storage
        if (updateMemory && (memory as unknown as { uniqueId?: string }).uniqueId) {
          try {
            const encryptedValue = await encryptField(value, address);
            await updateMemory((memory as unknown as { uniqueId: string }).uniqueId, {
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
        const onMigrated = updateMemory && (memory as unknown as { uniqueId?: string }).uniqueId
          ? async (migratedValue: string) => {
              await updateMemory((memory as unknown as { uniqueId: string }).uniqueId, {
                [field]: migratedValue,
              } as Partial<T>);
            }
          : undefined;
        
        decrypted[field] = await decryptField(value, address, signMessage, onMigrated);
      }
    }
  });

  await Promise.all(decryptionPromises);

  return decrypted;
}

/**
 * Batch encrypt multiple memory objects.
 * Uses parallel processing for performance.
 *
 * @param memories - Array of memory objects
 * @param address - The user's wallet address
 * @returns Array of memory objects with encrypted fields
 */
export async function encryptMemoriesBatch<T extends MemoryData>(
  memories: T[],
  address: string
): Promise<T[]> {
  return Promise.all(
    memories.map((memory) => encryptMemoryFields(memory, address))
  );
}

/**
 * Batch decrypt multiple memory objects.
 * Uses parallel processing for performance.
 * Automatically migrates old encrypted values to new format.
 *
 * @param memories - Array of memory objects
 * @param address - The user's wallet address
 * @param signMessage - Optional function to sign message for migration (required if old encryption detected)
 * @param updateMemory - Optional function to update memory in storage after migration
 * @returns Array of memory objects with decrypted fields
 */
export async function decryptMemoriesBatch<T extends MemoryData>(
  memories: T[],
  address: string,
  signMessage?: SignMessageFn,
  updateMemory?: (id: string, data: Partial<T>) => Promise<void>
): Promise<T[]> {
  return Promise.all(
    memories.map((memory) =>
      decryptMemoryFields(memory, address, signMessage, updateMemory)
    )
  );
}

/**
 * Check if a memory has any encrypted fields.
 * Useful for determining if migration is needed.
 */
export function hasEncryptedFields(memory: MemoryData): boolean {
  return ENCRYPTED_FIELDS.some((field) => {
    const value = memory[field];
    return typeof value === "string" && isEncrypted(value);
  });
}

/**
 * Check if a memory needs encryption (has unencrypted sensitive fields).
 */
export function needsEncryption(memory: MemoryData): boolean {
  return ENCRYPTED_FIELDS.some((field) => {
    const value = memory[field];
    return typeof value === "string" && value.length > 0 && !isEncrypted(value);
  });
}

/**
 * Memory fields needed for encryption update
 */
export interface MemoryEncryptionFields extends MemoryData {
  type: string;
  namespace: string;
  key: string;
  value: string;
  rawEvidence: string;
  confidence: number;
  pii: boolean;
}

/**
 * Extract the fields needed for encryption from a stored memory.
 */
export function extractMemoryFieldsForEncryption(memory: {
  type: string;
  namespace: string;
  key: string;
  value: string;
  rawEvidence: string;
  confidence: number;
  pii: boolean;
}): MemoryEncryptionFields {
  return {
    type: memory.type,
    namespace: memory.namespace,
    key: memory.key,
    value: memory.value,
    rawEvidence: memory.rawEvidence,
    confidence: memory.confidence,
    pii: memory.pii,
  };
}

/**
 * Memory object with the required fields for batch encryption
 */
interface MemoryForBatchEncryption {
  uniqueId: string;
  type: string;
  namespace: string;
  key: string;
  value: string;
  rawEvidence: string;
  confidence: number;
  pii: boolean;
}

/**
 * Retry an encryption operation with exponential backoff
 */
async function retryEncryption<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 500
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: delay = initialDelay * 2^attempt
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Encrypt a batch of memories in parallel with rate limiting and retry logic.
 * Tracks failed memories for error reporting.
 *
 * @param memories - Array of memories to encrypt
 * @param address - User's wallet address
 * @param updateFn - Function to update a memory in storage
 * @param batchSize - Number of memories to process in parallel (default: 5)
 * @returns Object with success count and failed memory IDs
 */
export async function encryptMemoriesBatchInPlace(
  memories: MemoryForBatchEncryption[],
  address: string,
  updateFn: (id: string, data: MemoryData) => Promise<unknown>,
  batchSize = 5
): Promise<{ success: number; failed: string[]; errors: Array<{ id: string; error: string }> }> {
  const failed: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];
  let success = 0;

  for (let i = 0; i < memories.length; i += batchSize) {
    const batch = memories.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (memory) => {
        // Retry encryption with exponential backoff
        await retryEncryption(async () => {
          const fields = extractMemoryFieldsForEncryption(memory);
          const encryptedData = await encryptMemoryFields(fields, address);
          await updateFn(memory.uniqueId, encryptedData);
        });
      })
    );

    // Track successes and failures
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        success++;
      } else {
        const memory = batch[index];
        if (memory) {
          failed.push(memory.uniqueId);
          const errorMessage = result.reason instanceof Error 
            ? result.reason.message 
            : String(result.reason);
          
          errors.push({
            id: memory.uniqueId,
            error: errorMessage,
          });
          
          // Log error in all environments for monitoring
          // eslint-disable-next-line no-console
          console.error(
            "Failed to encrypt memory:",
            memory.uniqueId,
            errorMessage
          );
        }
      }
    });
  }

  return { success, failed, errors };
}

