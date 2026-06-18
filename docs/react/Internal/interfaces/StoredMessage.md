# StoredMessage

Defined in: [src/lib/db/chat/types.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#126)

## Extended by

* [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### chunks?

> `optional` **chunks**: [`MessageChunk`](MessageChunk.md)\[]

Defined in: [src/lib/db/chat/types.ts:144](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#144)

Chunks of this message with individual embeddings for fine-grained search

***

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#131)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#129)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#139)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:142](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#142)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:150](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#150)

If set, indicates the message failed with this error

***

### feedback?

> `optional` **feedback**: [`MessageFeedback`](../type-aliases/MessageFeedback.md)

Defined in: [src/lib/db/chat/types.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#157)

User feedback: 'like', 'dislike', or null for no feedback

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:138](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#138)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:136](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#136)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#134)

Image generation model used for this message (e.g., "nano-banana-flash")

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#128)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#132)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#155)

Parent message ID for branching (edit/regenerate). Null for root messages.

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#147)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#130)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:146](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#146)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:153](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#153)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#151)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#159)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#127)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#140)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#145)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#141)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:148](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#148)
