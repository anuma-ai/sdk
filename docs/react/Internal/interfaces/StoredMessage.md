# StoredMessage

Defined in: [src/lib/db/chat/types.ts:64](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L64)

## Extended by

* [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:69](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L69)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:67](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L67)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:72](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L72)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:75](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L75)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:81](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L81)

If set, indicates the message failed with this error

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:71](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L71)

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:66](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L66)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:70](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L70)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:78](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L78)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:68](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L68)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:77](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L77)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:84](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L84)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:82](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L82)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:65](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L65)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:73](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L73)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:76](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L76)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:74](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L74)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:79](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L79)
