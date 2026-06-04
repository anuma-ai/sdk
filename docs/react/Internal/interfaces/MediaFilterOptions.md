# MediaFilterOptions

Defined in: [src/lib/db/media/types.ts:160](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#160)

Filter options for querying media.

## Properties

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/db/media/types.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#168)

Filter by conversation

***

### includeDeleted?

> `optional` **includeDeleted**: `boolean`

Defined in: [src/lib/db/media/types.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#172)

Include soft-deleted records

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/db/media/types.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#174)

Limit number of results

***

### mediaType?

> `optional` **mediaType**: [`MediaType`](../type-aliases/MediaType.md)

Defined in: [src/lib/db/media/types.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#164)

Filter by media type

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/media/types.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#170)

Filter by AI model

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/lib/db/media/types.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#176)

Offset for pagination

***

### role?

> `optional` **role**: [`MediaRole`](../type-aliases/MediaRole.md)

Defined in: [src/lib/db/media/types.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#166)

Filter by role (user uploads vs AI generated)

***

### walletAddress

> **walletAddress**: `string`

Defined in: [src/lib/db/media/types.ts:162](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#162)

Filter by wallet address (required for multi-user)
