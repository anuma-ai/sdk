"use client";

import { useCallback, useState, useMemo, useEffect } from "react";

import { ModelPreference } from "../lib/settingsStorage/models";
import type {
  StoredModelPreference,
  BaseUseSettingsOptions,
  BaseUseSettingsResult,
} from "../lib/settingsStorage/types";
import {
  type SettingsStorageOperationsContext,
  getModelPreferenceOp,
  setModelPreferenceOp,
  deleteModelPreferenceOp,
} from "../lib/settingsStorage/operations";

/**
 * Options for useSettings hook (React version)
 */
export interface UseSettingsOptions extends BaseUseSettingsOptions {}

/**
 * Result returned by useSettings hook (React version)
 */
export interface UseSettingsResult extends BaseUseSettingsResult {}

/**
 * A React hook for managing user settings with automatic persistence using WatermelonDB.
 *
 * This hook provides methods to get, set, and delete user model preferences,
 * with automatic loading of preferences when a wallet address is provided.
 *
 * @param options - Configuration options
 * @returns An object containing settings state and methods
 *
 * @example
 * ```tsx
 * import { Database } from '@nozbe/watermelondb';
 * import { useSettings } from '@reverbia/sdk/react';
 *
 * function SettingsComponent({ database }: { database: Database }) {
 *   const {
 *     modelPreference,
 *     isLoading,
 *     setModelPreference,
 *     getModelPreference,
 *     deleteModelPreference,
 *   } = useSettings({
 *     database,
 *     walletAddress: '0x123...', // Optional: auto-loads preference for this wallet
 *   });
 *
 *   const handleModelChange = async (model: string) => {
 *     await setModelPreference('0x123...', model);
 *   };
 *
 *   return (
 *     <div>
 *       <p>Current model: {modelPreference?.model ?? 'Not set'}</p>
 *       <button onClick={() => handleModelChange('gpt-4o')}>
 *         Use GPT-4o
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @category Hooks
 */
export function useSettings(options: UseSettingsOptions): UseSettingsResult {
  const { database, walletAddress } = options;

  const [modelPreference, setModelPreferenceState] =
    useState<StoredModelPreference | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get collection
  const modelPreferencesCollection = useMemo(
    () => database.get<ModelPreference>("modelPreferences"),
    [database]
  );

  // Storage operations context
  const storageCtx = useMemo<SettingsStorageOperationsContext>(
    () => ({
      database,
      modelPreferencesCollection,
    }),
    [database, modelPreferencesCollection]
  );

  /**
   * Get model preference by wallet address
   */
  const getModelPreference = useCallback(
    async (address: string): Promise<StoredModelPreference | null> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const result = await getModelPreferenceOp(storageCtx, address);
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
   * Set (create or update) model preference
   */
  const setModelPreference = useCallback(
    async (
      address: string,
      models?: string
    ): Promise<StoredModelPreference | null> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const result = await setModelPreferenceOp(storageCtx, address, models);
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
    [storageCtx, walletAddress]
  );

  /**
   * Delete model preference
   */
  const deleteModelPreference = useCallback(
    async (address: string): Promise<boolean> => {
      try {
        if (!address) throw new Error("Wallet address is required");
        const deleted = await deleteModelPreferenceOp(storageCtx, address);
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
    [storageCtx, walletAddress]
  );

  // Auto-load preference when wallet address is provided
  useEffect(() => {
    if (!walletAddress) {
      setModelPreferenceState(null);
      return;
    }

    let cancelled = false;

    const loadPreference = async () => {
      setIsLoading(true);
      try {
        const preference = await getModelPreference(walletAddress);
        if (!cancelled) {
          setModelPreferenceState(preference);
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
  }, [walletAddress, getModelPreference]);

  return {
    modelPreference,
    isLoading,
    getModelPreference,
    setModelPreference,
    deleteModelPreference,
  };
}
