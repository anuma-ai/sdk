import { Model } from "@nozbe/watermelondb";
import { text } from "@nozbe/watermelondb/decorators";

export class ModelPreference extends Model {
  static table = "modelPreferences";

  @text("wallet_address") walletAddress!: string;
  @text("models") models?: string;
}
