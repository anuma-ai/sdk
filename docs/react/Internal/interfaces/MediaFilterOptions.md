# MediaFilterOptions

Defined in: [src/lib/db/media/types.ts:150](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/types.ts#L150)

Filter options for querying media.

## Properties

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/db/media/types.ts:158](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/types.ts#L158)

Filter by conversation

***

### includeDeleted?

> `optional` **includeDeleted**: `boolean`

Defined in: [src/lib/db/media/types.ts:162](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/types.ts#L162)

Include soft-deleted records

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/db/media/types.ts:164](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/types.ts#L164)

Limit number of results

***

### mediaType?

> `optional` **mediaType**: [`MediaType`](../type-aliases/MediaType.md)

Defined in: [src/lib/db/media/types.ts:154](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/types.ts#L154)

Filter by media type

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/media/types.ts:160](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/types.ts#L160)

Filter by AI model

***

### offset?

> `optional` **offset**: `number`

Defined in: [src/lib/db/media/types.ts:166](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/types.ts#L166)

Offset for pagination

***

### role?

> `optional` **role**: [`MediaRole`](../type-aliases/MediaRole.md)

Defined in: [src/lib/db/media/types.ts:156](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/types.ts#L156)

Filter by role (user uploads vs AI generated)

***

### walletAddress

> **walletAddress**: `string`

Defined in: [src/lib/db/media/types.ts:152](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/types.ts#L152)

Filter by wallet address (required for multi-user)
