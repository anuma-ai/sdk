# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:359](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#359)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:362](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#362)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:360](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#360)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:374](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#374)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:377](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#377)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:369](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#369)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:367](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#367)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:365](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#365)

Image generation model used for this message

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:363](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#363)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:382](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#382)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:372](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#372)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:361](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#361)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:371](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#371)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:380](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#380)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:378](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#378)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:384](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#384)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId?

> `optional` **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:392](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#392)

Optional pre-generated unique ID for this message.
When provided, used as the WatermelonDB record ID instead of auto-generating one.
Consumers can pre-allocate this ID before streaming starts so the in-flight
placeholder and the eventually-persisted message share the same React key,
eliminating the unmount/remount flash when streaming completes.

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:370](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#370)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:373](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#373)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:375](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#375)
