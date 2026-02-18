# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:190](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L190)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:193](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L193)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:191](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L191)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:203](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L203)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:206](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L206)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:198](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L198)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:196](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L196)

**Deprecated**

Use fileIds with media table instead

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:194](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L194)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:211](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L211)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:201](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L201)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:192](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L192)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:200](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L200)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:209](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L209)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:207](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L207)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:199](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L199)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:202](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L202)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:204](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L204)
