/**
 * Types for the conversation-memory storage module.
 *
 * A conversation-memory row links a conversation to a vault memory it drew on,
 * so the conversation Memories panel survives reload. Only the memory id and
 * recall score are stored; content lives in the encrypted memory_vault.
 */

/** Plain object representation of a conversation-memory record. */
export interface StoredConversationMemory {
  /** WatermelonDB internal ID */
  uniqueId: string;
  /** The conversation this memory was drawn on in */
  conversationId: string;
  /** The memory_vault record id this row points at */
  memoryId: string;
  /** Recall relevance score (~0–1) at the time it was recorded */
  score: number;
  createdAt: Date;
}

/** One memory drawn on during a turn, passed to addConversationMemoriesOp. */
export interface ConversationMemoryInput {
  memoryId: string;
  score: number;
}
