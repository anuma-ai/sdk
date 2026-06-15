# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:268](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#268)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:271](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#271)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:269](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#269)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:283](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#283)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:286](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#286)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:278](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#278)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:276](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#276)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:274](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#274)

Image generation model used for this message

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:272](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#272)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:291](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#291)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:281](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#281)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:270](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#270)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:280](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#280)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:289](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#289)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:287](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#287)

***

### toolCallEvents?

> `optional` **toolCallEvents**: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

Defined in: [src/lib/db/chat/types.ts:293](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#293)

Tool call events from the backend response (for reconstructing tool call history)

***

### uniqueId?

> `optional` **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:301](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#301)

Optional pre-generated unique ID for this message.
When provided, used as the WatermelonDB record ID instead of auto-generating one.
Consumers can pre-allocate this ID before streaming starts so the in-flight
placeholder and the eventually-persisted message share the same React key,
eliminating the unmount/remount flash when streaming completes.

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:279](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#279)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:282](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#282)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:284](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#284)
