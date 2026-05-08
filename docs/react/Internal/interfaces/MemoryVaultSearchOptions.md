# MemoryVaultSearchOptions

Defined in: [src/lib/memoryVault/searchTool.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#31)

Options for the vault search tool.

## Properties

### decompose?

> `optional` **decompose**: `"off"` | `"llm"`

Defined in: [src/lib/memoryVault/searchTool.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#59)

LLM-based query decomposition for composite/abstract queries. When set,
each query is classified + (if composite) decomposed into 3–5 facet
sub-queries via gpt-5-mini, then ranked via rankComposite.
Requires `decomposeOptions` (auth) when set to "llm".

***

### decomposeOptions?

> `optional` **decomposeOptions**: `object`

Defined in: [src/lib/memoryVault/searchTool.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#61)

Auth + endpoint for the decomposition LLM call. Required when decompose="llm".

**apiKey**

> **apiKey**: `string`

**baseUrl?**

> `optional` **baseUrl**: `string`

**model?**

> `optional` **model**: `string`

***

### entityRanking?

> `optional` **entityRanking**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#72)

W5 graph lane — pre-built ranking of memory IDs by entity-overlap
score with the query. RRF-fused alongside cosine + BM25. Build via
rankByEntityOverlap or pass-through from `recall()` when
`RecallContext.entityCtx` is available.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#39)

When provided, only search memories in this folder (null for unfiled)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#33)

Maximum number of results to return (default: 5)

***

### minSimilarity?

> `optional` **minSimilarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#35)

Minimum similarity threshold below which results are discarded (default: 0.1)

***

### rerank?

> `optional` **rerank**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#50)

Run the cross-encoder reranker on the top-N V2 candidates. Default false.
When true, switches to the async pipeline (rankFusedVaultMemoriesAsync).

***

### rerankTopN?

> `optional` **rerankTopN**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#52)

Number of CE rerank candidates. Default 30.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#37)

When provided, only search memories with these scopes

***

### temporalRanking?

> `optional` **temporalRanking**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#80)

W6 temporal lane — pre-built ranking of memory IDs whose event-time
overlaps the resolved query window, ordered by overlap score
(descending). RRF-fused alongside cosine + BM25 + graph. Build via
`getMemoriesByEventTimeOp` + `scoreEventTimeOverlap`, or
pass-through from `recall()` when the query has a temporal phrase.

***

### useFusion?

> `optional` **useFusion**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#45)

Use the hybrid fusion ranker (cosine + BM25 + RRF + recency) instead of
cosine-only. Default true — new W1 pipeline. Pass false to fall back
to the legacy cosine-only ranker (e.g. for benchmark A/B comparison).
