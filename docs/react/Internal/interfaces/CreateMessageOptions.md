# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:311](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#311)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:314](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#314)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:312](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#312)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:326](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#326)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:329](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#329)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:321](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#321)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:319](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#319)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:317](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#317)

Image generation model used for this message

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:315](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#315)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:334](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#334)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:324](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#324)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:313](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#313)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:323](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#323)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:332](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#332)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:330](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#330)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:336](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#336)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId?

> `optional` **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:344](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#344)

Optional pre-generated unique ID for this message.
When provided, used as the WatermelonDB record ID instead of auto-generating one.
Consumers can pre-allocate this ID before streaming starts so the in-flight
placeholder and the eventually-persisted message share the same React key,
eliminating the unmount/remount flash when streaming completes.

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:322](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#322)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:325](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#325)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:327](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#327)
