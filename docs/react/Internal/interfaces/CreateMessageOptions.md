# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:229](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#229)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:232](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#232)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:230](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#230)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:244](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#244)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:247](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#247)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:239](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#239)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:237](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#237)

**Deprecated**

Use fileIds with media table instead

***

### imageModel?

> `optional` **imageModel**: `string`

Defined in: [src/lib/db/chat/types.ts:235](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#235)

Image generation model used for this message

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:233](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#233)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:252](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#252)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:242](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#242)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:231](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#231)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:241](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#241)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:250](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#250)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:248](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#248)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:240](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#240)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:243](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#243)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:245](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#245)
