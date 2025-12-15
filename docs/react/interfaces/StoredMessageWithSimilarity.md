# StoredMessageWithSimilarity

Defined in: [src/lib/chatStorage/types.ts:111](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L111)

Stored message with similarity score (for search results)

## Extends

- [`StoredMessage`](StoredMessage.md)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/chatStorage/types.ts:69](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L69)

The message text

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`content`](StoredMessage.md#content)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/chatStorage/types.ts:65](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L65)

Links message to its conversation

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`conversationId`](StoredMessage.md#conversationid)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/chatStorage/types.ts:75](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L75)

When the message was created

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`createdAt`](StoredMessage.md#createdat)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/chatStorage/types.ts:81](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L81)

Model used to generate embedding

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`embeddingModel`](StoredMessage.md#embeddingmodel)

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)[]

Defined in: [src/lib/chatStorage/types.ts:73](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L73)

Optional attached files

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`files`](StoredMessage.md#files)

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/chatStorage/types.ts:63](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L63)

Sequential message ID within conversation

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`messageId`](StoredMessage.md#messageid)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chatStorage/types.ts:71](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L71)

LLM model used

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`model`](StoredMessage.md#model)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/chatStorage/types.ts:87](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L87)

Response time in seconds

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`responseDuration`](StoredMessage.md#responseduration)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/chatStorage/types.ts:67](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L67)

Who sent the message

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`role`](StoredMessage.md#role)

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/chatStorage/types.ts:113](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L113)

Cosine similarity score (0 to 1)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)[]

Defined in: [src/lib/chatStorage/types.ts:85](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L85)

Web search sources

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`sources`](StoredMessage.md#sources)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/chatStorage/types.ts:61](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L61)

Primary key, unique message identifier (WatermelonDB auto-generated)

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`uniqueId`](StoredMessage.md#uniqueid)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/chatStorage/types.ts:77](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L77)

When the message was last updated

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`updatedAt`](StoredMessage.md#updatedat)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/chatStorage/types.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L83)

Token counts and cost

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`usage`](StoredMessage.md#usage)

***

### vector?

> `optional` **vector**: `number`[]

Defined in: [src/lib/chatStorage/types.ts:79](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L79)

Embedding vector for semantic search

#### Inherited from

[`StoredMessage`](StoredMessage.md).[`vector`](StoredMessage.md#vector)
