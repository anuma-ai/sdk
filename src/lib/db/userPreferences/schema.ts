import { appSchema, tableSchema } from "@nozbe/watermelondb";

/**
 * User preferences table schema definition.
 *
 * This schema is used internally by the SDK and merged into the main sdkSchema.
 * It stores unified user preferences including profile data, model preferences,
 * and personality settings.
 */
export const userPreferencesStorageSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "userPreferences",
      columns: [
        { name: "wallet_address", type: "string", isIndexed: true },

        { name: "nickname", type: "string", isOptional: true },
        { name: "occupation", type: "string", isOptional: true },
        { name: "description", type: "string", isOptional: true },

        { name: "models", type: "string", isOptional: true },

        { name: "personality", type: "string", isOptional: true },

        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
  ],
});
