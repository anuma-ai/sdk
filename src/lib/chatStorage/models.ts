import { Model } from "@nozbe/watermelondb";
import type { Associations } from "@nozbe/watermelondb/Model";
import type {
  ChatRole,
  FileMetadata,
  ChatCompletionUsage,
  SearchSource,
} from "./types";

/**
 * Message model representing a single chat message
 *
 * Note: This model uses raw column accessors instead of decorators
 * for better TypeScript compatibility without requiring legacy decorators.
 */
export class Message extends Model {
  static table = "history";

  static associations: Associations = {
    conversations: { type: "belongs_to", key: "conversation_id" },
  };

  /** Sequential message ID within conversation */
  get messageId(): number {
    return this._getRaw("message_id") as number;
  }

  /** Links message to its conversation */
  get conversationId(): string {
    return this._getRaw("conversation_id") as string;
  }

  /** Who sent the message: 'user' | 'assistant' | 'system' */
  get role(): ChatRole {
    return this._getRaw("role") as ChatRole;
  }

  /** The message text content */
  get content(): string {
    return this._getRaw("content") as string;
  }

  /** LLM model used (e.g., GPT-4, Claude) */
  get model(): string | undefined {
    const value = this._getRaw("model");
    return value ? (value as string) : undefined;
  }

  /** Optional attached files */
  get files(): FileMetadata[] | undefined {
    const raw = this._getRaw("files");
    if (!raw) return undefined;
    try {
      return JSON.parse(raw as string) as FileMetadata[];
    } catch {
      return undefined;
    }
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
  get vector(): number[] | undefined {
    const raw = this._getRaw("vector");
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

  /** Token counts and cost */
  get usage(): ChatCompletionUsage | undefined {
    const raw = this._getRaw("usage");
    if (!raw) return undefined;
    try {
      return JSON.parse(raw as string) as ChatCompletionUsage;
    } catch {
      return undefined;
    }
  }

  /** Web search sources */
  get sources(): SearchSource[] | undefined {
    const raw = this._getRaw("sources");
    if (!raw) return undefined;
    try {
      return JSON.parse(raw as string) as SearchSource[];
    } catch {
      return undefined;
    }
  }

  /** Response time in seconds */
  get responseDuration(): number | undefined {
    const value = this._getRaw("response_duration");
    return value !== null && value !== undefined ? (value as number) : undefined;
  }

  /** Whether the message generation was stopped by the user */
  get wasStopped(): boolean {
    return this._getRaw("was_stopped") as boolean;
  }
}

/**
 * Conversation model representing conversation metadata
 */
export class Conversation extends Model {
  static table = "conversations";

  static associations: Associations = {
    history: { type: "has_many", foreignKey: "conversation_id" },
  };

  /** Unique conversation identifier */
  get conversationId(): string {
    return this._getRaw("conversation_id") as string;
  }

  /** Conversation title */
  get title(): string {
    return this._getRaw("title") as string;
  }

  /** Created timestamp */
  get createdAt(): Date {
    return new Date(this._getRaw("created_at") as number);
  }

  /** Updated timestamp */
  get updatedAt(): Date {
    return new Date(this._getRaw("updated_at") as number);
  }

  /** Soft delete flag */
  get isDeleted(): boolean {
    return this._getRaw("is_deleted") as boolean;
  }
}
