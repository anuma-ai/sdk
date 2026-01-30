import type { Database } from "@nozbe/watermelondb";
import type { MemoryExtractionResult } from "../../memory/service";
import type { SignMessageFn, EmbeddedWalletSignerFn } from "../../../react/useEncryption";

// Core types

export type MemoryType =
  | "identity"
  | "preference"
  | "project"
  | "skill"
  | "constraint";

export interface MemoryItem {
  type: MemoryType;
  namespace: string;
  key: string;
  value: string;
  rawEvidence: string;
  confidence: number;
  pii: boolean;
}

export interface CreateMemoryOptions extends MemoryItem {
  embedding?: number[];
  embeddingModel?: string;
}

export type UpdateMemoryOptions = Partial<CreateMemoryOptions>;

export interface StoredMemory extends MemoryItem {
  uniqueId: string;
  compositeKey: string;
  uniqueKey: string;
  createdAt: Date;
  updatedAt: Date;
  embedding?: number[];
  embeddingModel?: string;
  isDeleted: boolean;
}

export interface StoredMemoryWithSimilarity extends StoredMemory {
  similarity: number;
}

export type UpdateMemoryResult =
  | { ok: true; memory: StoredMemory }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "conflict"; conflictingKey: string }
  | { ok: false; reason: "error"; error: Error };

// Hook types

/**
 * @inline
 */
export interface BaseUseMemoryStorageOptions {
  database: Database;
  completionsModel?: string;
  embeddingModel?: string | null;
  generateEmbeddings?: boolean;
  onFactsExtracted?: (facts: MemoryExtractionResult) => void;
  getToken?: () => Promise<string | null>;
  baseUrl?: string;
  walletAddress?: string;
  signMessage?: SignMessageFn;
  embeddedWalletSigner?: EmbeddedWalletSignerFn;
}

export interface BaseUseMemoryStorageResult {
  memories: StoredMemory[];
  refreshMemories: () => Promise<void>;
  extractMemoriesFromMessage: (options: {
    messages: Array<{ role: string; content: string }>;
    model?: string;
  }) => Promise<MemoryExtractionResult | null>;
  searchMemories: (
    query: string,
    limit?: number,
    minSimilarity?: number
  ) => Promise<StoredMemoryWithSimilarity[]>;
  fetchAllMemories: () => Promise<StoredMemory[]>;
  fetchMemoriesByNamespace: (namespace: string) => Promise<StoredMemory[]>;
  fetchMemoriesByKey: (
    namespace: string,
    key: string
  ) => Promise<StoredMemory[]>;
  getMemoryById: (id: string) => Promise<StoredMemory | null>;
  saveMemory: (memory: CreateMemoryOptions) => Promise<StoredMemory>;
  saveMemories: (memories: CreateMemoryOptions[]) => Promise<StoredMemory[]>;
  updateMemory: (
    id: string,
    updates: UpdateMemoryOptions
  ) => Promise<StoredMemory | null>;
  removeMemory: (
    namespace: string,
    key: string,
    value: string
  ) => Promise<void>;
  removeMemoryById: (id: string) => Promise<void>;
  removeMemories: (namespace: string, key: string) => Promise<void>;
  clearMemories: () => Promise<void>;
}

// Utility functions

export function generateCompositeKey(namespace: string, key: string): string {
  return `${namespace}:${key}`;
}

export function generateUniqueKey(
  namespace: string,
  key: string,
  value: string
): string {
  return `${namespace}:${key}:${value}`;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}
