# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:378](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#378)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:381](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#381)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:379](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#379)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:393](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#393)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:396](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#396)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:388](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#388)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:386](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#386)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:384](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#384)

Image generation model used for this message

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:382](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#382)

***

### origin?

> `optional` **origin**: `"tool_result"`

Defined in: [src/lib/db/chat/types.ts:405](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#405)

Provenance for synthetic rows; set by the producer, never by user input

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:401](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#401)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:391](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#391)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:380](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#380)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:390](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#390)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:399](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#399)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:397](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#397)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:403](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#403)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId?

> `optional` **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:413](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#413)

Optional pre-generated unique ID for this message.
When provided, used as the WatermelonDB record ID instead of auto-generating one.
Consumers can pre-allocate this ID before streaming starts so the in-flight
placeholder and the eventually-persisted message share the same React key,
eliminating the unmount/remount flash when streaming completes.

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:389](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#389)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:392](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#392)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:394](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#394)
