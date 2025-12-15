import { Model } from "@nozbe/watermelondb";
import type { MemoryType } from "./types";

/**
 * Memory model representing a single extracted memory
 *
 * Note: This model uses raw column accessors instead of decorators
 * for better TypeScript compatibility without requiring legacy decorators.
 */
export class Memory extends Model {
  static table = "memories";

  /** Memory type classification */
  get type(): MemoryType {
    return this._getRaw("type") as MemoryType;
  }

  /** Namespace for grouping related memories */
  get namespace(): string {
    return this._getRaw("namespace") as string;
  }

  /** Key within the namespace */
  get key(): string {
    return this._getRaw("key") as string;
  }

  /** The memory value/content */
  get value(): string {
    return this._getRaw("value") as string;
  }

  /** Raw evidence from which this memory was extracted */
  get rawEvidence(): string {
    return this._getRaw("raw_evidence") as string;
  }

  /** Confidence score (0-1) */
  get confidence(): number {
    return this._getRaw("confidence") as number;
  }

  /** Whether this memory contains PII */
  get pii(): boolean {
    return this._getRaw("pii") as boolean;
  }

  /** Composite key (namespace:key) for efficient lookups */
  get compositeKey(): string {
    return this._getRaw("composite_key") as string;
  }

  /** Unique key (namespace:key:value) for deduplication */
  get uniqueKey(): string {
    return this._getRaw("unique_key") as string;
  }

  /** Created timestamp */
  get createdAt(): Date {
    return new Date(this._getRaw("created_at") as number);
  }

  /** Updated timestamp */
  get updatedAt(): Date {
    return new Date(this._getRaw("updated_at") as number);
  }

  /** Embedding vector for semantic search */
  get embedding(): number[] | undefined {
    const raw = this._getRaw("embedding");
    if (!raw) return undefined;
    try {
      return JSON.parse(raw as string) as number[];
    } catch {
      return undefined;
    }
  }

  /** Model used to generate embedding */
  get embeddingModel(): string | undefined {
    const value = this._getRaw("embedding_model");
    return value ? (value as string) : undefined;
  }

  /** Soft delete flag */
  get isDeleted(): boolean {
    return this._getRaw("is_deleted") as boolean;
  }
}
