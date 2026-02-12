"use client";

import { Q } from "@nozbe/watermelondb";
import { useCallback, useState, useMemo, useEffect } from "react";

import {
  ModelPreference,
  type StoredModelPreference,
  type SettingsStorageOperationsContext,
  type BaseUseSettingsOptions,
  type BaseUseSettingsResult,
  getModelPreferenceOp,
  setModelPreferenceOp,
  deleteModelPreferenceOp,
} from "../lib/db/settings";

import {
  UserPreference,
  type StoredUserPreference,
  type UpdateUserPreferenceOptions,
  type ProfileUpdate,
  type PersonalitySettings,
  type UserPreferencesStorageOperationsContext,
  getUserPreferenceOp,
  setUserPreferenceOp,
  updateProfileOp,
  updatePersonalityOp,
  updateModelsOp,
  deleteUserPreferenceOp,
  migrateFromModelPreferencesOp,
} from "../lib/db/userPreferences";

/**
 * Options for useSettings hook (React version)
 * @inline
 */
export interface UseSettingsOptions extends BaseUseSettingsOptions {}

/**
 * Extended result returned by useSettings hook (React version)
 * Includes both legacy modelPreference API and new userPreference API
 */
export interface UseSettingsResult extends BaseUseSettingsResult {
  // New unified API
  userPreference: StoredUserPreference | null;
  getUserPreference: (
    walletAddress: string
  ) => Promise<StoredUserPreference | null>;
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
  updateModels: (
    walletAddress: string,
    models: string
  ) => Promise<StoredUserPreference | null>;
  deleteUserPreference: (walletAddress: string) => Promise<boolean>;
}

/**
 * A React hook for managing user settings with automatic persistence using WatermelonDB.
 *
 * This hook provides methods to get, set, and delete user preferences,
 * with automatic loading and migration when a wallet address is provided.
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

  // Legacy state (deprecated)
  const [modelPreference, setModelPreferenceState] =
    useState<StoredModelPreference | null>(null);

  // New unified state
  const [userPreference, setUserPreferenceState] =
    useState<StoredUserPreference | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Get collections
  const modelPreferencesCollection = useMemo(
    () => database.get<ModelPreference>("modelPreferences"),
    [database]
  );

  const userPreferencesCollection = useMemo(
    () => database.get<UserPreference>("userPreferences"),
    [database]
  );

  // Legacy storage operations context (deprecated)
  const legacyStorageCtx = useMemo<SettingsStorageOperationsContext>(
    () => ({
      database,
      modelPreferencesCollection,
    }),
    [database, modelPreferencesCollection]
  );

  // New storage operations context
  const storageCtx = useMemo<UserPreferencesStorageOperationsContext>(
    () => ({
      database,
      userPreferencesCollection,
      modelPreferencesCollection, // For migration
    }),
    [database, userPreferencesCollection, modelPreferencesCollection]
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
        throw new Error(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
      }
    },
    [legacyStorageCtx]
  );

  /**
   * Set (create or update) model preference
   * @deprecated Use setUserPreference instead
   */
  const setModelPreference = useCallback(
    async (
      address: string,
      models?: string
    ): Promise<StoredModelPreference | null> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const result = await setModelPreferenceOp(
          legacyStorageCtx,
          address,
          models
        );
        // Update local state if this is for the current wallet
        if (walletAddress && address === walletAddress) {
          setModelPreferenceState(result);
        }
        return result;
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
      }
    },
    [legacyStorageCtx, walletAddress]
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
        // Clear local state if this is for the current wallet
        if (deleted && walletAddress && address === walletAddress) {
          setModelPreferenceState(null);
        }
        return deleted;
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
      }
    },
    [legacyStorageCtx, walletAddress]
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
        throw new Error(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
      }
    },
    [storageCtx]
  );

  /**
   * Set (create or update) user preference
   */
  const setUserPreference = useCallback(
    async (
      address: string,
      opts: UpdateUserPreferenceOptions
    ): Promise<StoredUserPreference> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const result = await setUserPreferenceOp(storageCtx, address, opts);
        // Update local state if this is for the current wallet
        if (walletAddress && address === walletAddress) {
          setUserPreferenceState(result);
        }
        return result;
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
      }
    },
    [storageCtx, walletAddress]
  );

  /**
   * Update only profile fields (nickname, occupation, description)
   */
  const updateProfile = useCallback(
    async (
      address: string,
      profile: ProfileUpdate
    ): Promise<StoredUserPreference | null> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const result = await updateProfileOp(storageCtx, address, profile);
        // Update local state if this is for the current wallet
        if (result && walletAddress && address === walletAddress) {
          setUserPreferenceState(result);
        }
        return result;
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
      }
    },
    [storageCtx, walletAddress]
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
        const result = await updatePersonalityOp(
          storageCtx,
          address,
          personality
        );
        // Update local state if this is for the current wallet
        if (result && walletAddress && address === walletAddress) {
          setUserPreferenceState(result);
        }
        return result;
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
      }
    },
    [storageCtx, walletAddress]
  );

  /**
   * Update only model preferences
   */
  const updateModels = useCallback(
    async (
      address: string,
      models: string
    ): Promise<StoredUserPreference | null> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const result = await updateModelsOp(storageCtx, address, models);
        // Update local state if this is for the current wallet
        if (result && walletAddress && address === walletAddress) {
          setUserPreferenceState(result);
        }
        return result;
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
      }
    },
    [storageCtx, walletAddress]
  );

  /**
   * Delete user preference
   */
  const deleteUserPreference = useCallback(
    async (address: string): Promise<boolean> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const deleted = await deleteUserPreferenceOp(storageCtx, address);
        // Clear local state if this is for the current wallet
        if (deleted && walletAddress && address === walletAddress) {
          setUserPreferenceState(null);
        }
        return deleted;
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
      }
    },
    [storageCtx, walletAddress]
  );

  // Auto-load and migrate preference when wallet address is provided
  useEffect(() => {
    if (!walletAddress) {
      setModelPreferenceState(null);
      setUserPreferenceState(null);
      return;
    }

    let cancelled = false;

    const loadPreference = async () => {
      setIsLoading(true);
      try {
        // First, try to get existing userPreference
        let preference = await getUserPreferenceOp(storageCtx, walletAddress);

        // If not found, try to migrate from old modelPreferences
        if (!preference) {
          preference = await migrateFromModelPreferencesOp(
            storageCtx,
            walletAddress
          );
        }

        if (!cancelled) {
          setUserPreferenceState(preference);
        }

        // Also load legacy modelPreference for backward compat
        const legacyPreference = await getModelPreferenceOp(
          legacyStorageCtx,
          walletAddress
        );
        if (!cancelled) {
          setModelPreferenceState(legacyPreference);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadPreference();

    return () => {
      cancelled = true;
    };
  }, [walletAddress, storageCtx, legacyStorageCtx]);

  // Subscribe to userPreferences changes for real-time updates
  // Using observeWithColumns to detect changes to specific columns
  useEffect(() => {
    if (!walletAddress) return;

    const subscription = userPreferencesCollection
      .query(Q.where("wallet_address", walletAddress))
      .observeWithColumns([
        "nickname",
        "occupation",
        "description",
        "models",
        "personality",
        "updated_at",
      ])
      .subscribe((records) => {
        const record = records[0];
        if (record) {
          setUserPreferenceState({
            uniqueId: record.id,
            walletAddress: record.walletAddress,
            nickname: record.nickname,
            occupation: record.occupation,
            description: record.description,
            models: record.models,
            personality: record.personality,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          });
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [walletAddress, userPreferencesCollection]);

  return {
    // Legacy API (deprecated)
    modelPreference,
    getModelPreference,
    setModelPreference,
    deleteModelPreference,

    // New unified API
    userPreference,
    isLoading,
    getUserPreference,
    setUserPreference,
    updateProfile,
    updatePersonality,
    updateModels,
    deleteUserPreference,
  };
}
