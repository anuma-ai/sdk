# EntityOperationsContext

Defined in: [src/lib/db/entities/operations.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#18)

## Properties

### allowUnscopedRows?

> `optional` **allowUnscopedRows**: `boolean`

Defined in: [src/lib/db/entities/operations.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#36)

When `true`, `getMemoriesByEntityNamesOp` admits rows with
`user_id = null` alongside the strict `userId` match. Set this on
LokiJS (web) adapters where the v31 `unsafeExecuteSql` backfill
is a no-op — pre-v31 rows otherwise become invisible to the W5
lane until `backfillMemoryEntityUserIdsOp` runs. Default `false`
(server / SQLite, where the migration backfill is authoritative).

***

### database

> **database**: `Database`

Defined in: [src/lib/db/entities/operations.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#19)

***

### entityCollection

> **entityCollection**: `Collection`<[`EntityModel`](../classes/EntityModel.md)>

Defined in: [src/lib/db/entities/operations.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#20)

***

### memoryEntityCollection

> **memoryEntityCollection**: `Collection`<[`MemoryEntityModel`](../classes/MemoryEntityModel.md)>

Defined in: [src/lib/db/entities/operations.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#21)

***

### singleTenant?

> `optional` **singleTenant**: `boolean`

Defined in: [src/lib/db/entities/operations.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#54)

Declares that this process holds exactly ONE tenant's entity table — a
per-wallet client database, not a shared multi-user server.

Read by `loadEntityVocabulary`, which enumerates the whole `entity` table
to build its recall-time index. That table is global vocabulary with no
owner (listEntityNamesOp), so enumerating it is only acceptable
when there is nobody else in it.

This is deliberately NOT inferred from [userId](#userid). `userId` answers "is
this read user-scoped" — the React client sets it to the connected wallet
to scope legacy `memory_entity` rows on a database that is nevertheless
physically single-tenant — so inferring tenancy from it is wrong in both
directions. Mirrors `VaultMemoryOperationsContext.singleTenant`, which
exists so the decay sweep's scope guard stops inferring safety from
`walletAddress`. Default (absent) is the safe answer: no enumeration.

***

### userId?

> `optional` **userId**: `string`

Defined in: [src/lib/db/entities/operations.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#27)

Optional user-scope. When provided, `linkMemoryEntitiesOp` stamps
`user_id` on new memory\_entity rows and `getMemoriesByEntityNamesOp`
filters lookups by it. Leave undefined for single-user clients.
