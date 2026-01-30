# MemoryRetrievalSearchOptions

Defined in: [src/lib/memoryRetrieval/types.ts:13](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L13)

Options for memory retrieval search

## Properties

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memoryRetrieval/types.ts:21](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L21)

Filter to a specific conversation

***

### includeAssistant?

> `optional` **includeAssistant**: `boolean`

Defined in: [src/lib/memoryRetrieval/types.ts:19](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L19)

Include assistant messages in results (default: true)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memoryRetrieval/types.ts:15](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L15)

Maximum number of results to return (default: 10)

***

### minSimilarity?

> `optional` **minSimilarity**: `number`

Defined in: [src/lib/memoryRetrieval/types.ts:17](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L17)

Minimum similarity threshold 0-1 (default: 0.3)
