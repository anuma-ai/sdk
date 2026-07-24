# MemoryVaultSearchOptions

Defined in: [src/lib/memoryVault/searchTool.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#36)

Options for the vault search tool.

## Properties

### bm25AdmissionDivisor?

> `optional` **bm25AdmissionDivisor**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#93)

Divisor mapping BM25 scores to the admission floor (`bm25 / divisor`). Default 50.

***

### ceWeight?

> `optional` **ceWeight**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#76)

Multiplicative cross-encoder blend weight. Default 0.1. Only used when `rerank` is true.

***

### decompose?

> `optional` **decompose**: `"off"` | `"llm"`

Defined in: [src/lib/memoryVault/searchTool.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#102)

LLM-based query decomposition for composite/abstract queries. When set,
each query is classified + (if composite) decomposed into 3–5 facet
sub-queries via gpt-5-mini, then ranked via rankComposite.
Requires `decomposeOptions` (auth) when set to "llm".

***

### decomposeOptions?

> `optional` **decomposeOptions**: [`PortalLlmAuth`](PortalLlmAuth.md) & `object`

Defined in: [src/lib/memoryVault/searchTool.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#106)

Auth + endpoint for the decomposition LLM call. Required when
decompose="llm". Auth is the dual pattern — one of `apiKey` /
`getToken`; see [PortalLlmAuth](PortalLlmAuth.md).

**Type Declaration**

**baseUrl?**

> `optional` **baseUrl**: `string`

**model?**

> `optional` **model**: `string`

***

### entityRanking?

> `optional` **entityRanking**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#116)

W5 graph lane — pre-built ranking of memory IDs by entity-overlap
score with the query. RRF-fused alongside cosine + BM25. Build via
rankByEntityOverlap or pass-through from `recall()` when
`RecallContext.entityCtx` is available.

***

### factTypes?

> `optional` **factTypes**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#48)

Typed memory (PR1) — when provided, only search memories of these fact
types. Applied at load time via `Q.oneOf` on the indexed `fact_type`
column. Omit for no type filter.

***

### factTypeWeights?

> `optional` **factTypeWeights**: `Record`<`string`, `number`>

Defined in: [src/lib/memoryVault/searchTool.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#54)

PR5 — optional per-FactType score multiplier applied in the boost stage
(e.g. `{ identity: 1.2, ongoing_context: 0.8 }`). Empty/omitted = uniform
(no behavior change). See rankFusedVaultMemories.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#44)

When provided, only search memories in this folder (null for unfiled)

***

### includeArchived?

> `optional` **includeArchived**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#61)

PR5 — include archived (decayed) rows in the candidate load. Default false
(the baseVaultConditions choke point excludes them). retain()'s dedup
search sets this so a re-observed fact can merge into — and un-archive — an
archived row instead of creating a fresh duplicate.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#38)

Maximum number of results to return (default: 5)

***

### minSimilarity?

> `optional` **minSimilarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#40)

Minimum similarity threshold below which results are discarded (default: 0.1)

***

### mmr?

> `optional` **mmr**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#85)

Apply Maximal Marginal Relevance after the relevance pass. Default false.
Only effective on the rerank (async) pipeline.

***

### proofCountAlpha?

> `optional` **proofCountAlpha**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#91)

Proof-count log-boost scale (Hindsight α). Default 0.1.

***

### recency?

> `optional` **recency**: [`RecencyOptions`](RecencyOptions.md)

Defined in: [src/lib/memoryVault/searchTool.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#80)

Recency decay curve overrides (per-year decay slope, floor, no-date multiplier).

***

### recencyAlpha?

> `optional` **recencyAlpha**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#78)

Recency boost slope applied in the fused ranker. Default 1.0.

***

### rerank?

> `optional` **rerank**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#72)

Run the cross-encoder reranker on the top-N V2 candidates. Default false.
When true, switches to the async pipeline (rankFusedVaultMemoriesAsync).

***

### rerankTopN?

> `optional` **rerankTopN**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#74)

Number of CE rerank candidates. Default 30.

***

### rrfK?

> `optional` **rrfK**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#95)

RRF smoothing constant for lane fusion. Default 60.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#42)

When provided, only search memories with these scopes

***

### supersessionBoost?

> `optional` **supersessionBoost**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#87)

Supersession score-gap transfer factor. Default 0.8.

***

### supersessionWindow?

> `optional` **supersessionWindow**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#89)

Hard cap on the supersession candidate window. Default 50.

***

### temporalRanking?

> `optional` **temporalRanking**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#124)

W6 temporal lane — pre-built ranking of memory IDs whose event-time
overlaps the resolved query window, ordered by overlap score
(descending). RRF-fused alongside cosine + BM25 + graph. Build via
`getMemoriesByEventTimeOp` + `scoreEventTimeOverlap`, or
pass-through from `recall()` when the query has a temporal phrase.

***

### useFusion?

> `optional` **useFusion**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#67)

Use the hybrid fusion ranker (cosine + BM25 + RRF + recency) instead of
cosine-only. Default true — new W1 pipeline. Pass false to fall back
to the legacy cosine-only ranker (e.g. for benchmark A/B comparison).
