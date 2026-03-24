import type { Database } from "@nozbe/watermelondb";

// ===== Personality Types (moved from memoryless) =====

/**
 * Slider settings for personality customization (1-5 range)
 */
export interface PersonalitySliders {
  /** 1 = no emojis, 5 = many emojis */
  emojis: number;
  /** 1 = high-level summary, 5 = deep-dive analysis */
  depth: number;
  /** 1 = evidence-only, 5 = speculative */
  strictness: number;
  /** 1 = concise, 5 = detailed */
  verbosity: number;
}

/**
 * Base communication style (mutually exclusive)
 */
export type PersonalityStyle =
  | "default"
  | "professional"
  | "friendly"
  | "candid"
  | "quirky"
  | "efficient"
  | "nerdy"
  | "cynical";

/**
 * Complete personality settings for AI communication style
 */
export interface PersonalitySettings {
  sliders: PersonalitySliders;
  style: PersonalityStyle;
  customInstructions: string;
}

/**
 * Default personality settings (all neutral/empty)
 */
export const DEFAULT_PERSONALITY_SETTINGS: PersonalitySettings = {
  sliders: {
    emojis: 3,
    depth: 3,
    strictness: 3,
    verbosity: 3,
  },
  style: "default",
  customInstructions: "",
};

/**
 * Slider configuration for UI rendering
 */
export const SLIDER_CONFIG: {
  key: keyof PersonalitySliders;
  label: string;
  leftLabel: string;
  rightLabel: string;
}[] = [
  {
    key: "emojis",
    label: "Emojis",
    leftLabel: "None",
    rightLabel: "Many",
  },
  {
    key: "depth",
    label: "Depth",
    leftLabel: "Summary",
    rightLabel: "Deep Dive",
  },
  {
    key: "strictness",
    label: "Strictness",
    leftLabel: "Evidence-Only",
    rightLabel: "Speculative",
  },
  {
    key: "verbosity",
    label: "Verbosity",
    leftLabel: "Concise",
    rightLabel: "Informative",
  },
];

// ===== User Preference Types =====

/**
 * Stored user preference record from the database
 */
export interface StoredUserPreference {
  uniqueId: string;
  walletAddress: string;
  // Profile fields (top-level columns)
  nickname?: string;
  occupation?: string;
  description?: string;
  // Settings (JSON strings)
  models?: string;
  personality?: string;
  // Timestamps
  createdAt: number;
  updatedAt: number;
}

/**
 * Options for creating a new user preference record
 */
export interface CreateUserPreferenceOptions {
  walletAddress: string;
  nickname?: string;
  occupation?: string;
  description?: string;
  models?: string;
  personality?: string;
}

/**
 * Options for updating an existing user preference record
 */
export interface UpdateUserPreferenceOptions {
  nickname?: string;
  occupation?: string;
  description?: string;
  models?: string;
  personality?: string;
}

/**
 * Profile-only update options
 */
export interface ProfileUpdate {
  nickname?: string;
  occupation?: string;
  description?: string;
}

// ===== Hook Types =====

/**
 * Base options for useSettings hook
 */
interface _BaseUseUserPreferencesOptions {
  database: Database;
  walletAddress?: string;
}

/**
 * Base result returned by useSettings hook
 */
interface _BaseUseUserPreferencesResult {
  userPreference: StoredUserPreference | null;
  isLoading: boolean;
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
