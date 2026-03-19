# MemoryEngineResult

Defined in: [src/lib/memoryEngine/types.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#39)

A retrieved message with similarity score

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryEngine/types.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#41)

Message content

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/memoryEngine/types.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#45)

Conversation this message belongs to

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/memoryEngine/types.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#49)

When the message was created

***

### role

> **role**: `"assistant"` | `"user"`

Defined in: [src/lib/memoryEngine/types.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#43)

Role of the message sender

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryEngine/types.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#47)

Cosine similarity score (0-1)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryEngine/types.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#51)

Unique message ID
