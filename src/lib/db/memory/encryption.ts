import { encryptData, decryptData, requestEncryptionKey, encryptDataDeterministic } from "../../../react/useEncryption";
import type { SignMessageFn } from "../../../react/useEncryption";
import type { CreateMemoryOptions, StoredMemory, MemoryItem } from "./types";

const ENCRYPTION_PREFIX = "enc:v2:";

/**
 * Checks if a string value is encrypted (has the enc:v2: prefix)
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX);
}

/**
 * Encrypts a field value and adds the encryption prefix
 */
export async function encryptField(
  value: string,
  address: string,
  signMessage?: SignMessageFn
): Promise<string> {
  if (!value) return value;
  if (!address || !signMessage) return value; // Return plaintext if encryption not available
  
  try {
    // Request encryption key if needed
    await requestEncryptionKey(address, signMessage);
    
    const encrypted = await encryptData(value, address);
    return `${ENCRYPTION_PREFIX}${encrypted}`;
  } catch (error) {
    // If encryption fails, return plaintext (backwards compatibility)
    console.warn("Failed to encrypt field, storing as plaintext:", error);
    return value;
  }
}

/**
 * Decrypts a field value by removing the prefix and decrypting
 * Returns the original value if not encrypted or if decryption fails
 */
export async function decryptField(
  value: string,
  address: string
): Promise<string> {
  if (!value || !isEncrypted(value)) {
    return value;
  }
  
  try {
    const encryptedData = value.slice(ENCRYPTION_PREFIX.length);
    return await decryptData(encryptedData, address);
  } catch (error) {
    // If decryption fails, return the original value (backwards compatibility)
    console.warn("Failed to decrypt field, returning as-is:", error);
    return value;
  }
}

/**
 * Encrypts all sensitive memory fields (value, rawEvidence, key, namespace)
 */
export async function encryptMemoryFields(
  memory: CreateMemoryOptions | MemoryItem,
  address: string,
  signMessage?: SignMessageFn
): Promise<CreateMemoryOptions> {
  if (!address || !signMessage) {
    // No encryption if wallet address not provided
    return memory as CreateMemoryOptions;
  }
  
  try {
    // Use deterministic encryption for namespace, key, and value (used in queries/keys)
    // Use random IV encryption for rawEvidence (not queried)
    const [encryptedNamespace, encryptedKey, encryptedValue, encryptedRawEvidence] =
      await Promise.all([
        encryptFieldDeterministic(memory.namespace, address, signMessage),
        encryptFieldDeterministic(memory.key, address, signMessage),
        encryptFieldDeterministic(memory.value, address, signMessage), // Deterministic for unique key generation
        encryptField(memory.rawEvidence, address, signMessage), // Random IV is fine for rawEvidence
      ]);
    
    return {
      ...memory,
      namespace: encryptedNamespace,
      key: encryptedKey,
      value: encryptedValue,
      rawEvidence: encryptedRawEvidence,
    };
  } catch (error) {
    // If encryption fails, return original memory (backwards compatibility)
    console.warn("Failed to encrypt memory fields, storing as plaintext:", error);
    return memory as CreateMemoryOptions;
  }
}

/**
 * Decrypts all sensitive memory fields if they are encrypted
 */
export async function decryptMemoryFields(
  memory: StoredMemory | MemoryItem,
  address?: string
): Promise<StoredMemory | MemoryItem> {
  if (!address) {
    // No decryption if wallet address not provided
    return memory;
  }
  
  const [decryptedNamespace, decryptedKey, decryptedValue, decryptedRawEvidence] =
    await Promise.all([
      decryptField(memory.namespace, address),
      decryptField(memory.key, address),
      decryptField(memory.value, address),
      decryptField(memory.rawEvidence, address),
    ]);
  
  return {
    ...memory,
    namespace: decryptedNamespace,
    key: decryptedKey,
    value: decryptedValue,
    rawEvidence: decryptedRawEvidence,
  };
}

/**
 * Encrypts a field deterministically for queryable fields (namespace, key)
 * Uses deterministic IV so same plaintext always produces same ciphertext
 */
async function encryptFieldDeterministic(
  value: string,
  address: string,
  signMessage?: SignMessageFn
): Promise<string> {
  if (!value) return value;
  if (!address || !signMessage) return value;
  
  try {
    await requestEncryptionKey(address, signMessage);
    const encrypted = await encryptDataDeterministic(value, address);
    return `${ENCRYPTION_PREFIX}${encrypted}`;
  } catch (error) {
    console.warn("Failed to encrypt field deterministically, storing as plaintext:", error);
    return value;
  }
}

/**
 * Encrypts a namespace for querying (used when searching by namespace)
 * Uses deterministic encryption so queries work
 */
export async function encryptNamespaceForQuery(
  namespace: string,
  address: string,
  signMessage?: SignMessageFn
): Promise<string> {
  if (!address || !signMessage) {
    return namespace;
  }
  return await encryptFieldDeterministic(namespace, address, signMessage);
}

/**
 * Encrypts a key for querying (used when searching by key)
 * Uses deterministic encryption so queries work
 */
export async function encryptKeyForQuery(
  key: string,
  address: string,
  signMessage?: SignMessageFn
): Promise<string> {
  if (!address || !signMessage) {
    return key;
  }
  return await encryptFieldDeterministic(key, address, signMessage);
}

/**
 * Encrypts a value for querying (used when generating unique keys)
 * Uses deterministic encryption so unique key generation works
 */
export async function encryptValueForQuery(
  value: string,
  address: string,
  signMessage?: SignMessageFn
): Promise<string> {
  if (!address || !signMessage) {
    return value;
  }
  return await encryptFieldDeterministic(value, address, signMessage);
}
