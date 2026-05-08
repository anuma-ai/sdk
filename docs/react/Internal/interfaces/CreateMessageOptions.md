# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:256](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#256)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:259](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#259)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:257](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#257)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:271](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#271)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:274](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#274)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:266](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#266)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:264](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#264)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:262](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#262)

Image generation model used for this message

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:260](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#260)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:279](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#279)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:269](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#269)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:258](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#258)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:268](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#268)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:277](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#277)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:275](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#275)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:281](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#281)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId?

> `optional` **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:289](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#289)

Optional pre-generated unique ID for this message.
When provided, used as the WatermelonDB record ID instead of auto-generating one.
Consumers can pre-allocate this ID before streaming starts so the in-flight
placeholder and the eventually-persisted message share the same React key,
eliminating the unmount/remount flash when streaming completes.

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:267](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#267)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:270](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#270)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:272](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#272)
