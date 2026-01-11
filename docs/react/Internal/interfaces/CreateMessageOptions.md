# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:108](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L108)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:111](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L111)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:109](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L109)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:118](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L118)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:121](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L121)

If set, indicates the message failed with this error

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:113](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L113)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:112](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L112)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:116](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L116)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:110](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L110)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:115](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L115)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:124](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L124)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:122](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L122)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:114](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L114)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:117](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L117)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:119](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L119)
