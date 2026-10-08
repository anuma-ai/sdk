# MemoryEngineResult

Defined in: [src/lib/memoryEngine/types.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#28)

A retrieved message with similarity score

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryEngine/types.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#30)

Message content

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/memoryEngine/types.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#34)

Conversation this message belongs to

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/memoryEngine/types.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#38)

When the message was created

***

### role

> **role**: `"user"` | `"assistant"`

Defined in: [src/lib/memoryEngine/types.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#32)

Role of the message sender

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryEngine/types.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#36)

Cosine similarity score (0-1)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryEngine/types.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#40)

Unique message ID
