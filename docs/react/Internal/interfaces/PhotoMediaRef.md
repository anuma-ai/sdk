# PhotoMediaRef

Defined in: [src/lib/db/memoryVault/types.ts:135](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#135)

A photo a server-extracted memory came from, as
GET /api/memories/published returns it in `media[]`.

Both identifiers travel because both are needed: `feedItemId` is the server's
handle for the photo, and `objectKey` is what a client turns into a CDN URL
without another round-trip per memory.

## Properties

### feedItemId

> **feedItemId**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:136](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#136)

***

### objectKey

> **objectKey**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#137)
