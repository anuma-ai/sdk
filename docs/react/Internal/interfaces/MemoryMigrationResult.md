# MemoryMigrationResult

Defined in: [src/lib/memory/store/remoteMigration.ts:146](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#146)

## Properties

### imported

> **imported**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#149)

***

### placeholderTombstones

> **placeholderTombstones**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:156](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#156)

Deleted rows no supplied key decrypts, uploaded with placeholder content.

***

### reembedded

> **reembedded**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:152](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#152)

Rows uploaded with a vector embedded during migration.

***

### skipped

> **skipped**: [`MemoryMigrationSkip`](MemoryMigrationSkip.md)\[]

Defined in: [src/lib/memory/store/remoteMigration.ts:150](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#150)

***

### state

> **state**: `"active"` | `"migrating"`

Defined in: [src/lib/memory/store/remoteMigration.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#147)

***

### total

> **total**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:148](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#148)

***

### truncatedSourceChunkIds

> **truncatedSourceChunkIds**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:158](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#158)

Rows whose oldest source ids were dropped to fit nearby's limit.

***

### unembedded

> **unembedded**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:154](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#154)

Rows uploaded without a vector nearby can rank.
