# StoredMessageWithSimilarity

Defined in: [src/lib/db/chat/types.ts:258](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#258)

## Extends

* [`StoredMessage`](StoredMessage.md)

## Properties

### chunks?

> `optional` **chunks**: [`MessageChunk`](MessageChunk.md)\[]

Defined in: [src/lib/db/chat/types.ts:194](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#194)

Chunks of this message with individual embeddings for fine-grained search

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`chunks`](StoredMessage.md#chunks)

***

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:181](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#181)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`content`](StoredMessage.md#content)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:179](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#179)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`conversationId`](StoredMessage.md#conversationid)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:189](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#189)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`createdAt`](StoredMessage.md#createdat)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:192](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#192)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`embeddingModel`](StoredMessage.md#embeddingmodel)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:200](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#200)

If set, indicates the message failed with this error

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`error`](StoredMessage.md#error)

***

### feedback?

> `optional` **feedback**: [`MessageFeedback`](../type-aliases/MessageFeedback.md)

Defined in: [src/lib/db/chat/types.ts:207](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#207)

User feedback: 'like', 'dislike', or null for no feedback

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`feedback`](StoredMessage.md#feedback)

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:188](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#188)

Array of media\_id references for direct lookup in media table

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`fileIds`](StoredMessage.md#fileids)

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:186](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#186)

**Deprecated**

Use fileIds with media table instead

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`files`](StoredMessage.md#files)

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:184](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#184)

Image generation model used for this message (e.g., "nano-banana-flash")

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`imageModel`](StoredMessage.md#imagemodel)

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#178)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`messageId`](StoredMessage.md#messageid)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:182](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#182)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`model`](StoredMessage.md#model)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:205](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#205)

Parent message ID for branching (edit/regenerate). Null for root messages.

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`parentMessageId`](StoredMessage.md#parentmessageid)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:197](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#197)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`responseDuration`](StoredMessage.md#responseduration)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:180](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#180)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`role`](StoredMessage.md#role)

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:259](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#259)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:196](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#196)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`sources`](StoredMessage.md#sources)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:203](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#203)

Reasoning/thinking content from models that support extended thinking

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`thinking`](StoredMessage.md#thinking)

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:201](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#201)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`thoughtProcess`](StoredMessage.md#thoughtprocess)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:209](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#209)

Tool call events from the backend response (for reconstructing tool call history)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`toolCallEvents`](StoredMessage.md#toolcallevents)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:177](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#177)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`uniqueId`](StoredMessage.md#uniqueid)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:190](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#190)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`updatedAt`](StoredMessage.md#updatedat)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:195](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#195)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`usage`](StoredMessage.md#usage)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:191](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#191)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`vector`](StoredMessage.md#vector)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:198](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#198)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`wasStopped`](StoredMessage.md#wasstopped)
