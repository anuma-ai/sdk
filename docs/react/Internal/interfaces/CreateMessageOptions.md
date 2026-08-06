# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:400](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#400)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:403](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#403)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:401](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#401)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:415](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#415)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:418](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#418)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:410](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#410)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:408](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#408)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:406](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#406)

Image generation model used for this message

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:404](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#404)

***

### origin?

> `optional` **origin**: [`MessageOrigin`](../type-aliases/MessageOrigin.md)

Defined in: [src/lib/db/chat/types.ts:427](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#427)

Provenance for synthetic rows; set by the producer, never by user input

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:423](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#423)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:413](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#413)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:402](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#402)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:412](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#412)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:421](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#421)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:419](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#419)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:425](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#425)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId?

> `optional` **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:435](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#435)

Optional pre-generated unique ID for this message.
When provided, used as the WatermelonDB record ID instead of auto-generating one.
Consumers can pre-allocate this ID before streaming starts so the in-flight
placeholder and the eventually-persisted message share the same React key,
eliminating the unmount/remount flash when streaming completes.

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:411](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#411)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:414](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#414)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:416](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#416)
