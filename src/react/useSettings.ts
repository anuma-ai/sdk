"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import {
  type BaseUseSettingsOptions,
  type BaseUseSettingsResult,
  deleteModelPreferenceOp,
  getModelPreferenceOp,
  ModelPreference,
  setModelPreferenceOp,
  type SettingsStorageOperationsContext,
  type StoredModelPreference,
} from "../lib/db/settings";
import {
  deleteUserPreferenceOp,
  getUserPreferenceOp,
  type PersonalitySettings,
  type ProfileUpdate,
  setUserPreferenceOp,
  type StoredUserPreference,
  updateModelsOp,
  updatePersonalityOp,
  updateProfileOp,
  type UpdateUserPreferenceOptions,
  UserPreference,
  type UserPreferencesStorageOperationsContext,
} from "../lib/db/userPreferences";
import {
  getUserSettingsSnapshot,
  patchUserSettingsSnapshot,
  subscribeUserSettings,
} from "./userSettingsStore";

/**
 * Options for useSettings hook (React version)
 * @inline
 */
export type UseSettingsOptions = BaseUseSettingsOptions;

/**
 * Extended result returned by useSettings hook (React version)
 * Includes both legacy modelPreference API and new userPreference API
 */
export interface UseSettingsResult extends BaseUseSettingsResult {
  // New unified API
  userPreference: StoredUserPreference | null;
  getUserPreference: (walletAddress: string) => Promise<StoredUserPreference | null>;
  setUserPreference: (
    walletAddress: string,
    options: UpdateUserPreferenceOptions
  ) => Promise<StoredUserPreference>;
  updateProfile: (
    walletAddress: string,
    profile: ProfileUpdate
  ) => Promise<StoredUserPreference | null>;
  updatePersonality: (
    walletAddress: string,
    personality: PersonalitySettings
  ) => Promise<StoredUserPreference | null>;
  updateModels: (walletAddress: string, models: string) => Promise<StoredUserPreference | null>;
  deleteUserPreference: (walletAddress: string) => Promise<boolean>;
}

/**
 * A React hook for managing user settings with automatic persistence using WatermelonDB.
 *
 * Multiple components calling this hook with the same `(database, walletAddress)`
 * share a single underlying fetch and observe subscription — without this
 * deduplication, every consumer would pay an extra worker-bridge round-trip
 * per mount and trigger WatermelonDB's "raw object sent over the bridge"
 * warning. See `userSettingsStore.ts` for the pool implementation.
 *
 * The hook supports both the legacy `modelPreference` API (deprecated) and
 * the new unified `userPreference` API that stores profile data, model preferences,
 * and personality settings in a single table.
 *
 * @param options - Configuration options
 * @returns An object containing settings state and methods
 *
 * @example
 * ```tsx
 * import { Database } from '@nozbe/watermelondb';
 * import { useSettings } from '@anuma/sdk/react';
 *
 * function SettingsComponent({ database }: { database: Database }) {
 *   const {
 *     userPreference,
 *     isLoading,
 *     setUserPreference,
 *     updateProfile,
 *     updatePersonality,
 *   } = useSettings({
 *     database,
 *     walletAddress: '0x123...', // Auto-loads and migrates preference
 *   });
 *
 *   const handleProfileUpdate = async () => {
 *     await updateProfile('0x123...', {
 *       nickname: 'John',
 *       occupation: 'Developer',
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       <p>Nickname: {userPreference?.nickname ?? 'Not set'}</p>
 *       <button onClick={handleProfileUpdate}>Update Profile</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @category Hooks
 */
export function useSettings(options: UseSettingsOptions): UseSettingsResult {
  const { database, walletAddress } = options;

  // Subscribe to the shared pool. The pool guarantees one fetch + one observe
  // per (database, walletAddress) regardless of how many hook instances mount.
  const subscribe = useCallback(
    (listener: () => void) => subscribeUserSettings(database, walletAddress, listener),
    [database, walletAddress]
  );
  const getSnapshot = useCallback(
    () => getUserSettingsSnapshot(database, walletAddress),
    [database, walletAddress]
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Storage operation contexts for the mutation callbacks. Collection lookups
  // are stable per-database in WatermelonDB so these are cheap.
  const storageCtx = useMemo<UserPreferencesStorageOperationsContext>(
    () => ({
      database,
      userPreferencesCollection: database.get<UserPreference>("userPreferences"),
      modelPreferencesCollection: database.get<ModelPreference>("modelPreferences"),
    }),
    [database]
  );
  const legacyStorageCtx = useMemo<SettingsStorageOperationsContext>(
    () => ({
      database,
      modelPreferencesCollection: database.get<ModelPreference>("modelPreferences"),
    }),
    [database]
  );

  // ===== Legacy API (deprecated) =====

  /**
   * Get model preference by wallet address
   * @deprecated Use getUserPreference instead
   */
  const getModelPreference = useCallback(
    async (address: string): Promise<StoredModelPreference | null> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const result = await getModelPreferenceOp(legacyStorageCtx, address);
        return result;
      } catch (error) {
        // eslint-disable-next-line preserve-caught-error -- ES2020 target doesn't support ErrorOptions
        throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
      }
    },
    [legacyStorageCtx]
  );

  /**
   * Set (create or update) model preference
   * @deprecated Use setUserPreference instead
   */
  const setModelPreference = useCallback(
    async (address: string, models?: string): Promise<StoredModelPreference | null> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const result = await setModelPreferenceOp(legacyStorageCtx, address, models);
        if (walletAddress && address === walletAddress) {
          patchUserSettingsSnapshot(database, walletAddress, { modelPreference: result });
        }
        return result;
      } catch (error) {
        // eslint-disable-next-line preserve-caught-error -- ES2020 target doesn't support ErrorOptions
        throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
      }
    },
    [database, legacyStorageCtx, walletAddress]
  );

  /**
   * Delete model preference
   * @deprecated Use deleteUserPreference instead
   */
  const deleteModelPreference = useCallback(
    async (address: string): Promise<boolean> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const deleted = await deleteModelPreferenceOp(legacyStorageCtx, address);
        if (deleted && walletAddress && address === walletAddress) {
          patchUserSettingsSnapshot(database, walletAddress, { modelPreference: null });
        }
        return deleted;
      } catch (error) {
        // eslint-disable-next-line preserve-caught-error -- ES2020 target doesn't support ErrorOptions
        throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
      }
    },
    [database, legacyStorageCtx, walletAddress]
  );

  // ===== New Unified API =====

  /**
   * Get user preference by wallet address
   */
  const getUserPreference = useCallback(
    async (address: string): Promise<StoredUserPreference | null> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const result = await getUserPreferenceOp(storageCtx, address);
        return result;
      } catch (error) {
        // eslint-disable-next-line preserve-caught-error -- ES2020 target doesn't support ErrorOptions
        throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
      }
    },
    [storageCtx]
  );

  /**
   * Set (create or update) user preference
   */
  const setUserPreference = useCallback(
    async (address: string, opts: UpdateUserPreferenceOptions): Promise<StoredUserPreference> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const result = await setUserPreferenceOp(storageCtx, address, opts);
        if (walletAddress && address === walletAddress) {
          patchUserSettingsSnapshot(database, walletAddress, { userPreference: result });
        }
        return result;
      } catch (error) {
        // eslint-disable-next-line preserve-caught-error -- ES2020 target doesn't support ErrorOptions
        throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
      }
    },
    [database, storageCtx, walletAddress]
  );

  /**
   * Update only profile fields (nickname, occupation, description)
   */
  const updateProfile = useCallback(
    async (address: string, profile: ProfileUpdate): Promise<StoredUserPreference | null> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const result = await updateProfileOp(storageCtx, address, profile);
        if (result && walletAddress && address === walletAddress) {
          patchUserSettingsSnapshot(database, walletAddress, { userPreference: result });
        }
        return result;
      } catch (error) {
        // eslint-disable-next-line preserve-caught-error -- ES2020 target doesn't support ErrorOptions
        throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
      }
    },
    [database, storageCtx, walletAddress]
  );

  /**
   * Update only personality settings
   */
  const updatePersonality = useCallback(
    async (
      address: string,
      personality: PersonalitySettings
    ): Promise<StoredUserPreference | null> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const result = await updatePersonalityOp(storageCtx, address, personality);
        if (result && walletAddress && address === walletAddress) {
          patchUserSettingsSnapshot(database, walletAddress, { userPreference: result });
        }
        return result;
      } catch (error) {
        // eslint-disable-next-line preserve-caught-error -- ES2020 target doesn't support ErrorOptions
        throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
      }
    },
    [database, storageCtx, walletAddress]
  );

  /**
   * Update only model preferences
   */
  const updateModels = useCallback(
    async (address: string, models: string): Promise<StoredUserPreference | null> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const result = await updateModelsOp(storageCtx, address, models);
        if (result && walletAddress && address === walletAddress) {
          patchUserSettingsSnapshot(database, walletAddress, { userPreference: result });
        }
        return result;
      } catch (error) {
        // eslint-disable-next-line preserve-caught-error -- ES2020 target doesn't support ErrorOptions
        throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
      }
    },
    [database, storageCtx, walletAddress]
  );

  /**
   * Delete user preference
   */
  const deleteUserPreference = useCallback(
    async (address: string): Promise<boolean> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const deleted = await deleteUserPreferenceOp(storageCtx, address);
        if (deleted && walletAddress && address === walletAddress) {
          patchUserSettingsSnapshot(database, walletAddress, { userPreference: null });
        }
        return deleted;
      } catch (error) {
        // eslint-disable-next-line preserve-caught-error -- ES2020 target doesn't support ErrorOptions
        throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
      }
    },
    [database, storageCtx, walletAddress]
  );

  return {
    // Legacy API (deprecated)
    modelPreference: snapshot.modelPreference,
    getModelPreference,
    setModelPreference,
    deleteModelPreference,

    // New unified API
    userPreference: snapshot.userPreference,
    isLoading: snapshot.isLoading,
    getUserPreference,
    setUserPreference,
    updateProfile,
    updatePersonality,
    updateModels,
    deleteUserPreference,
  };
}
