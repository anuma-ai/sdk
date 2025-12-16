import { Model } from "@nozbe/watermelondb";

/**
 * ModelPreference model representing user model preferences
 *
 * Note: This model uses raw column accessors instead of decorators
 * for better TypeScript compatibility without requiring legacy decorators.
 */
export class ModelPreference extends Model {
  static table = "modelPreferences";

  /** User's wallet address */
  get walletAddress(): string {
    return this._getRaw("wallet_address") as string;
  }

  /** Preferred model identifier */
  get model(): string | undefined {
    const value = this._getRaw("model");
    return value ? (value as string) : undefined;
  }
}
