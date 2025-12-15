# StoredMessage

Defined in: [src/lib/chatStorage/types.ts:59](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L59)

Stored message record (what gets persisted to the database)

## Extended by

- [`StoredMessageWithSimilarity`](StoredMessageWithSimilarity.md)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/chatStorage/types.ts:69](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L69)

The message text

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/chatStorage/types.ts:65](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L65)

Links message to its conversation

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/chatStorage/types.ts:75](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L75)

When the message was created

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/chatStorage/types.ts:81](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L81)

Model used to generate embedding

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)[]

Defined in: [src/lib/chatStorage/types.ts:73](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L73)

Optional attached files

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/chatStorage/types.ts:63](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L63)

Sequential message ID within conversation

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chatStorage/types.ts:71](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L71)

LLM model used

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/chatStorage/types.ts:87](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L87)

Response time in seconds

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/chatStorage/types.ts:67](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L67)

Who sent the message

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)[]

Defined in: [src/lib/chatStorage/types.ts:85](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L85)

Web search sources

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/chatStorage/types.ts:61](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L61)

Primary key, unique message identifier (WatermelonDB auto-generated)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/chatStorage/types.ts:77](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L77)

When the message was last updated

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/chatStorage/types.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L83)

Token counts and cost

***

### vector?

> `optional` **vector**: `number`[]

Defined in: [src/lib/chatStorage/types.ts:79](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L79)

Embedding vector for semantic search
