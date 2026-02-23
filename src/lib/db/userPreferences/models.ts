import { Model } from "@nozbe/watermelondb";
import { field, text } from "@nozbe/watermelondb/decorators";

/**
 * WatermelonDB model for user preferences.
 *
 * Stores unified user preferences including profile data, model preferences,
 * and personality settings.
 */
export class UserPreference extends Model {
  static table = "userPreferences";

  // Identity
  @text("wallet_address") walletAddress!: string;

  // Profile fields
  @text("nickname") nickname?: string;
  @text("occupation") occupation?: string;
  @text("description") description?: string;

  // Settings (JSON strings)
  @text("models") models?: string;
  @text("personality") personality?: string;

  // Timestamps
  @field("created_at") createdAt!: number;
  @field("updated_at") updatedAt!: number;
}
