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

export interface BaseUseSettingsOptions {
  database: Database;
  walletAddress?: string;
}

export interface BaseUseSettingsResult {
  modelPreference: StoredModelPreference | null;
  isLoading: boolean;
  getModelPreference: (
    walletAddress: string
  ) => Promise<StoredModelPreference | null>;
  setModelPreference: (
    walletAddress: string,
    models?: string
  ) => Promise<StoredModelPreference | null>;
  deleteModelPreference: (walletAddress: string) => Promise<boolean>;
}
