import { Q } from "@nozbe/watermelondb";
import type { Database, Collection } from "@nozbe/watermelondb";

import { ModelPreference } from "./models";
import type {
  StoredModelPreference,
  CreateModelPreferenceOptions,
  UpdateModelPreferenceOptions,
} from "./types";

/**
 * Convert a ModelPreference model to StoredModelPreference
 */
export function modelPreferenceToStored(
  preference: ModelPreference
): StoredModelPreference {
  return {
    uniqueId: preference.id,
    walletAddress: preference.walletAddress,
    model: preference.model,
  };
}

/**
 * Settings storage operations context
 */
export interface SettingsStorageOperationsContext {
  database: Database;
  modelPreferencesCollection: Collection<ModelPreference>;
}

/**
 * Get model preference by wallet address
 */
export async function getModelPreferenceOp(
  ctx: SettingsStorageOperationsContext,
  walletAddress: string
): Promise<StoredModelPreference | null> {
  const results = await ctx.modelPreferencesCollection
    .query(Q.where("wallet_address", walletAddress))
    .fetch();

  return results.length > 0 ? modelPreferenceToStored(results[0]) : null;
}

/**
 * Create a new model preference
 */
export async function createModelPreferenceOp(
  ctx: SettingsStorageOperationsContext,
  opts: CreateModelPreferenceOptions
): Promise<StoredModelPreference> {
  const created = await ctx.database.write(async () => {
    return await ctx.modelPreferencesCollection.create((pref) => {
      pref._setRaw("wallet_address", opts.walletAddress);
      if (opts.model) pref._setRaw("model", opts.model);
    });
  });

  return modelPreferenceToStored(created);
}

/**
 * Update model preference
 * @returns The updated preference, or null if not found
 */
export async function updateModelPreferenceOp(
  ctx: SettingsStorageOperationsContext,
  walletAddress: string,
  opts: UpdateModelPreferenceOptions
): Promise<StoredModelPreference | null> {
  const results = await ctx.modelPreferencesCollection
    .query(Q.where("wallet_address", walletAddress))
    .fetch();

  if (results.length === 0) return null;

  const preference = results[0];
  await ctx.database.write(async () => {
    await preference.update((pref) => {
      if (opts.model !== undefined) {
        pref._setRaw("model", opts.model || null);
      }
    });
  });

  return modelPreferenceToStored(preference);
}

/**
 * Create or update model preference (upsert)
 */
export async function setModelPreferenceOp(
  ctx: SettingsStorageOperationsContext,
  walletAddress: string,
  model?: string
): Promise<StoredModelPreference> {
  const existing = await getModelPreferenceOp(ctx, walletAddress);

  if (existing) {
    const updated = await updateModelPreferenceOp(ctx, walletAddress, {
      model,
    });
    return updated!;
  }

  return await createModelPreferenceOp(ctx, { walletAddress, model });
}

/**
 * Delete model preference
 * @returns true if deleted, false if not found
 */
export async function deleteModelPreferenceOp(
  ctx: SettingsStorageOperationsContext,
  walletAddress: string
): Promise<boolean> {
  const results = await ctx.modelPreferencesCollection
    .query(Q.where("wallet_address", walletAddress))
    .fetch();

  if (results.length === 0) return false;

  await ctx.database.write(async () => {
    await results[0].destroyPermanently();
  });

  return true;
}

/**
 * Get all model preferences
 */
export async function getAllModelPreferencesOp(
  ctx: SettingsStorageOperationsContext
): Promise<StoredModelPreference[]> {
  const results = await ctx.modelPreferencesCollection.query().fetch();
  return results.map(modelPreferenceToStored);
}
