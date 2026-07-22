# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:350](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#350)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:353](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#353)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:351](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#351)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:365](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#365)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:368](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#368)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:360](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#360)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:358](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#358)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:356](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#356)

Image generation model used for this message

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:354](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#354)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:373](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#373)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:363](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#363)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:352](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#352)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:362](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#362)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:371](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#371)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:369](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#369)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:375](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#375)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId?

> `optional` **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:383](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#383)

Optional pre-generated unique ID for this message.
When provided, used as the WatermelonDB record ID instead of auto-generating one.
Consumers can pre-allocate this ID before streaming starts so the in-flight
placeholder and the eventually-persisted message share the same React key,
eliminating the unmount/remount flash when streaming completes.

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:361](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#361)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:364](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#364)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:366](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#366)
