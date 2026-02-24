# StoredMessage

Defined in: [src/lib/db/chat/types.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#110)

## Extended by

* [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### chunks?

> `optional` **chunks**: [`MessageChunk`](MessageChunk.md)\[]

Defined in: [src/lib/db/chat/types.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#126)

Chunks of this message with individual embeddings for fine-grained search

***

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#115)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#113)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#121)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#124)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#132)

If set, indicates the message failed with this error

***

### feedback?

> `optional` **feedback**: [`MessageFeedback`](../type-aliases/MessageFeedback.md)

Defined in: [src/lib/db/chat/types.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#139)

User feedback: 'like', 'dislike', or null for no feedback

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:120](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#120)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#118)

**Deprecated**

Use fileIds with media table instead

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#112)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#116)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#137)

Parent message ID for branching (edit/regenerate). Null for root messages.

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#129)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#114)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#128)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:135](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#135)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#133)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#111)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:122](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#122)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#127)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#123)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#130)
