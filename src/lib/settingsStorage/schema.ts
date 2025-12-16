import { appSchema, tableSchema } from "@nozbe/watermelondb";

/**
 * WatermelonDB schema for settings storage
 *
 * Defines two tables:
 * - modelPreferences: Model preferences metadata
 */
export const settingsStorageSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "modelPreferences",
      columns: [
        { name: "wallet_address", type: "string", isIndexed: true },
        { name: "model", type: "string", isOptional: true }, // stored as JSON stringified ModelPreference[]
      ],
    }),
  ],
});
