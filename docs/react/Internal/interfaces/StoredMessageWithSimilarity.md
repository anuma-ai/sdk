# StoredMessageWithSimilarity

Defined in: [src/lib/db/chat/types.ts:160](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L160)

## Extends

* [`StoredMessage`](StoredMessage.md)

## Properties

### chunks?

> `optional` **chunks**: [`MessageChunk`](MessageChunk.md)\[]

Defined in: [src/lib/db/chat/types.ts:125](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L125)

Chunks of this message with individual embeddings for fine-grained search

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`chunks`](StoredMessage.md#chunks)

***

### content

> **content**: `string`

Defined in: [src/lib/db/chat/types.ts:114](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L114)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`content`](StoredMessage.md#content)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:112](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L112)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`conversationId`](StoredMessage.md#conversationid)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:120](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L120)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`createdAt`](StoredMessage.md#createdat)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/chat/types.ts:123](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L123)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`embeddingModel`](StoredMessage.md#embeddingmodel)

***

### error?

> `optional` **error**: `string`

Defined in: [src/lib/db/chat/types.ts:131](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L131)

If set, indicates the message failed with this error

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`error`](StoredMessage.md#error)

***

### feedback?

> `optional` **feedback**: [`MessageFeedback`](../type-aliases/MessageFeedback.md)

Defined in: [src/lib/db/chat/types.ts:138](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L138)

User feedback: 'like', 'dislike', or null for no feedback

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`feedback`](StoredMessage.md#feedback)

***

### fileIds?

> `optional` **fileIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:119](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L119)

Array of media\_id references for direct lookup in media table

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`fileIds`](StoredMessage.md#fileids)

***

### ~~files?~~

> `optional` **files**: [`FileMetadata`](FileMetadata.md)\[]

Defined in: [src/lib/db/chat/types.ts:117](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L117)

**Deprecated**

Use fileIds with media table instead

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`files`](StoredMessage.md#files)

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:111](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L111)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`messageId`](StoredMessage.md#messageid)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:115](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L115)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`model`](StoredMessage.md#model)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:136](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L136)

Parent message ID for branching (edit/regenerate). Null for root messages.

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`parentMessageId`](StoredMessage.md#parentmessageid)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/db/chat/types.ts:128](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L128)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`responseDuration`](StoredMessage.md#responseduration)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:113](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L113)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`role`](StoredMessage.md#role)

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:161](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L161)

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:127](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L127)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`sources`](StoredMessage.md#sources)

***

### thinking?

> `optional` **thinking**: `string`

Defined in: [src/lib/db/chat/types.ts:134](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L134)

Reasoning/thinking content from models that support extended thinking

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`thinking`](StoredMessage.md#thinking)

***

### thoughtProcess?

> `optional` **thoughtProcess**: `ActivityPhase`\[]

Defined in: [src/lib/db/chat/types.ts:132](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L132)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`thoughtProcess`](StoredMessage.md#thoughtprocess)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:110](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L110)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`uniqueId`](StoredMessage.md#uniqueid)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:121](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L121)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`updatedAt`](StoredMessage.md#updatedat)

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/db/chat/types.ts:126](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L126)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`usage`](StoredMessage.md#usage)

***

### vector?

> `optional` **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:122](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L122)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`vector`](StoredMessage.md#vector)

***

### wasStopped?

> `optional` **wasStopped**: `boolean`

Defined in: [src/lib/db/chat/types.ts:129](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L129)

**Inherited from**

[`StoredMessage`](StoredMessage.md).[`wasStopped`](StoredMessage.md#wasstopped)
