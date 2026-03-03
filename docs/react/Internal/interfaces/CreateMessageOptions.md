# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:206](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#206)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:209](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#209)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:207](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#207)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:221](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#221)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:224](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#224)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:216](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#216)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:214](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#214)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:212](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#212)

Image generation model used for this message

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:210](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#210)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:229](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#229)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:219](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#219)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#208)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:218](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#218)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:227](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#227)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:225](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#225)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:217](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#217)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:220](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#220)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:222](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#222)
