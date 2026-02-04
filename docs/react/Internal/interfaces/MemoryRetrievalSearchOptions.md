# MemoryRetrievalSearchOptions

Defined in: [src/lib/memoryRetrieval/types.ts:13](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L13)

Options for memory retrieval search

## Properties

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memoryRetrieval/types.ts:23](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L23)

Filter to a specific conversation

***

### endDate?

> `optional` **endDate**: `string`

Defined in: [src/lib/memoryRetrieval/types.ts:29](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L29)

Inclusive end date filter (currently disabled)

***

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/memoryRetrieval/types.ts:25](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L25)

Exclude messages from this conversation (e.g., the current conversation)

***

### includeAssistant?

> `optional` **includeAssistant**: `boolean`

Defined in: [src/lib/memoryRetrieval/types.ts:21](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L21)

Include assistant messages in results (default: false)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memoryRetrieval/types.ts:15](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L15)

Maximum number of results to return (default: 8)

***

### minSimilarity?

> `optional` **minSimilarity**: `number`

Defined in: [src/lib/memoryRetrieval/types.ts:19](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L19)

Minimum similarity threshold 0-1 (default: 0.3)

***

### sortBy?

> `optional` **sortBy**: `"similarity"` | `"chronological"`

Defined in: [src/lib/memoryRetrieval/types.ts:31](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L31)

Sort order for results: "similarity" (most relevant first) or "chronological" (oldest first). Default: "similarity"

***

### startDate?

> `optional` **startDate**: `string`

Defined in: [src/lib/memoryRetrieval/types.ts:27](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L27)

Inclusive start date filter (currently disabled)

***

### topK?

> `optional` **topK**: `number`

Defined in: [src/lib/memoryRetrieval/types.ts:17](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L17)

Alias for limit - number of chunks to return (default: 8)
