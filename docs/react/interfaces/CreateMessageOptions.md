# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:80](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L80)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L83)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:81](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L81)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:90](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L90)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:93](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L93)

If set, indicates the message failed with this error

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)[]

Defined in: [src/lib/db/chat/types.ts:85](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L85)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:84](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L84)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L88)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:82](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L82)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)[]

Defined in: [src/lib/db/chat/types.ts:87](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L87)

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`[]

Defined in: [src/lib/db/chat/types.ts:94](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L94)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:86](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L86)

***

### vector?

> `optional` **vector**: `number`[]

Defined in: [src/lib/db/chat/types.ts:89](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L89)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:91](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L91)
