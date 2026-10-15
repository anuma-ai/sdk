# MemoryMigrationResult

Defined in: [src/lib/memory/store/remoteMigration.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#130)

## Properties

### imported

> **imported**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#133)

***

### placeholderTombstones

> **placeholderTombstones**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#140)

Deleted rows no supplied key decrypts, uploaded with placeholder content.

***

### reembedded

> **reembedded**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:136](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#136)

Rows uploaded with a vector embedded during migration.

***

### skipped

> **skipped**: [`MemoryMigrationSkip`](MemoryMigrationSkip.md)\[]

Defined in: [src/lib/memory/store/remoteMigration.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#134)

***

### state

> **state**: `"active"` | `"migrating"`

Defined in: [src/lib/memory/store/remoteMigration.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#131)

***

### total

> **total**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#132)

***

### truncatedSourceChunkIds

> **truncatedSourceChunkIds**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:142](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#142)

Rows whose oldest source ids were dropped to fit nearby's limit.

***

### unembedded

> **unembedded**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:138](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#138)

Rows uploaded without a vector nearby can rank.
