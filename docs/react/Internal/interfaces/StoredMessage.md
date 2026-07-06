# StoredMessage

Defined in: [src/lib/db/chat/types.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#164)

## Extended by

* [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### chunks?

> `optional` **chunks**: [`MessageChunk`](MessageChunk.md)\[]

Defined in: [src/lib/db/chat/types.ts:182](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#182)

Chunks of this message with individual embeddings for fine-grained search

***

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#169)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#167)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:177](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#177)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:180](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#180)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:188](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#188)

If set, indicates the message failed with this error

***

### feedback?

> `optional` **feedback**: [`MessageFeedback`](../type-aliases/MessageFeedback.md)

Defined in: [src/lib/db/chat/types.ts:195](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#195)

User feedback: 'like', 'dislike', or null for no feedback

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#176)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#174)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#172)

Image generation model used for this message (e.g., "nano-banana-flash")

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#166)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#170)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:193](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#193)

Parent message ID for branching (edit/regenerate). Null for root messages.

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:185](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#185)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#168)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:184](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#184)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:191](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#191)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:189](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#189)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:197](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#197)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:165](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#165)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#178)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#183)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:179](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#179)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:186](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#186)
