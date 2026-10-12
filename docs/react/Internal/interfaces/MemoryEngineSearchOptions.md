# MemoryEngineSearchOptions

Defined in: [src/lib/memoryEngine/types.ts:7](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#7)

Options for memory engine search

## Properties

### contextMessages?

> `optional` **contextMessages**: `number`

Defined in: [src/lib/memoryEngine/types.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#23)

Number of surrounding messages to include around each match when expanding to full sessions. 0 returns only matched chunks (no expansion), undefined returns the entire conversation. Default: undefined (full session).

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memoryEngine/types.ts:17](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#17)

Filter to a specific conversation

***

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/memoryEngine/types.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#19)

Exclude messages from this conversation (e.g., the current conversation)

***

### includeAssistant?

> `optional` **includeAssistant**: `boolean`

Defined in: [src/lib/memoryEngine/types.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#15)

Include assistant messages in results (default: false)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memoryEngine/types.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#9)

Maximum number of results to return (default: 8)

***

### minSimilarity?

> `optional` **minSimilarity**: `number`

Defined in: [src/lib/memoryEngine/types.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#13)

Minimum similarity threshold 0-1 (default: 0.3)

***

### sortBy?

> `optional` **sortBy**: `"similarity"` | `"chronological"`

Defined in: [src/lib/memoryEngine/types.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#21)

Sort order for results: "similarity" (most relevant first) or "chronological" (oldest first). Default: "similarity"

***

### topK?

> `optional` **topK**: `number`

Defined in: [src/lib/memoryEngine/types.ts:11](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#11)

Alias for limit - number of chunks to return (default: 8)
