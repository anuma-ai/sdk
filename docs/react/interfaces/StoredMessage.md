# StoredMessage

Defined in: [src/lib/db/chat/types.ts:34](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L34)

## Extended by

- [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:39](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L39)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:37](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L37)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:42](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L42)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L45)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L51)

If set, indicates the message failed with this error

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)[]

Defined in: [src/lib/db/chat/types.ts:41](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L41)

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:36](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L36)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:40](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L40)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L48)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:38](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L38)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)[]

Defined in: [src/lib/db/chat/types.ts:47](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L47)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:35](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L35)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L43)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:46](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L46)

***

### vector?

> `optional` **vector**: `number`[]

Defined in: [src/lib/db/chat/types.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L44)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:49](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L49)
