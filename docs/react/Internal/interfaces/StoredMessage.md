# StoredMessage

Defined in: [src/lib/db/chat/types.ts:87](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L87)

## Extended by

* [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### chunks?

> `optional` **chunks**: [`MessageChunk`](MessageChunk.md)\[]

Defined in: [src/lib/db/chat/types.ts:103](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L103)

Chunks of this message with individual embeddings for fine-grained search

***

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:92](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L92)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:90](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L90)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:98](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L98)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:101](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L101)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:109](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L109)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:97](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L97)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:95](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L95)

**Deprecated**

Use fileIds with media table instead

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:89](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L89)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:93](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L93)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:114](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L114)

Parent message ID for branching (edit/regenerate). Null for root messages.

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:106](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L106)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:91](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L91)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:105](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L105)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:112](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L112)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:110](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L110)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L88)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:99](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L99)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:104](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L104)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:100](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L100)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:107](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L107)
