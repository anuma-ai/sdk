# MemoryEngineResult

Defined in: [src/lib/memoryEngine/types.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#37)

A retrieved message with similarity score

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryEngine/types.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#39)

Message content

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/memoryEngine/types.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#43)

Conversation this message belongs to

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/memoryEngine/types.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#47)

When the message was created

***

### role

> **role**: `"user"` | `"assistant"`

Defined in: [src/lib/memoryEngine/types.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#41)

Role of the message sender

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryEngine/types.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#45)

Cosine similarity score (0-1)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryEngine/types.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#49)

Unique message ID
