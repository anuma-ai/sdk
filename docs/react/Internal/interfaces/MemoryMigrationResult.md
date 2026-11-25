# MemoryMigrationResult

Defined in: [src/lib/memory/store/remoteMigration.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#149)

## Properties

### imported

> **imported**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:152](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#152)

***

### placeholderTombstones

> **placeholderTombstones**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#159)

Deleted rows no supplied key decrypts, uploaded with placeholder content.

***

### reembedded

> **reembedded**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#155)

Rows uploaded with a vector embedded during migration.

***

### skipped

> **skipped**: [`MemoryMigrationSkip`](MemoryMigrationSkip.md)\[]

Defined in: [src/lib/memory/store/remoteMigration.ts:153](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#153)

***

### state

> **state**: `"migrating"` | `"active"`

Defined in: [src/lib/memory/store/remoteMigration.ts:150](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#150)

***

### total

> **total**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#151)

***

### truncatedSourceChunkIds

> **truncatedSourceChunkIds**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#161)

Rows whose oldest source ids were dropped to fit nearby's limit.

***

### unembedded

> **unembedded**: `number`

Defined in: [src/lib/memory/store/remoteMigration.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#157)

Rows uploaded without a vector nearby can rank.
