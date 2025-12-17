import { Q } from "@nozbe/watermelondb";
import type { Database, Collection } from "@nozbe/watermelondb";

import { ModelPreference } from "./models";
import type {
  StoredModelPreference,
  CreateModelPreferenceOptions,
  UpdateModelPreferenceOptions,
} from "./types";

export function modelPreferenceToStored(
  preference: ModelPreference
): StoredModelPreference {
  return {
    uniqueId: preference.id,
    walletAddress: preference.walletAddress,
    models: preference.models,
  };
}

export interface SettingsStorageOperationsContext {
  database: Database;
  modelPreferencesCollection: Collection<ModelPreference>;
}

export async function getModelPreferenceOp(
  ctx: SettingsStorageOperationsContext,
  walletAddress: string
): Promise<StoredModelPreference | null> {
  const results = await ctx.modelPreferencesCollection
    .query(Q.where("wallet_address", walletAddress))
    .fetch();

  return results.length > 0 ? modelPreferenceToStored(results[0]) : null;
}

export async function createModelPreferenceOp(
  ctx: SettingsStorageOperationsContext,
  opts: CreateModelPreferenceOptions
): Promise<StoredModelPreference> {
  const created = await ctx.database.write(async () => {
    return await ctx.modelPreferencesCollection.create((pref) => {
      pref._setRaw("wallet_address", opts.walletAddress);
      if (opts.models) pref._setRaw("models", opts.models);
    });
  });

  return modelPreferenceToStored(created);
}

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
      if (opts.models !== undefined) {
        pref._setRaw("models", opts.models || null);
      }
    });
  });

  return modelPreferenceToStored(preference);
}

export async function setModelPreferenceOp(
  ctx: SettingsStorageOperationsContext,
  walletAddress: string,
  models?: string
): Promise<StoredModelPreference> {
  const result = await ctx.database.write(async () => {
    const results = await ctx.modelPreferencesCollection
      .query(Q.where("wallet_address", walletAddress))
      .fetch();

    if (results.length > 0) {
      const preference = results[0];
      await preference.update((pref) => {
        if (models !== undefined) {
          pref._setRaw("models", models || null);
        }
      });
      return preference;
    }

    return await ctx.modelPreferencesCollection.create((pref) => {
      pref._setRaw("wallet_address", walletAddress);
      if (models) pref._setRaw("models", models);
    });
  });

  return modelPreferenceToStored(result);
}

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

export async function getAllModelPreferencesOp(
  ctx: SettingsStorageOperationsContext
): Promise<StoredModelPreference[]> {
  const results = await ctx.modelPreferencesCollection.query().fetch();
  return results.map(modelPreferenceToStored);
}
