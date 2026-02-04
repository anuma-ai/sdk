# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:155](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L155)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:158](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L158)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:156](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L156)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:168](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L168)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:171](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L171)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:163](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L163)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:161](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L161)

**Deprecated**

Use fileIds with media table instead

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:159](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L159)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:166](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L166)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:157](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L157)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:165](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L165)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:174](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L174)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:172](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L172)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:164](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L164)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:167](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L167)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:169](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L169)
