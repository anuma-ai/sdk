import { tableSchema } from "@nozbe/watermelondb";

export const memoryVaultStorageSchema = tableSchema({
  name: "memory_vault",
  columns: [
    { name: "content", type: "string" },
    { name: "created_at", type: "number", isIndexed: true },
    { name: "updated_at", type: "number" },
    { name: "is_deleted", type: "boolean", isIndexed: true },
  ],
});
