# StoredMessageWithSimilarity

Defined in: [src/lib/db/chat/types.ts:74](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L74)

## Extends

- [`StoredMessage`](StoredMessage.md)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:41](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L41)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`content`](StoredMessage.md#content)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:39](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L39)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`conversationId`](StoredMessage.md#conversationid)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L44)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`createdAt`](StoredMessage.md#createdat)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:47](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L47)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`embeddingModel`](StoredMessage.md#embeddingmodel)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:53](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L53)

If set, indicates the message failed with this error

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`error`](StoredMessage.md#error)

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)[]

Defined in: [src/lib/db/chat/types.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L43)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`files`](StoredMessage.md#files)

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:38](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L38)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`messageId`](StoredMessage.md#messageid)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:42](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L42)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`model`](StoredMessage.md#model)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L50)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`responseDuration`](StoredMessage.md#responseduration)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:40](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L40)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`role`](StoredMessage.md#role)

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:75](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L75)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)[]

Defined in: [src/lib/db/chat/types.ts:49](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L49)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`sources`](StoredMessage.md#sources)

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`[]

Defined in: [src/lib/db/chat/types.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L54)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`thoughtProcess`](StoredMessage.md#thoughtprocess)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:37](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L37)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`uniqueId`](StoredMessage.md#uniqueid)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L45)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`updatedAt`](StoredMessage.md#updatedat)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L48)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`usage`](StoredMessage.md#usage)

***

### vector?

> `optional` **vector**: `number`[]

Defined in: [src/lib/db/chat/types.ts:46](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L46)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`vector`](StoredMessage.md#vector)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L51)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`wasStopped`](StoredMessage.md#wasstopped)
