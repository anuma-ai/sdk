# MemoryVaultSearchOptions

Defined in: [src/lib/memoryVault/searchTool.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#32)

Options for the vault search tool.

## Properties

### bm25AdmissionDivisor?

> `optional` **bm25AdmissionDivisor**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#72)

Divisor mapping BM25 scores to the admission floor (`bm25 / divisor`). Default 50.

***

### ceWeight?

> `optional` **ceWeight**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#55)

Multiplicative cross-encoder blend weight. Default 0.1. Only used when `rerank` is true.

***

### decompose?

> `optional` **decompose**: `"off"` | `"llm"`

Defined in: [src/lib/memoryVault/searchTool.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#81)

LLM-based query decomposition for composite/abstract queries. When set,
each query is classified + (if composite) decomposed into 3–5 facet
sub-queries via gpt-5-mini, then ranked via rankComposite.
Requires `decomposeOptions` (auth) when set to "llm".

***

### decomposeOptions?

> `optional` **decomposeOptions**: `object`

Defined in: [src/lib/memoryVault/searchTool.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#83)

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

Defined in: [src/lib/memoryVault/searchTool.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#94)

W5 graph lane — pre-built ranking of memory IDs by entity-overlap
score with the query. RRF-fused alongside cosine + BM25. Build via
rankByEntityOverlap or pass-through from `recall()` when
`RecallContext.entityCtx` is available.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#40)

When provided, only search memories in this folder (null for unfiled)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#34)

Maximum number of results to return (default: 5)

***

### minSimilarity?

> `optional` **minSimilarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#36)

Minimum similarity threshold below which results are discarded (default: 0.1)

***

### mmr?

> `optional` **mmr**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#64)

Apply Maximal Marginal Relevance after the relevance pass. Default false.
Only effective on the rerank (async) pipeline.

***

### proofCountAlpha?

> `optional` **proofCountAlpha**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#70)

Proof-count log-boost scale (Hindsight α). Default 0.1.

***

### recency?

> `optional` **recency**: [`RecencyOptions`](RecencyOptions.md)

Defined in: [src/lib/memoryVault/searchTool.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#59)

Recency decay curve overrides (per-year decay slope, floor, no-date multiplier).

***

### recencyAlpha?

> `optional` **recencyAlpha**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#57)

Recency boost slope applied in the fused ranker. Default 1.0.

***

### rerank?

> `optional` **rerank**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#51)

Run the cross-encoder reranker on the top-N V2 candidates. Default false.
When true, switches to the async pipeline (rankFusedVaultMemoriesAsync).

***

### rerankTopN?

> `optional` **rerankTopN**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#53)

Number of CE rerank candidates. Default 30.

***

### rrfK?

> `optional` **rrfK**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#74)

RRF smoothing constant for lane fusion. Default 60.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#38)

When provided, only search memories with these scopes

***

### supersessionBoost?

> `optional` **supersessionBoost**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#66)

Supersession score-gap transfer factor. Default 0.8.

***

### supersessionWindow?

> `optional` **supersessionWindow**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#68)

Hard cap on the supersession candidate window. Default 50.

***

### temporalRanking?

> `optional` **temporalRanking**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#102)

W6 temporal lane — pre-built ranking of memory IDs whose event-time
overlaps the resolved query window, ordered by overlap score
(descending). RRF-fused alongside cosine + BM25 + graph. Build via
`getMemoriesByEventTimeOp` + `scoreEventTimeOverlap`, or
pass-through from `recall()` when the query has a temporal phrase.

***

### useFusion?

> `optional` **useFusion**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#46)

Use the hybrid fusion ranker (cosine + BM25 + RRF + recency) instead of
cosine-only. Default true — new W1 pipeline. Pass false to fall back
to the legacy cosine-only ranker (e.g. for benchmark A/B comparison).
