# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:180](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L180)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:183](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L183)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:181](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L181)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:193](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L193)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:196](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L196)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:188](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L188)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:186](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L186)

**Deprecated**

Use fileIds with media table instead

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:184](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L184)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:201](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L201)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:191](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L191)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:182](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L182)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:190](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L190)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:199](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L199)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:197](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L197)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:189](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L189)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:192](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L192)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:194](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L194)
