# StoredMessage

Defined in: [src/lib/db/chat/types.ts:86](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L86)

## Extended by

* [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### chunks?

> `optional` **chunks**: [`MessageChunk`](MessageChunk.md)\[]

Defined in: [src/lib/db/chat/types.ts:102](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L102)

Chunks of this message with individual embeddings for fine-grained search

***

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:91](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L91)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:89](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L89)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:97](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L97)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:100](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L100)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:108](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L108)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:96](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L96)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:94](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L94)

**Deprecated**

Use fileIds with media table instead

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L88)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:92](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L92)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:105](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L105)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:90](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L90)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:104](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L104)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:111](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L111)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:109](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L109)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:87](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L87)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:98](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L98)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:103](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L103)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:99](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L99)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:106](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L106)
