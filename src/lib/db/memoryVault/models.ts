import { Model } from "@nozbe/watermelondb";
import { date, field, readonly, text } from "@nozbe/watermelondb/decorators";

export class VaultMemory extends Model {
  static table = "memory_vault";

  @text("content") content!: string;
  @text("scope") scope!: string;
  @field("folder_id") folderId!: string | null;
  @field("user_id") userId!: string | null;
  @field("embedding") embedding!: string | null;
  @readonly @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
  @field("is_deleted") isDeleted!: boolean;

  // Truth Layer (v28) — cryptographic provenance + append-only history
  @field("signature") signature!: string | null;
  @field("grant_id") grantId!: string | null;
  @field("source_metadata") sourceMetadata!: string | null; // JSON
  @field("parent_state_hash") parentStateHash!: string | null;
  @field("retired_at") retiredAt!: number | null; // unix ms; null = active
}
