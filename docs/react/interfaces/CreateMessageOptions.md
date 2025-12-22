# CreateMessageOptions

Defined in: [src/lib/db/chat/types.ts:67](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L67)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:70](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L70)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:68](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L68)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:77](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L77)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:80](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L80)

If set, indicates the message failed with this error

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)[]

Defined in: [src/lib/db/chat/types.ts:72](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L72)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:71](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L71)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:75](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L75)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:69](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L69)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)[]

Defined in: [src/lib/db/chat/types.ts:74](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L74)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:73](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L73)

***

### vector?

> `optional` **vector**: `number`[]

Defined in: [src/lib/db/chat/types.ts:76](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L76)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:78](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L78)
