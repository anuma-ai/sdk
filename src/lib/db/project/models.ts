import { Model } from "@nozbe/watermelondb";
import { date, field, text } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";

export class Project extends Model {
  static table = "projects";

  static associations: Associations = {
    conversations: { type: "has_many", foreignKey: "project_id" },
  };

  @text("project_id") projectId!: string;
  @text("name") name!: string;
  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
  @field("is_deleted") isDeleted!: boolean;
}
