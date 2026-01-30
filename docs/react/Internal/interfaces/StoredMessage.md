# StoredMessage

Defined in: [src/lib/db/chat/types.ts:65](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L65)

## Extended by

* [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:70](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L70)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:68](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L68)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:76](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L76)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:79](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L79)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:85](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L85)

If set, indicates the message failed with this error

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:75](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L75)

Array of media\_id references for direct lookup in media table

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:73](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L73)

**Deprecated**

Use fileIds with media table instead

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:67](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L67)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:71](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L71)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:82](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L82)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:69](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L69)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:81](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L81)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L88)

Reasoning/thinking content from models that support extended thinking

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:86](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L86)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:66](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L66)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:77](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L77)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:80](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L80)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:78](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L78)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L83)
