# MemoryEngineResult

Defined in: [src/lib/memoryEngine/types.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#29)

A retrieved message with similarity score

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryEngine/types.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#31)

Message content

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/memoryEngine/types.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#35)

Conversation this message belongs to

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/memoryEngine/types.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#39)

When the message was created

***

### role

> **role**: `"user"` | `"assistant"`

Defined in: [src/lib/memoryEngine/types.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#33)

Role of the message sender

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryEngine/types.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#37)

Cosine similarity score (0-1)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryEngine/types.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#41)

Unique message ID
