import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import { ModelPreference } from "../settings/models";
import { UserPreference } from "./models";
import type {
  CreateUserPreferenceOptions,
  PersonalitySettings,
  ProfileUpdate,
  StoredUserPreference,
  UpdateUserPreferenceOptions,
} from "./types";

/**
 * Convert a UserPreference model to a StoredUserPreference object
 */
function userPreferenceToStored(preference: UserPreference): StoredUserPreference {
  return {
    uniqueId: preference.id,
    walletAddress: preference.walletAddress,
    nickname: preference.nickname,
    occupation: preference.occupation,
    description: preference.description,
    models: preference.models,
    personality: preference.personality,
    createdAt: preference.createdAt,
    updatedAt: preference.updatedAt,
  };
}

/**
 * Context for user preferences storage operations
 */
export interface UserPreferencesStorageOperationsContext {
  database: Database;
  userPreferencesCollection: Collection<UserPreference>;
  modelPreferencesCollection?: Collection<ModelPreference>;
}

/**
 * Get user preference by wallet address
 */
export async function getUserPreferenceOp(
  ctx: UserPreferencesStorageOperationsContext,
  walletAddress: string
): Promise<StoredUserPreference | null> {
  const results = await ctx.userPreferencesCollection
    .query(Q.where("wallet_address", walletAddress))
    .fetch();

  return results.length > 0 ? userPreferenceToStored(results[0]) : null;
}

/**
 * Create a new user preference record
 */
async function createUserPreferenceOp(
  ctx: UserPreferencesStorageOperationsContext,
  opts: CreateUserPreferenceOptions
): Promise<StoredUserPreference> {
  const now = Date.now();

  const created = await ctx.database.write(async () => {
    return await ctx.userPreferencesCollection.create((pref) => {
      pref._setRaw("wallet_address", opts.walletAddress);
      if (opts.nickname) pref._setRaw("nickname", opts.nickname);
      if (opts.occupation) pref._setRaw("occupation", opts.occupation);
      if (opts.description) pref._setRaw("description", opts.description);
      if (opts.models) pref._setRaw("models", opts.models);
      if (opts.personality) pref._setRaw("personality", opts.personality);
      pref._setRaw("created_at", now);
      pref._setRaw("updated_at", now);
    });
  });

  return userPreferenceToStored(created);
}

/**
 * Update an existing user preference record
 */
async function updateUserPreferenceOp(
  ctx: UserPreferencesStorageOperationsContext,
  walletAddress: string,
  opts: UpdateUserPreferenceOptions
): Promise<StoredUserPreference | null> {
  const results = await ctx.userPreferencesCollection
    .query(Q.where("wallet_address", walletAddress))
    .fetch();

  if (results.length === 0) return null;

  const preference = results[0];
  await ctx.database.write(async () => {
    await preference.update((pref) => {
      if (opts.nickname !== undefined) {
        pref._setRaw("nickname", opts.nickname || null);
      }
      if (opts.occupation !== undefined) {
        pref._setRaw("occupation", opts.occupation || null);
      }
      if (opts.description !== undefined) {
        pref._setRaw("description", opts.description || null);
      }
      if (opts.models !== undefined) {
        pref._setRaw("models", opts.models || null);
      }
      if (opts.personality !== undefined) {
        pref._setRaw("personality", opts.personality || null);
      }
      pref._setRaw("updated_at", Date.now());
    });
  });

  return userPreferenceToStored(preference);
}

/**
 * Set (create or update) user preference - upsert operation
 */
export async function setUserPreferenceOp(
  ctx: UserPreferencesStorageOperationsContext,
  walletAddress: string,
  opts: UpdateUserPreferenceOptions
): Promise<StoredUserPreference> {
  const now = Date.now();

  const result = await ctx.database.write(async () => {
    const results = await ctx.userPreferencesCollection
      .query(Q.where("wallet_address", walletAddress))
      .fetch();

    if (results.length > 0) {
      const preference = results[0];
      await preference.update((pref) => {
        if (opts.nickname !== undefined) {
          pref._setRaw("nickname", opts.nickname || null);
        }
        if (opts.occupation !== undefined) {
          pref._setRaw("occupation", opts.occupation || null);
        }
        if (opts.description !== undefined) {
          pref._setRaw("description", opts.description || null);
        }
        if (opts.models !== undefined) {
          pref._setRaw("models", opts.models || null);
        }
        if (opts.personality !== undefined) {
          pref._setRaw("personality", opts.personality || null);
        }
        pref._setRaw("updated_at", now);
      });
      return preference;
    }

    return await ctx.userPreferencesCollection.create((pref) => {
      pref._setRaw("wallet_address", walletAddress);
      if (opts.nickname) pref._setRaw("nickname", opts.nickname);
      if (opts.occupation) pref._setRaw("occupation", opts.occupation);
      if (opts.description) pref._setRaw("description", opts.description);
      if (opts.models) pref._setRaw("models", opts.models);
      if (opts.personality) pref._setRaw("personality", opts.personality);
      pref._setRaw("created_at", now);
      pref._setRaw("updated_at", now);
    });
  });

  return userPreferenceToStored(result);
}

/**
 * Update only profile fields
 */
export async function updateProfileOp(
  ctx: UserPreferencesStorageOperationsContext,
  walletAddress: string,
  profile: ProfileUpdate
): Promise<StoredUserPreference | null> {
  return updateUserPreferenceOp(ctx, walletAddress, profile);
}

/**
 * Update only personality settings
 */
export async function updatePersonalityOp(
  ctx: UserPreferencesStorageOperationsContext,
  walletAddress: string,
  personality: PersonalitySettings
): Promise<StoredUserPreference | null> {
  return updateUserPreferenceOp(ctx, walletAddress, {
    personality: JSON.stringify(personality),
  });
}

/**
 * Update only model preferences
 */
export async function updateModelsOp(
  ctx: UserPreferencesStorageOperationsContext,
  walletAddress: string,
  models: string
): Promise<StoredUserPreference | null> {
  return updateUserPreferenceOp(ctx, walletAddress, { models });
}

/**
 * Delete user preference record
 */
export async function deleteUserPreferenceOp(
  ctx: UserPreferencesStorageOperationsContext,
  walletAddress: string
): Promise<boolean> {
  const results = await ctx.userPreferencesCollection
    .query(Q.where("wallet_address", walletAddress))
    .fetch();

  if (results.length === 0) return false;

  await ctx.database.write(async () => {
    await results[0].destroyPermanently();
  });

  return true;
}

// ===== Migration Helpers =====

/**
 * Old personality settings format (from memoryless app)
 * Used for migration from modelPreferences table
 */
interface OldPersonalitySettings {
  sliders?: {
    emojis?: number;
    depth?: number;
    strictness?: number;
    verbosity?: number;
  };
  style?: string;
  customInstructions?: string;
  nickname?: string;
  occupation?: string;
  aboutYou?: string;
}

/**
 * Migrate data from old modelPreferences format to new userPreferences
 *
 * This function checks for existing data in the modelPreferences table
 * and migrates it to the new userPreferences table. It handles:
 * - Model preferences stored at key = walletAddress
 * - Personality settings stored at key = `${walletAddress}_personality_settings`
 *
 * Profile fields (nickname, occupation, description) are extracted from
 * the personality settings JSON and stored as top-level columns.
 */
export async function migrateFromModelPreferencesOp(
  ctx: UserPreferencesStorageOperationsContext,
  walletAddress: string
): Promise<StoredUserPreference | null> {
  if (!ctx.modelPreferencesCollection) {
    return null;
  }

  // Check if already migrated
  const existing = await getUserPreferenceOp(ctx, walletAddress);
  if (existing) {
    return existing;
  }

  // Fetch old model preferences (stored with walletAddress as key)
  const modelResults = await ctx.modelPreferencesCollection
    .query(Q.where("wallet_address", walletAddress))
    .fetch();

  // Fetch old personality settings (stored with walletAddress_personality_settings as key)
  const personalityKey = `${walletAddress}_personality_settings`;
  const personalityResults = await ctx.modelPreferencesCollection
    .query(Q.where("wallet_address", personalityKey))
    .fetch();

  // If neither exists, nothing to migrate
  if (modelResults.length === 0 && personalityResults.length === 0) {
    return null;
  }

  // Extract data
  const oldModels = modelResults.length > 0 ? modelResults[0].models : undefined;
  const oldPersonalityJson =
    personalityResults.length > 0 ? personalityResults[0].models : undefined;

  let nickname: string | undefined;
  let occupation: string | undefined;
  let description: string | undefined;
  let personality: string | undefined;

  if (oldPersonalityJson) {
    try {
      const parsed = JSON.parse(oldPersonalityJson) as OldPersonalitySettings;

      // Extract profile fields
      nickname = parsed.nickname;
      occupation = parsed.occupation;
      description = parsed.aboutYou; // Note: old field was called "aboutYou"

      // Create new personality settings without profile fields
      const newPersonality: PersonalitySettings = {
        sliders: {
          emojis: parsed.sliders?.emojis ?? 3,
          depth: parsed.sliders?.depth ?? 3,
          strictness: parsed.sliders?.strictness ?? 3,
          verbosity: parsed.sliders?.verbosity ?? 3,
        },
        style: (parsed.style as PersonalitySettings["style"]) ?? "default",
        customInstructions: parsed.customInstructions ?? "",
      };
      personality = JSON.stringify(newPersonality);
    } catch {
      // Invalid JSON, skip personality migration
    }
  }

  // Create new user preference record with migrated data
  const created = await createUserPreferenceOp(ctx, {
    walletAddress,
    nickname,
    occupation,
    description,
    models: oldModels,
    personality,
  });

  return created;
}
