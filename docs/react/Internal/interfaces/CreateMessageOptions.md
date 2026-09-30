# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:421](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#421)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:424](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#424)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:422](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#422)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:436](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#436)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:439](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#439)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:431](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#431)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:429](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#429)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:427](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#427)

Image generation model used for this message

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:425](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#425)

***

### origin?

> `optional` **origin**: [`MessageOrigin`](../type-aliases/MessageOrigin.md)

Defined in: [src/lib/db/chat/types.ts:448](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#448)

Provenance for synthetic rows; set by the producer, never by user input

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:444](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#444)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:434](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#434)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:423](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#423)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:433](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#433)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:442](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#442)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:440](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#440)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:446](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#446)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId?

> `optional` **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:456](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#456)

Optional pre-generated unique ID for this message.
When provided, used as the WatermelonDB record ID instead of auto-generating one.
Consumers can pre-allocate this ID before streaming starts so the in-flight
placeholder and the eventually-persisted message share the same React key,
eliminating the unmount/remount flash when streaming completes.

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:432](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#432)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:435](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#435)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:437](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#437)
