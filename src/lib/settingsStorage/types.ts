import type { Database } from "@nozbe/watermelondb";

/**
 * Stored model preference record (what gets persisted to the database)
 */
export interface StoredModelPreference {
  /** Primary key (WatermelonDB auto-generated) */
  uniqueId: string;
  /** User's wallet address */
  walletAddress: string;
  /** Preferred model identifiers */
  models?: string;
}

/**
 * Options for creating a new model preference
 */
export interface CreateModelPreferenceOptions {
  /** User's wallet address */
  walletAddress: string;
  /** Preferred model identifiers */
  models?: string;
}

/**
 * Options for updating a model preference
 */
export interface UpdateModelPreferenceOptions {
  /** New preferred model identifiers */
  models?: string;
}

/**
 * Base options for useSettings hook
 */
export interface BaseUseSettingsOptions {
  /** WatermelonDB database instance */
  database: Database;
  /** User's wallet address */
  walletAddress?: string;
}

/**
 * Base result returned by useSettings hook
 */
export interface BaseUseSettingsResult {
  /** Current model preference */
  modelPreference: StoredModelPreference | null;
  /** Whether the settings are loading */
  isLoading: boolean;
  /** Get model preference by wallet address. Throws on error. */
  getModelPreference: (
    walletAddress: string
  ) => Promise<StoredModelPreference | null>;
  /** Create or update model preference. Throws on error. */
  setModelPreference: (
    walletAddress: string,
    models?: string
  ) => Promise<StoredModelPreference | null>;
  /** Delete model preference. Throws on error. */
  deleteModelPreference: (walletAddress: string) => Promise<boolean>;
}
