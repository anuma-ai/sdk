import { decryptData, requestEncryptionKey, encryptDataDeterministic } from "../../../react/useEncryption";
import type { SignMessageFn, EmbeddedWalletSignerFn } from "../../../react/useEncryption";
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
 * 
 * Note: This function now uses deterministic encryption (same plaintext produces same ciphertext)
 * to enable content comparison for embedding preservation checks. The IV is derived from the
 * plaintext and address, ensuring consistent encryption while maintaining security.
 */
export async function encryptField(
  value: string,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<string> {
  // Delegate to deterministic encryption for consistency
  return await encryptFieldDeterministic(value, address, signMessage, embeddedWalletSigner);
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
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<CreateMemoryOptions> {
  if (!address || !signMessage) {
    // No encryption if wallet address not provided
    return memory as CreateMemoryOptions;
  }
  
  try {
    // Use deterministic encryption for all fields (namespace, key, value, rawEvidence)
    // Deterministic encryption ensures same plaintext produces same ciphertext, enabling
    // content comparison for embedding preservation checks
    const [encryptedNamespace, encryptedKey, encryptedValue, encryptedRawEvidence] =
      await Promise.all([
        encryptFieldDeterministic(memory.namespace, address, signMessage, embeddedWalletSigner),
        encryptFieldDeterministic(memory.key, address, signMessage, embeddedWalletSigner),
        encryptFieldDeterministic(memory.value, address, signMessage, embeddedWalletSigner), // Deterministic for unique key generation
        encryptFieldDeterministic(memory.rawEvidence, address, signMessage, embeddedWalletSigner), // Deterministic for embedding preservation checks
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
  address?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredMemory | MemoryItem> {
  if (!address) {
    // No decryption if wallet address not provided
    return memory;
  }
  
  // Request encryption key if needed (allows decryption even if key not in memory)
  if (signMessage) {
    try {
      await requestEncryptionKey(address, signMessage, embeddedWalletSigner);
    } catch (error) {
      // If key request fails, continue anyway - decryptField will handle errors gracefully
      console.warn("Failed to request encryption key for decryption:", error);
    }
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
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<string> {
  if (!value) return value;
  if (!address || !signMessage) return value;
  
  // Skip encryption if already encrypted (prevents double encryption)
  if (isEncrypted(value)) {
    return value;
  }
  
  try {
    await requestEncryptionKey(address, signMessage, embeddedWalletSigner);
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
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<string> {
  if (!address || !signMessage) {
    return namespace;
  }
  return await encryptFieldDeterministic(namespace, address, signMessage, embeddedWalletSigner);
}

/**
 * Encrypts a key for querying (used when searching by key)
 * Uses deterministic encryption so queries work
 */
export async function encryptKeyForQuery(
  key: string,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<string> {
  if (!address || !signMessage) {
    return key;
  }
  return await encryptFieldDeterministic(key, address, signMessage, embeddedWalletSigner);
}

/**
 * Encrypts a value for querying (used when generating unique keys)
 * Uses deterministic encryption so unique key generation works
 */
export async function encryptValueForQuery(
  value: string,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<string> {
  if (!address || !signMessage) {
    return value;
  }
  return await encryptFieldDeterministic(value, address, signMessage, embeddedWalletSigner);
}
