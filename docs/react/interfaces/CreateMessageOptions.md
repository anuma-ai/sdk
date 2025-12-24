# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:78](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L78)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:81](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L81)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:79](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L79)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L88)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:91](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L91)

If set, indicates the message failed with this error

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)[]

Defined in: [src/lib/db/chat/types.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L83)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:82](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L82)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:86](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L86)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:80](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L80)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)[]

Defined in: [src/lib/db/chat/types.ts:85](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L85)

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`[]

Defined in: [src/lib/db/chat/types.ts:92](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L92)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:84](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L84)

***

### vector?

> `optional` **vector**: `number`[]

Defined in: [src/lib/db/chat/types.ts:87](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L87)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:89](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L89)
