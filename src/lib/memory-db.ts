import Dexie, { type Table } from "dexie";
import type { MemoryItem } from "./memory-service";

/**
 * Extended MemoryItem with database fields
 */
export interface StoredMemoryItem extends MemoryItem {
  id?: number; // Auto-increment primary key
  createdAt: number; // Timestamp when memory was created
  updatedAt: number; // Timestamp when memory was last updated
  // Composite key for querying: namespace + key (allows multiple values)
  compositeKey: string; // Format: `${namespace}:${key}`
  // Unique key for exact duplicates: namespace + key + value
  uniqueKey: string; // Format: `${namespace}:${key}:${value}`
}

/**
 * Dexie database for storing user memories
 */
class MemoryDatabase extends Dexie {
  memories!: Table<StoredMemoryItem>;

  constructor() {
    super("MemoryDatabase");

    // Version 2: Supports multiple values per namespace:key combination
    // uniqueKey ensures exact duplicates (namespace:key:value) are updated, not duplicated
    this.version(2).stores({
      memories:
        "++id, uniqueKey, compositeKey, namespace, key, type, createdAt, updatedAt",
    });
  }
}

// Create and export a singleton instance
export const memoryDb = new MemoryDatabase();

/**
 * Save a memory item to IndexedDB
 * If a memory with the same namespace:key:value exists, it will be updated
 * Multiple entries with the same namespace:key but different values are allowed
 */
export const saveMemory = async (memory: MemoryItem): Promise<void> => {
  const compositeKey = `${memory.namespace}:${memory.key}`;
  const uniqueKey = `${memory.namespace}:${memory.key}:${memory.value}`;
  const now = Date.now();

  // Check if exact duplicate exists (same namespace:key:value)
  const existing = await memoryDb.memories
    .where("uniqueKey")
    .equals(uniqueKey)
    .first();

  if (existing) {
    // Update existing memory (same namespace:key:value combination)
    await memoryDb.memories.update(existing.id!, {
      ...memory,
      compositeKey,
      uniqueKey,
      updatedAt: now,
      // Preserve createdAt
      createdAt: existing.createdAt,
    });
  } else {
    // Insert new memory (allows multiple entries with same namespace:key)
    await memoryDb.memories.add({
      ...memory,
      compositeKey,
      uniqueKey,
      createdAt: now,
      updatedAt: now,
    });
  }
};

/**
 * Save multiple memory items to IndexedDB
 */
export const saveMemories = async (memories: MemoryItem[]): Promise<void> => {
  await Promise.all(memories.map((memory) => saveMemory(memory)));
};

/**
 * Get all memories from IndexedDB
 */
export const getAllMemories = async (): Promise<StoredMemoryItem[]> => {
  return memoryDb.memories.toArray();
};

/**
 * Get memories by namespace
 */
export const getMemoriesByNamespace = async (
  namespace: string
): Promise<StoredMemoryItem[]> => {
  return memoryDb.memories.where("namespace").equals(namespace).toArray();
};

/**
 * Get all memories by namespace and key
 * Returns all entries with the same namespace:key (e.g., all food likes)
 */
export const getMemories = async (
  namespace: string,
  key: string
): Promise<StoredMemoryItem[]> => {
  const compositeKey = `${namespace}:${key}`;
  return memoryDb.memories.where("compositeKey").equals(compositeKey).toArray();
};

/**
 * Get a specific memory by namespace, key, and value
 */
export const getMemory = async (
  namespace: string,
  key: string,
  value: string
): Promise<StoredMemoryItem | undefined> => {
  const uniqueKey = `${namespace}:${key}:${value}`;
  return memoryDb.memories.where("uniqueKey").equals(uniqueKey).first();
};

/**
 * Delete all memories by namespace and key
 */
export const deleteMemories = async (
  namespace: string,
  key: string
): Promise<void> => {
  const compositeKey = `${namespace}:${key}`;
  await memoryDb.memories.where("compositeKey").equals(compositeKey).delete();
};

/**
 * Delete a specific memory by namespace, key, and value
 */
export const deleteMemory = async (
  namespace: string,
  key: string,
  value: string
): Promise<void> => {
  const uniqueKey = `${namespace}:${key}:${value}`;
  const existing = await memoryDb.memories
    .where("uniqueKey")
    .equals(uniqueKey)
    .first();

  if (existing?.id) {
    await memoryDb.memories.delete(existing.id);
  }
};

/**
 * Clear all memories from IndexedDB
 */
export const clearAllMemories = async (): Promise<void> => {
  await memoryDb.memories.clear();
};
