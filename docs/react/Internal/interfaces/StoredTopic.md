# StoredTopic

Defined in: [src/lib/db/entities/types.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/types.ts#62)

One entry in `memory_vault.topics` — the durable, synced record of a memory's
topics. `name` carries the CALLER's display casing, unlike
[StoredEntity.canonicalName](StoredEntity.md#canonicalname), which normalizeEntityName
lowercases and which has no display column: preserving casing here is the
point of storing names on the memory row.

## Properties

### kind?

> `optional` **kind**: `string`

Defined in: [src/lib/db/entities/types.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/types.ts#64)

***

### name

> **name**: `string`

Defined in: [src/lib/db/entities/types.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/types.ts#63)

***

### source

> **source**: [`TopicSource`](../type-aliases/TopicSource.md)

Defined in: [src/lib/db/entities/types.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/types.ts#65)
