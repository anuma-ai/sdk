# MediaFilterOptions

Defined in: [src/lib/db/media/types.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#140)

Filter options for querying media.

## Properties

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/db/media/types.ts:148](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#148)

Filter by conversation

***

### includeDeleted?

> `optional` **includeDeleted**: `boolean`

Defined in: [src/lib/db/media/types.ts:152](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#152)

Include soft-deleted records

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/db/media/types.ts:154](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#154)

Limit number of results

***

### mediaType?

> `optional` **mediaType**: [`MediaType`](../type-aliases/MediaType.md)

Defined in: [src/lib/db/media/types.ts:144](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#144)

Filter by media type

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/media/types.ts:150](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#150)

Filter by AI model

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/lib/db/media/types.ts:156](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#156)

Offset for pagination

***

### role?

> `optional` **role**: [`MediaRole`](../type-aliases/MediaRole.md)

Defined in: [src/lib/db/media/types.ts:146](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#146)

Filter by role (user uploads vs AI generated)

***

### walletAddress

> **walletAddress**: `string`

Defined in: [src/lib/db/media/types.ts:142](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#142)

Filter by wallet address (required for multi-user)
