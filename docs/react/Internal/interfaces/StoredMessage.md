# StoredMessage

Defined in: [src/lib/db/chat/types.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#110)

## Extended by

* [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### chunks?

> `optional` **chunks**: [`MessageChunk`](MessageChunk.md)\[]

Defined in: [src/lib/db/chat/types.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#128)

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

Defined in: [src/lib/db/chat/types.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#123)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#126)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#134)

If set, indicates the message failed with this error

***

### feedback?

> `optional` **feedback**: [`MessageFeedback`](../type-aliases/MessageFeedback.md)

Defined in: [src/lib/db/chat/types.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#141)

User feedback: 'like', 'dislike', or null for no feedback

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:122](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#122)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:120](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#120)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#118)

Image generation model used for this message (e.g., "nano-banana-flash")

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

Defined in: [src/lib/db/chat/types.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#139)

Parent message ID for branching (edit/regenerate). Null for root messages.

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#131)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#114)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#130)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#137)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:135](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#135)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#111)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#124)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#129)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#125)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#132)
