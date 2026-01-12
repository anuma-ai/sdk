import { Model } from "@nozbe/watermelondb";
import { field, text, date, json } from "@nozbe/watermelondb/decorators";
import type { MemoryType } from "./types";

export class Memory extends Model {
  static table = "memories";

  @text("type") type!: MemoryType;
  @text("namespace") namespace!: string;
  @text("key") key!: string;
  @text("value") value!: string;
  @text("raw_evidence") rawEvidence!: string;
  @field("confidence") confidence!: number;
  @field("pii") pii!: boolean;
  @text("composite_key") compositeKey!: string;
  @text("unique_key") uniqueKey!: string;
  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
  @date("accessed_at") accessedAt!: Date;
  @json("embedding", (json) => json) embedding?: number[];
  @text("embedding_model") embeddingModel?: string;
  @field("is_deleted") isDeleted!: boolean;
  /** ID of the memory this one superseded (replaced) */
  @text("supersedes") supersedes?: string;
  /** The previous value before this memory replaced it */
  @text("previous_value") previousValue?: string;
}
