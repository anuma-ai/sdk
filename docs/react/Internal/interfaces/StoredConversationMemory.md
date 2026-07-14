# StoredConversationMemory

Defined in: [src/lib/db/conversationMemory/types.ts:10](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/conversationMemory/types.ts#10)

Plain object representation of a conversation-memory record.

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/conversationMemory/types.ts:14](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/conversationMemory/types.ts#14)

The conversation this memory was drawn on in

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/conversationMemory/types.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/conversationMemory/types.ts#19)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/db/conversationMemory/types.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/conversationMemory/types.ts#16)

The memory\_vault record id this row points at

***

### score

> **score**: `number`

Defined in: [src/lib/db/conversationMemory/types.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/conversationMemory/types.ts#18)

Recall relevance score (~0–1) at the time it was recorded

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/conversationMemory/types.ts:12](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/conversationMemory/types.ts#12)

WatermelonDB internal ID
