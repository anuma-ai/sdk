/**
 * Lazy Decryption Utilities for Conversations
 *
 * Provides on-demand decryption with caching to avoid re-decrypting
 * the same content multiple times. This improves performance by:
 * 1. Only decrypting data when it's actually accessed
 * 2. Caching decrypted content to avoid redundant crypto operations
 */

import type { StoredConversation } from "./types";
import { decryptConversationFields } from "./conversationEncryption";
import type { SignMessageFn, EmbeddedWalletSignerFn } from "../../../react/useEncryption";

/**
 * Cache for decrypted conversations.
 * Key format: `${walletAddress}:${uniqueId}`
 */
const conversationDecryptionCache = new Map<string, StoredConversation>();

/**
 * Maximum cache size to prevent memory leaks
 */
const MAX_CONVERSATION_CACHE_SIZE = 100;

/**
 * Generate cache key for a conversation
 */
function getCacheKey(walletAddress: string, uniqueId: string): string {
  return `${walletAddress}:${uniqueId}`;
}

/**
 * Evict oldest entries if cache exceeds max size (simple LRU approximation)
 */
function evictIfNeeded(cache: Map<string, StoredConversation>, maxSize: number): void {
  if (cache.size > maxSize) {
    // Delete oldest 20% of entries
    const toDelete = Math.floor(maxSize * 0.2);
    const keys = Array.from(cache.keys()).slice(0, toDelete);
    for (const key of keys) {
      cache.delete(key);
    }
  }
}

/**
 * Check if a conversation is in the decryption cache
 */
export function isConversationCached(walletAddress: string, uniqueId: string): boolean {
  return conversationDecryptionCache.has(getCacheKey(walletAddress, uniqueId));
}

/**
 * Get a cached decrypted conversation
 */
export function getCachedConversation(walletAddress: string, uniqueId: string): StoredConversation | undefined {
  return conversationDecryptionCache.get(getCacheKey(walletAddress, uniqueId));
}

/**
 * Decrypt a single conversation on-demand with caching.
 *
 * @param conversation - The raw (potentially encrypted) conversation
 * @param walletAddress - The wallet address for decryption
 * @param signMessage - Optional sign message function
 * @param embeddedWalletSigner - Optional embedded wallet signer
 * @returns Decrypted conversation
 */
export async function decryptConversationLazy(
  conversation: StoredConversation,
  walletAddress: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredConversation> {
  const cacheKey = getCacheKey(walletAddress, conversation.uniqueId);

  // Check cache first
  const cached = conversationDecryptionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Decrypt the conversation
  const decrypted = await decryptConversationFields(conversation, walletAddress, signMessage, embeddedWalletSigner);

  // Cache the result
  evictIfNeeded(conversationDecryptionCache, MAX_CONVERSATION_CACHE_SIZE);
  conversationDecryptionCache.set(cacheKey, decrypted);

  return decrypted;
}

/**
 * Clear conversation decryption cache.
 * Call this when user logs out or switches wallets.
 */
export function clearDecryptionCache(): void {
  conversationDecryptionCache.clear();
}

/**
 * Clear decryption cache for a specific wallet.
 */
export function clearDecryptionCacheForWallet(walletAddress: string): void {
  const prefix = `${walletAddress}:`;

  for (const key of conversationDecryptionCache.keys()) {
    if (key.startsWith(prefix)) {
      conversationDecryptionCache.delete(key);
    }
  }
}

/**
 * Invalidate cache for a specific conversation (e.g., after update)
 */
export function invalidateConversationCache(walletAddress: string, uniqueId: string): void {
  conversationDecryptionCache.delete(getCacheKey(walletAddress, uniqueId));
}

/**
 * Get cache statistics for debugging
 */
export function getDecryptionCacheStats(): {
  conversationsCached: number;
  maxConversations: number;
} {
  return {
    conversationsCached: conversationDecryptionCache.size,
    maxConversations: MAX_CONVERSATION_CACHE_SIZE,
  };
}
