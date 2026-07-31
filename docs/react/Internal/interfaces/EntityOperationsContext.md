# EntityOperationsContext

Defined in: [src/lib/db/entities/operations.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#26)

## Properties

### allowUnscopedRows?

> `optional` **allowUnscopedRows**: `boolean`

Defined in: [src/lib/db/entities/operations.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#44)

When `true`, `getMemoriesByEntityNamesOp` admits rows with
`user_id = null` alongside the strict `userId` match. Set this on
LokiJS (web) adapters where the v31 `unsafeExecuteSql` backfill
is a no-op — pre-v31 rows otherwise become invisible to the W5
lane until `backfillMemoryEntityUserIdsOp` runs. Default `false`
(server / SQLite, where the migration backfill is authoritative).

***

### database

> **database**: `Database`

Defined in: [src/lib/db/entities/operations.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#27)

***

### entityCollection

> **entityCollection**: `Collection`<[`EntityModel`](../classes/EntityModel.md)>

Defined in: [src/lib/db/entities/operations.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#28)

***

### memoryEntityCollection

> **memoryEntityCollection**: `Collection`<[`MemoryEntityModel`](../classes/MemoryEntityModel.md)>

Defined in: [src/lib/db/entities/operations.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#29)

***

### userId?

> `optional` **userId**: `string`

Defined in: [src/lib/db/entities/operations.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#35)

Optional user-scope. When provided, `linkMemoryEntitiesOp` stamps
`user_id` on new memory\_entity rows and `getMemoriesByEntityNamesOp`
filters lookups by it. Leave undefined for single-user clients.
