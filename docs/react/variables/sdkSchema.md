# sdkSchema

> `const` **sdkSchema**: `Readonly`\<\{ `tables`: `TableMap`; `unsafeSql?`: (`_`: `string`, `__`: `AppSchemaUnsafeSqlKind`) => `string`; `version`: `number`; \}\>

Defined in: [src/lib/db/schema.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/schema.ts#L57)

Combined WatermelonDB schema for all SDK storage modules.

This unified schema includes all tables needed by the SDK:
- `history`: Chat message storage with embeddings and metadata
- `conversations`: Conversation metadata and organization
- `memories`: Persistent memory storage with semantic search
- `modelPreferences`: User model preferences (deprecated, use userPreferences)
- `userPreferences`: Unified user preferences (profile, personality, models)

## Example

```typescript
import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { sdkSchema, sdkMigrations, sdkModelClasses } from '@reverbia/sdk/react';

const adapter = new LokiJSAdapter({
  schema: sdkSchema,
  migrations: sdkMigrations,
  dbName: 'my-app-db',
  useWebWorker: false,
  useIncrementalIndexedDB: true,
});

const database = new Database({
  adapter,
  modelClasses: sdkModelClasses,
});
```
