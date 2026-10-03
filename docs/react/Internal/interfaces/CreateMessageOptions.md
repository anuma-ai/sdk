# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:420](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#420)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:423](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#423)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:421](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#421)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:435](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#435)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:438](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#438)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:430](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#430)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:428](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#428)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:426](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#426)

Image generation model used for this message

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:424](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#424)

***

### origin?

> `optional` **origin**: [`MessageOrigin`](../type-aliases/MessageOrigin.md)

Defined in: [src/lib/db/chat/types.ts:447](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#447)

Provenance for synthetic rows; set by the producer, never by user input

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:443](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#443)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:433](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#433)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:422](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#422)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:432](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#432)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:441](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#441)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:439](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#439)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:445](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#445)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId?

> `optional` **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:455](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#455)

Optional pre-generated unique ID for this message.
When provided, used as the WatermelonDB record ID instead of auto-generating one.
Consumers can pre-allocate this ID before streaming starts so the in-flight
placeholder and the eventually-persisted message share the same React key,
eliminating the unmount/remount flash when streaming completes.

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:431](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#431)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:434](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#434)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:436](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#436)
