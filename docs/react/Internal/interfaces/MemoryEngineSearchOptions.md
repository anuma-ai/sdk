# MemoryEngineSearchOptions

Defined in: [src/lib/memoryEngine/types.ts:6](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#6)

Options for memory engine search

## Properties

### contextMessages?

> `optional` **contextMessages**: `number`

Defined in: [src/lib/memoryEngine/types.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#22)

Number of surrounding messages to include around each match when expanding to full sessions. 0 returns only matched chunks (no expansion), undefined returns the entire conversation. Default: undefined (full session).

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memoryEngine/types.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#16)

Filter to a specific conversation

***

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/memoryEngine/types.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#18)

Exclude messages from this conversation (e.g., the current conversation)

***

### includeAssistant?

> `optional` **includeAssistant**: `boolean`

Defined in: [src/lib/memoryEngine/types.ts:14](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#14)

Include assistant messages in results (default: false)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memoryEngine/types.ts:8](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#8)

Maximum number of results to return (default: 8)

***

### minSimilarity?

> `optional` **minSimilarity**: `number`

Defined in: [src/lib/memoryEngine/types.ts:12](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#12)

Minimum similarity threshold 0-1 (default: 0.3)

***

### sortBy?

> `optional` **sortBy**: `"similarity"` | `"chronological"`

Defined in: [src/lib/memoryEngine/types.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#20)

Sort order for results: "similarity" (most relevant first) or "chronological" (oldest first). Default: "similarity"

***

### topK?

> `optional` **topK**: `number`

Defined in: [src/lib/memoryEngine/types.ts:10](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#10)

Alias for limit - number of chunks to return (default: 8)
