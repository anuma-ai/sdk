# MemorySubscribeOptions

Defined in: [src/lib/memory/store/types.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#70)

## Properties

### includeDeleted?

> `optional` **includeDeleted**: `boolean`

Defined in: [src/lib/memory/store/types.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#79)

Watch the whole table, soft-deleted rows included, and fire on row-SET
changes only (create / delete / undelete) — the Memory Graph's mode. A
column-aware watch would re-fire on every row a decay sweep archives.
Default `false`: watch live rows, and also fire on in-place edits to the
columns that move a row in or out of the default list or change how it
renders (`archived_at`, `trust_tier`, `scope`, `visibility`).

***

### topics?

> `optional` **topics**: `boolean`

Defined in: [src/lib/memory/store/types.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#81)

Also fire when topic (entity / link) state changes. Default `false`.
