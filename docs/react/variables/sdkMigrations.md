# sdkMigrations

> `const` **sdkMigrations**: `Readonly`\<\{ `maxVersion`: `number`; `minVersion`: `number`; `sortedMigrations`: `Readonly`\<\{ `steps`: `MigrationStep`[]; `toVersion`: `number`; \}\>[]; `validated`: `true`; \}\>

Defined in: [src/lib/db/schema.ts:130](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/schema.ts#L130)

Combined migrations for all SDK storage modules.

These migrations handle database schema upgrades from any previous version
to the current version. The SDK manages all migration logic internally,
so consumer apps don't need to handle version arithmetic or migration merging.

**Minimum supported version: v2**
Migrations from v1 are not supported. Databases at v1 require a fresh install.

Migration history:
- v2 → v3: Added `was_stopped` column to history table
- v3 → v4: Added `modelPreferences` table for settings storage
