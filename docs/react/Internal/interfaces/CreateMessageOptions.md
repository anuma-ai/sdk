# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:176](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L176)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:179](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L179)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:177](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L177)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:189](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L189)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:192](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L192)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:184](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L184)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:182](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L182)

**Deprecated**

Use fileIds with media table instead

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:180](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L180)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:187](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L187)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:178](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L178)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:186](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L186)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:195](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L195)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:193](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L193)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:185](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L185)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:188](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L188)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:190](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L190)
