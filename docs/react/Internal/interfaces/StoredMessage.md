# StoredMessage

Defined in: [src/lib/db/chat/types.ts:96](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L96)

## Extended by

* [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### chunks?

> `optional` **chunks**: [`MessageChunk`](MessageChunk.md)\[]

Defined in: [src/lib/db/chat/types.ts:112](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L112)

Chunks of this message with individual embeddings for fine-grained search

***

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:101](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L101)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:99](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L99)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:107](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L107)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:110](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L110)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:118](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L118)

If set, indicates the message failed with this error

***

### feedback?

> `optional` **feedback**: [`MessageFeedback`](../type-aliases/MessageFeedback.md)

Defined in: [src/lib/db/chat/types.ts:125](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L125)

User feedback: 'like', 'dislike', or null for no feedback

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:106](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L106)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:104](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L104)

**Deprecated**

Use fileIds with media table instead

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:98](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L98)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:102](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L102)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:123](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L123)

Parent message ID for branching (edit/regenerate). Null for root messages.

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:115](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L115)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:100](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L100)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:114](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L114)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:121](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L121)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:119](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L119)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:97](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L97)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:108](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L108)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:113](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L113)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:109](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L109)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:116](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L116)
