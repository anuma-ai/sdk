import type { Database } from "@nozbe/watermelondb";

// Core types

export interface StoredModelPreference {
  uniqueId: string;
  walletAddress: string;
  models?: string;
}

export interface CreateModelPreferenceOptions {
  walletAddress: string;
  models?: string;
}

export interface UpdateModelPreferenceOptions {
  models?: string;
}

// Hook types

/**
 * @inline
 */
export interface BaseUseSettingsOptions {
  /**
   * The WatermelonDB instance. May be `null` while the database is not yet
   * bound (e.g. during cold start / logged-out renders on mobile, where the
   * wrapper holds `null` until the wallet resolves). When `null`, the hook is
   * inert: `userPreference`/`modelPreference` are `null`, `isLoading` is
   * `false`, and mutation callbacks reject with a clear error.
   */
  database: Database | null;
  walletAddress?: string;
}

export interface BaseUseSettingsResult {
  modelPreference: StoredModelPreference | null;
  isLoading: boolean;
  getModelPreference: (walletAddress: string) => Promise<StoredModelPreference | null>;
  setModelPreference: (
    walletAddress: string,
    models?: string
  ) => Promise<StoredModelPreference | null>;
  deleteModelPreference: (walletAddress: string) => Promise<boolean>;
}
