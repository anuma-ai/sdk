import { Model } from "@nozbe/watermelondb";
import { date, field, readonly, text } from "@nozbe/watermelondb/decorators";

export class VaultFolder extends Model {
  static table = "vault_folders";

  @text("name") name!: string;
  @text("scope") scope!: string;
  @readonly @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
  @field("is_deleted") isDeleted!: boolean;
}
