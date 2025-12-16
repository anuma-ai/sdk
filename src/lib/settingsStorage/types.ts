import type { Database } from "@nozbe/watermelondb";

/**
 * Stored model preference record (what gets persisted to the database)
 */
export interface StoredModelPreference {
  /** Primary key (WatermelonDB auto-generated) */
  uniqueId: string;
  /** User's wallet address */
  walletAddress: string;
  /** Preferred model identifier */
  model?: string;
}

/**
 * Options for creating a new model preference
 */
export interface CreateModelPreferenceOptions {
  /** User's wallet address */
  walletAddress: string;
  /** Preferred model identifier */
  model?: string;
}

/**
 * Options for updating a model preference
 */
export interface UpdateModelPreferenceOptions {
  /** New preferred model identifier */
  model?: string;
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
 * Result with data and error pattern
 */
export interface SettingsResult<T> {
  data: T;
  error: string | null;
}

/**
 * Base result returned by useSettings hook
 */
export interface BaseUseSettingsResult {
  /** Current model preference */
  modelPreference: StoredModelPreference | null;
  /** Whether the settings are loading */
  isLoading: boolean;
  /** Get model preference by wallet address */
  getModelPreference: (
    walletAddress: string
  ) => Promise<SettingsResult<StoredModelPreference | null>>;
  /** Create or update model preference */
  setModelPreference: (
    walletAddress: string,
    model?: string
  ) => Promise<SettingsResult<StoredModelPreference | null>>;
  /** Delete model preference */
  deleteModelPreference: (
    walletAddress: string
  ) => Promise<SettingsResult<boolean>>;
}
