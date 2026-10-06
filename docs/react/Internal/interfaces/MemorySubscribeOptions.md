# MemorySubscribeOptions

Defined in: [src/lib/memory/store/types.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#90)

## Properties

### includeDeleted?

> `optional` **includeDeleted**: `boolean`

Defined in: [src/lib/memory/store/types.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#99)

Watch the whole table, soft-deleted rows included, and fire on row-SET
changes only (create / delete / undelete) — the Memory Graph's mode. A
column-aware watch would re-fire on every row a decay sweep archives.
Default `false`: watch live rows and all their persisted columns, including
content, embeddings and supersession. Reads return snapshots, so callers
must be notified when an in-place edit changes their data or list membership.

***

### topics?

> `optional` **topics**: `boolean`

Defined in: [src/lib/memory/store/types.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#101)

Also fire when topic (entity / link) state changes. Default `false`.
