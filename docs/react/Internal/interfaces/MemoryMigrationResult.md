# MemoryMigrationResult

Defined in: [src/lib/memory/store/remoteMigration.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#133)

## Properties

### imported

> **imported**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:136](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#136)

***

### placeholderTombstones

> **placeholderTombstones**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:143](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#143)

Deleted rows no supplied key decrypts, uploaded with placeholder content.

***

### reembedded

> **reembedded**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#139)

Rows uploaded with a vector embedded during migration.

***

### skipped

> **skipped**: [`MemoryMigrationSkip`](MemoryMigrationSkip.md)\[]

Defined in: [src/lib/memory/store/remoteMigration.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#137)

***

### state

> **state**: `"active"` | `"migrating"`

Defined in: [src/lib/memory/store/remoteMigration.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#134)

***

### total

> **total**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:135](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#135)

***

### truncatedSourceChunkIds

> **truncatedSourceChunkIds**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#145)

Rows whose oldest source ids were dropped to fit nearby's limit.

***

### unembedded

> **unembedded**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#141)

Rows uploaded without a vector nearby can rank.
