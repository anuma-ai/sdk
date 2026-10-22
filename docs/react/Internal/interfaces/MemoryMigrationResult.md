# MemoryMigrationResult

Defined in: [src/lib/memory/store/remoteMigration.ts:138](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#138)

## Properties

### imported

> **imported**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#141)

***

### placeholderTombstones

> **placeholderTombstones**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:148](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#148)

Deleted rows no supplied key decrypts, uploaded with placeholder content.

***

### reembedded

> **reembedded**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:144](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#144)

Rows uploaded with a vector embedded during migration.

***

### skipped

> **skipped**: [`MemoryMigrationSkip`](MemoryMigrationSkip.md)\[]

Defined in: [src/lib/memory/store/remoteMigration.ts:142](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#142)

***

### state

> **state**: `"active"` | `"migrating"`

Defined in: [src/lib/memory/store/remoteMigration.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#139)

***

### total

> **total**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#140)

***

### truncatedSourceChunkIds

> **truncatedSourceChunkIds**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:150](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#150)

Rows whose oldest source ids were dropped to fit nearby's limit.

***

### unembedded

> **unembedded**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:146](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#146)

Rows uploaded without a vector nearby can rank.
