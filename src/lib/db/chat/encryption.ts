import { decryptData, requestEncryptionKey, encryptDataDeterministic, encryptData } from "../../../react/useEncryption";
import type { SignMessageFn, EmbeddedWalletSignerFn } from "../../../react/useEncryption";
import type { CreateMessageOptions, StoredMessage, CreateConversationOptions, StoredConversation } from "./types";

const ENCRYPTION_PREFIX = "enc:v2:";

/**
 * Checks if a string value is encrypted (has the enc:v2: prefix)
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX);
}

/**
 * Encrypts a field value deterministically (for queryable fields like conversation titles)
 * Same plaintext + address always produces same ciphertext
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
 * Encrypts a field value non-deterministically (for content fields)
 * Each encryption produces different ciphertext for same plaintext
 */
async function encryptFieldNonDeterministic(
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
    const encrypted = await encryptData(value, address);
    return `${ENCRYPTION_PREFIX}${encrypted}`;
  } catch (error) {
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
 * Encrypts a JSON string (for files and thoughtProcess which are stored as JSON strings in DB)
 * Returns the encrypted JSON string
 */
export async function encryptJsonString(
  jsonString: string,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<string> {
  if (!jsonString) return jsonString;
  if (!address || !signMessage) return jsonString;
  
  try {
    return await encryptFieldNonDeterministic(jsonString, address, signMessage, embeddedWalletSigner);
  } catch (error) {
    console.warn("Failed to encrypt JSON string, storing as plaintext:", error);
    return jsonString;
  }
}

/**
 * Decrypts an encrypted JSON string and parses it
 */
export async function decryptJsonString<T>(
  encryptedJsonString: string,
  address: string
): Promise<T | null> {
  if (!encryptedJsonString) return null;
  
  try {
    const decrypted = await decryptField(encryptedJsonString, address);
    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.warn("Failed to decrypt JSON string:", error);
    return null;
  }
}

/**
 * Encrypts all sensitive message fields
 * Fields encrypted: content, files (JSON), error, thinking, thoughtProcess (JSON)
 * Fields kept unencrypted: vector, embedding_model, role, model, usage, sources, responseDuration, wasStopped, messageId, conversationId, timestamps
 */
export async function encryptMessageFields(
  message: CreateMessageOptions | StoredMessage,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<CreateMessageOptions> {
  if (!address || !signMessage) {
    // No encryption if wallet address not provided
    return message as CreateMessageOptions;
  }
  
  try {
    // Encrypt string fields non-deterministically (content, error, thinking)
    const [encryptedContent, encryptedError, encryptedThinking] = await Promise.all([
      message.content ? encryptFieldNonDeterministic(message.content, address, signMessage, embeddedWalletSigner) : undefined,
      message.error ? encryptFieldNonDeterministic(message.error, address, signMessage, embeddedWalletSigner) : undefined,
      message.thinking ? encryptFieldNonDeterministic(message.thinking, address, signMessage, embeddedWalletSigner) : undefined,
    ]);
    
    // Note: files and thoughtProcess will be encrypted as JSON strings in operations.ts
    // We encrypt the content, error, and thinking fields here
    
    return {
      ...message,
      content: encryptedContent ?? message.content,
      files: message.files, // Will be encrypted as JSON string in operations.ts
      error: encryptedError ?? message.error,
      thinking: encryptedThinking ?? message.thinking,
      thoughtProcess: message.thoughtProcess, // Will be encrypted as JSON string in operations.ts
      // Keep these unencrypted: vector, embedding_model, role, model, usage, sources, responseDuration, wasStopped
    };
  } catch (error) {
    // If encryption fails, return original message (backwards compatibility)
    console.warn("Failed to encrypt message fields, storing as plaintext:", error);
    return message as CreateMessageOptions;
  }
}

/**
 * Decrypts all sensitive message fields if they are encrypted
 */
export async function decryptMessageFields(
  message: StoredMessage,
  address?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredMessage> {
  if (!address) {
    // No decryption if wallet address not provided
    return message;
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
  
  // Decrypt string fields
  const [decryptedContent, decryptedError, decryptedThinking] = await Promise.all([
    message.content ? decryptField(message.content, address) : undefined,
    message.error ? decryptField(message.error, address) : undefined,
    message.thinking ? decryptField(message.thinking, address) : undefined,
  ]);
  
  // Note: files and thoughtProcess will be decrypted from JSON strings in operations.ts
  // They are already parsed as objects by WatermelonDB's @json decorator
  
  return {
    ...message,
    content: decryptedContent ?? message.content,
    files: message.files, // Will be decrypted from JSON string in operations.ts
    error: decryptedError ?? message.error,
    thinking: decryptedThinking ?? message.thinking,
    thoughtProcess: message.thoughtProcess, // Will be decrypted from JSON string in operations.ts
  };
}

/**
 * Encrypts conversation title (deterministic for querying)
 */
export async function encryptConversationFields(
  conversation: CreateConversationOptions | StoredConversation,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<CreateConversationOptions> {
  if (!address || !signMessage) {
    // No encryption if wallet address not provided
    return conversation as CreateConversationOptions;
  }
  
  try {
    // Use deterministic encryption for title (queryable field)
    const encryptedTitle = conversation.title
      ? await encryptFieldDeterministic(conversation.title, address, signMessage, embeddedWalletSigner)
      : conversation.title;
    
    return {
      ...conversation,
      title: encryptedTitle ?? conversation.title,
    };
  } catch (error) {
    // If encryption fails, return original conversation (backwards compatibility)
    console.warn("Failed to encrypt conversation fields, storing as plaintext:", error);
    return conversation as CreateConversationOptions;
  }
}

/**
 * Decrypts conversation title if it is encrypted
 */
export async function decryptConversationFields(
  conversation: StoredConversation,
  address?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredConversation> {
  if (!address) {
    // No decryption if wallet address not provided
    return conversation;
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
  
  const decryptedTitle = conversation.title
    ? await decryptField(conversation.title, address)
    : conversation.title;
  
  return {
    ...conversation,
    title: decryptedTitle ?? conversation.title,
  };
}
