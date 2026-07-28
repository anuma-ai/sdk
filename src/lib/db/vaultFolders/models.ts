import { Model } from "@nozbe/watermelondb";
import { date, field, readonly, text } from "@nozbe/watermelondb/decorators";

export class VaultFolder extends Model {
  static table = "vault_folders";

  @text("name") name!: string;
  @text("scope") scope!: string;
  /** Owner in multi-user server deployments; null on single-tenant client DBs. */
  @field("user_id") userId!: string | null;
  @readonly @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
  @field("is_deleted") isDeleted!: boolean;
  @field("is_system") isSystem!: boolean;
  @text("context") context!: string | null;
}
