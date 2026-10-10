# MemorySubscribeOptions

Defined in: [src/lib/memory/store/types.ts:136](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#136)

## Properties

### embeddings?

> `optional` **embeddings**: `boolean`

Defined in: [src/lib/memory/store/types.ts:152](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#152)

Also fire for embedding vector/model changes. Default `false`.
Ignored when `includeDeleted` is `true`, which remains membership-only.

***

### includeDeleted?

> `optional` **includeDeleted**: `boolean`

Defined in: [src/lib/memory/store/types.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#145)

Watch the whole table, soft-deleted rows included, and fire on row-SET
changes only (create / delete / undelete) — the Memory Graph's mode. A
column-aware watch would re-fire on every row a decay sweep archives.
Default `false`: watch live rows for user-visible edits and list membership
changes. Background embedding, proof and watermark bookkeeping does not
trigger default notifications.

***

### topics?

> `optional` **topics**: `boolean`

Defined in: [src/lib/memory/store/types.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#147)

Also fire when topic (entity / link) state changes. Default `false`.
