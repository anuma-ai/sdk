# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:323](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#323)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:326](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#326)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:324](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#324)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:338](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#338)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:341](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#341)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:333](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#333)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:331](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#331)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:329](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#329)

Image generation model used for this message

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:327](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#327)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:346](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#346)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:336](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#336)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:325](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#325)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:335](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#335)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:344](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#344)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:342](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#342)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:348](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#348)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId?

> `optional` **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:356](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#356)

Optional pre-generated unique ID for this message.
When provided, used as the WatermelonDB record ID instead of auto-generating one.
Consumers can pre-allocate this ID before streaming starts so the in-flight
placeholder and the eventually-persisted message share the same React key,
eliminating the unmount/remount flash when streaming completes.

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:334](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#334)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:337](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#337)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:339](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#339)
