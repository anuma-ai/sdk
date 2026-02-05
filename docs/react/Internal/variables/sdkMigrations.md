# sdkMigrations

> `const` **sdkMigrations**: `Readonly`<{ `maxVersion`: `number`; `minVersion`: `number`; `sortedMigrations`: `Readonly`<{ `steps`: `MigrationStep`\[]; `toVersion`: `number`; }>\[]; `validated`: `true`; }>

Defined in: [src/lib/db/schema.ts:217](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/schema.ts#L217)

Combined migrations for all SDK storage modules.

These migrations handle database schema upgrades from any previous version
to the current version. The SDK manages all migration logic internally,
so consumer apps don't need to handle version arithmetic or migration merging.

**Minimum supported version: v2**
Migrations from v1 are not supported. Databases at v1 require a fresh install.

Migration history:

* v2 → v3: Added `was_stopped` column to history table
* v3 → v4: Added `modelPreferences` table for settings storage
* v4 → v5: Added `error` column to history table for error persistence
* v5 → v6: Added `thought_process` column to history table for activity tracking
* v6 → v7: Added `userPreferences` table for unified user settings storage
* v7 → v8: BREAKING - Clear all data (embedding model change)
* v8 → v9: Added `thinking` column to history table for reasoning/thinking content
* v9 → v10: Added `projects` table and `project_id` column to conversations
* v10 → v11: Added `media` table for library feature, added `file_ids` column to history
* v11 → v12: Added `chunks` column to history table for sub-message semantic search
