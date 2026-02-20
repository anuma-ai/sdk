# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:203](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L203)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:206](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L206)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:204](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L204)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:216](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L216)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:219](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L219)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:211](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L211)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:209](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L209)

**Deprecated**

Use fileIds with media table instead

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:207](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L207)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:224](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L224)

Parent message ID for branching (edit/regenerate).

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:214](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L214)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:205](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L205)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:213](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L213)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:222](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L222)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:220](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L220)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:212](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L212)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:215](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L215)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:217](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L217)
