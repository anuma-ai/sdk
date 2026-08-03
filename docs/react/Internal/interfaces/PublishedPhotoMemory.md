# PublishedPhotoMemory

Defined in: [src/lib/db/memoryVault/photoIngest.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/photoIngest.ts#56)

One row of `GET /api/memories/published`, narrowed to what ingest needs.

Deliberately structural rather than an import from the transport client: this
op is in the SDK and the two hand-written nearby clients live in the app, so
a shared nominal type would drag one across a package boundary for no gain.

## Properties

### eventTime?

> `optional` **eventTime**: { `end`: `number` | `null`; `kind`: `"point"` | `"range"` | `"ongoing"` | `null`; `start`: `number` | `null`; } | `null`

Defined in: [src/lib/db/memoryVault/photoIngest.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/photoIngest.ts#64)

When the event in the memory happened, if the server knows.

***

### media?

> `optional` **media**: [`PhotoMediaRef`](PhotoMediaRef.md)\[] | `null`

Defined in: [src/lib/db/memoryVault/photoIngest.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/photoIngest.ts#62)

The photo(s) this fact was read out of.

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/db/memoryVault/photoIngest.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/photoIngest.ts#58)

The server-minted memory id. `photo:<feedItemID>:fact:NN` or `:caption`.

***

### text

> **text**: `string`

Defined in: [src/lib/db/memoryVault/photoIngest.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/photoIngest.ts#60)

The projected fact text.

***

### userAuthored?

> `optional` **userAuthored**: `boolean`

Defined in: [src/lib/db/memoryVault/photoIngest.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/photoIngest.ts#70)

True when the text is the user's own words (a kept caption).
