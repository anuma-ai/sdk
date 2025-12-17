import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const settingsStorageSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "modelPreferences",
      columns: [
        { name: "wallet_address", type: "string", isIndexed: true },
        { name: "models", type: "string", isOptional: true },
      ],
    }),
  ],
});
