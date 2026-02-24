# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:204](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#204)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:207](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#207)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:205](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#205)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:217](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#217)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:220](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#220)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:212](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#212)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:210](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#210)

**Deprecated**

Use fileIds with media table instead

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#208)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:225](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#225)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:215](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#215)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:206](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#206)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:214](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#214)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:223](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#223)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:221](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#221)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:213](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#213)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:216](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#216)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:218](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#218)
