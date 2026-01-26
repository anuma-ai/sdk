# StoredMessageWithSimilarity

Defined in: [src/lib/db/chat/types.ts:107](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L107)

## Extends

* [`StoredMessage`](StoredMessage.md)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:70](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L70)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`content`](StoredMessage.md#content)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:68](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L68)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`conversationId`](StoredMessage.md#conversationid)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:73](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L73)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`createdAt`](StoredMessage.md#createdat)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:76](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L76)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`embeddingModel`](StoredMessage.md#embeddingmodel)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:82](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L82)

If set, indicates the message failed with this error

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`error`](StoredMessage.md#error)

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:72](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L72)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`files`](StoredMessage.md#files)

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:67](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L67)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`messageId`](StoredMessage.md#messageid)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:71](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L71)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`model`](StoredMessage.md#model)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:79](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L79)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`responseDuration`](StoredMessage.md#responseduration)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:69](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L69)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`role`](StoredMessage.md#role)

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:108](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L108)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:78](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L78)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`sources`](StoredMessage.md#sources)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:85](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L85)

Reasoning/thinking content from models that support extended thinking

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`thinking`](StoredMessage.md#thinking)

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L83)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`thoughtProcess`](StoredMessage.md#thoughtprocess)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:66](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L66)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`uniqueId`](StoredMessage.md#uniqueid)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:74](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L74)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`updatedAt`](StoredMessage.md#updatedat)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:77](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L77)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`usage`](StoredMessage.md#usage)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:75](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L75)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`vector`](StoredMessage.md#vector)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:80](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L80)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`wasStopped`](StoredMessage.md#wasstopped)
