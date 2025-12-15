# CreateMessageOptions

Defined in: [src/lib/chatStorage/types.ts:119](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L119)

Options for creating a new message

## Properties

### content

> **content**: `string`

Defined in: [src/lib/chatStorage/types.ts:125](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L125)

Message content

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/chatStorage/types.ts:121](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L121)

Conversation ID to add the message to

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/chatStorage/types.ts:139](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L139)

Model used to generate the embedding

***

### files?

> `optional` **files**: [`FileMetadata`](FileMetadata.md)[]

Defined in: [src/lib/chatStorage/types.ts:129](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L129)

Attached files

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/chatStorage/types.ts:127](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L127)

LLM model used (for assistant messages)

***

### responseDuration?

> `optional` **responseDuration**: `number`

Defined in: [src/lib/chatStorage/types.ts:135](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L135)

Response duration in seconds

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/chatStorage/types.ts:123](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L123)

Message role

***

### sources?

> `optional` **sources**: [`SearchSource`](SearchSource.md)[]

Defined in: [src/lib/chatStorage/types.ts:133](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L133)

Web search sources

***

### usage?

> `optional` **usage**: [`StoredChatCompletionUsage`](StoredChatCompletionUsage.md)

Defined in: [src/lib/chatStorage/types.ts:131](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L131)

Token usage information

***

### vector?

> `optional` **vector**: `number`[]

Defined in: [src/lib/chatStorage/types.ts:137](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/types.ts#L137)

Embedding vector for semantic search
