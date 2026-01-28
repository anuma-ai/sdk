# MemoryRetrievalResult

Defined in: [src/lib/memoryRetrieval/types.ts:27](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L27)

A retrieved message with similarity score

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryRetrieval/types.ts:29](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L29)

Message content

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/memoryRetrieval/types.ts:33](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L33)

Conversation this message belongs to

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/memoryRetrieval/types.ts:37](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L37)

When the message was created

***

### role

> **role**: `"user"` | `"assistant"`

Defined in: [src/lib/memoryRetrieval/types.ts:31](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L31)

Role of the message sender

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryRetrieval/types.ts:35](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L35)

Cosine similarity score (0-1)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryRetrieval/types.ts:39](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L39)

Unique message ID
