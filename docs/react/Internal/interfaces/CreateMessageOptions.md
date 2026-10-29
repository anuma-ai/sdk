# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:431](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#431)

## Properties

### anuma?

> `optional` **anuma**: [`AnumaTurn`](AnumaTurn.md)

Defined in: [src/lib/db/chat/types.ts:460](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#460)

Anuma 1:1 turn fields; only vault chat backends store them.

***

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:434](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#434)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:432](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#432)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:446](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#446)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:449](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#449)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:441](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#441)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:439](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#439)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:437](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#437)

Image generation model used for this message

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:435](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#435)

***

### origin?

> `optional` **origin**: [`MessageOrigin`](../type-aliases/MessageOrigin.md)

Defined in: [src/lib/db/chat/types.ts:458](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#458)

Provenance for synthetic rows; set by the producer, never by user input

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:454](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#454)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:444](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#444)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:433](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#433)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:443](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#443)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:452](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#452)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:450](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#450)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:456](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#456)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId?

> `optional` **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:468](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#468)

Optional pre-generated unique ID for this message.
When provided, used as the WatermelonDB record ID instead of auto-generating one.
Consumers can pre-allocate this ID before streaming starts so the in-flight
placeholder and the eventually-persisted message share the same React key,
eliminating the unmount/remount flash when streaming completes.

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:442](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#442)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:445](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#445)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:447](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#447)
