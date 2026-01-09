# StoredMessage

Defined in: [src/lib/db/chat/types.ts:38](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L38)

## Extended by

* [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L43)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:41](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L41)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:46](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L46)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:49](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L49)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:55](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L55)

If set, indicates the message failed with this error

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L45)

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:40](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L40)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L44)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L52)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:42](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L42)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L51)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:58](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L58)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L56)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:39](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L39)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:47](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L47)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L50)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L48)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:53](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L53)
