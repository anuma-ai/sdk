# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:121](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L121)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:124](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L124)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:122](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L122)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:131](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L131)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:134](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L134)

If set, indicates the message failed with this error

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:126](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L126)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:125](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L125)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:129](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L129)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:123](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L123)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:128](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L128)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:137](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L137)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:135](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L135)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:127](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L127)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:130](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L130)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:132](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L132)
