# MemoryVaultSearchOptions

Defined in: [src/lib/memoryVault/searchTool.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#145)

Options for the vault search tool.

## Properties

### admitFactor?

> `optional` **admitFactor**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:254](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#254)

Admission window multiplier for decrypt-last (`limit * admitFactor`). Default 3.

***

### admitFloor?

> `optional` **admitFloor**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:256](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#256)

Admission window floor for decrypt-last. Default 30.

***

### bm25AdmissionDivisor?

> `optional` **bm25AdmissionDivisor**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:202](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#202)

Divisor mapping BM25 scores to the admission floor (`bm25 / divisor`). Default 50.

***

### ceWeight?

> `optional` **ceWeight**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:185](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#185)

Multiplicative cross-encoder blend weight. Default 0.1. Only used when `rerank` is true.

***

### ~~decompose?~~

> `optional` **decompose**: `"off"` | `"llm"`

Defined in: [src/lib/memoryVault/searchTool.ts:220](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#220)

**Deprecated**

719/B4 — ignored by [searchVaultMemories](../functions/searchVaultMemories.md) /
searchVaultMemoriesWithSize. Pass [MemoryVaultSearchOptions.subQueries](#subqueries)
(or use `createRecallTool`). The legacy [createMemoryVaultSearchTool](../functions/createMemoryVaultSearchTool.md)
executor still honors `decompose: "llm"` + `decomposeOptions` for eval
parity, then forwards facets into the LLM-free search path.

***

### ~~decomposeOptions?~~

> `optional` **decomposeOptions**: [`PortalLlmAuth`](PortalLlmAuth.md) & `object`

Defined in: [src/lib/memoryVault/searchTool.ts:226](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#226)

**Type Declaration**

**~~baseUrl?~~**

> `optional` **baseUrl**: `string`

**~~model?~~**

> `optional` **model**: `string`

**Deprecated**

719/B4 — see `decompose`. Ignored on the programmatic search
path; tool-layer rewrite still reads this from the search-tool options.
Prefer `RecallToolOptions.decomposeOptions` with `createRecallTool`.

***

### decryptLast?

> `optional` **decryptLast**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:252](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#252)

B2 decrypt-last — when set, build the ranking corpus from a
column-projected key scan + vector LRU (no whole-vault blob load),
decrypting content only for the admission window via
buildProjectedCorpus. Default OFF: the legacy whole-vault
prefix stays byte-identical.

***

### entityRanking?

> `optional` **entityRanking**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:236](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#236)

W5 graph lane — pre-built ranking of memory IDs by entity-overlap
score with the query. RRF-fused alongside cosine + BM25. Build via
rankByEntityOverlap or pass-through from `recall()` when
`RecallContext.entityCtx` is available.

***

### factTypes?

> `optional` **factTypes**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#157)

Typed memory (PR1) — when provided, only search memories of these fact
types. Applied at load time via `Q.oneOf` on the indexed `fact_type`
column. Omit for no type filter.

***

### factTypeWeights?

> `optional` **factTypeWeights**: `Record`<`string`, `number`>

Defined in: [src/lib/memoryVault/searchTool.ts:163](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#163)

PR5 — optional per-FactType score multiplier applied in the boost stage
(e.g. `{ identity: 1.2, ongoing_context: 0.8 }`). Empty/omitted = uniform
(no behavior change). See rankFusedVaultMemories.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:153](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#153)

When provided, only search memories in this folder (null for unfiled)

***

### includeArchived?

> `optional` **includeArchived**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#170)

PR5 — include archived (decayed) rows in the candidate load. Default false
(the baseVaultConditions choke point excludes them). retain()'s dedup
search sets this so a re-observed fact can merge into — and un-archive — an
archived row instead of creating a fresh duplicate.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#147)

Maximum number of results to return (default: 5)

***

### minSimilarity?

> `optional` **minSimilarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#149)

Minimum similarity threshold below which results are discarded (default: 0.1)

***

### mmr?

> `optional` **mmr**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:194](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#194)

Apply Maximal Marginal Relevance after the relevance pass. Default false.
Only effective on the rerank (async) pipeline.

***

### proofCountAlpha?

> `optional` **proofCountAlpha**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:200](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#200)

Proof-count log-boost scale (Hindsight α). Default 0.1.

***

### recency?

> `optional` **recency**: [`RecencyOptions`](RecencyOptions.md)

Defined in: [src/lib/memoryVault/searchTool.ts:189](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#189)

Recency decay curve overrides (per-year decay slope, floor, no-date multiplier).

***

### recencyAlpha?

> `optional` **recencyAlpha**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:187](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#187)

Recency boost slope applied in the fused ranker. Default 1.0.

***

### rerank?

> `optional` **rerank**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:181](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#181)

Run the cross-encoder reranker on the top-N V2 candidates. Default false.
When true, switches to the async pipeline (rankFusedVaultMemoriesAsync).

***

### rerankTopN?

> `optional` **rerankTopN**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#183)

Number of CE rerank candidates. Defaults to DEFAULT\_RERANK\_TOP\_N.

***

### rrfK?

> `optional` **rrfK**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:204](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#204)

RRF smoothing constant for lane fusion. Default 60.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#151)

When provided, only search memories with these scopes

***

### subQueries?

> `optional` **subQueries**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:212](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#212)

Pre-decomposed facet queries for the composite ranker (719/B4). When
≥2 are supplied (and embeddings are available), runs rankComposite
over them — no LLM call inside the search path. Callers that want LLM
rewrite (e.g. `createRecallTool`) call `decomposeQuery` first and pass
the facets here.

***

### supersessionBoost?

> `optional` **supersessionBoost**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:196](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#196)

Supersession score-gap transfer factor. Default 0.8.

***

### supersessionWindow?

> `optional` **supersessionWindow**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:198](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#198)

Hard cap on the supersession candidate window. Default 50.

***

### temporalRanking?

> `optional` **temporalRanking**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:244](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#244)

W6 temporal lane — pre-built ranking of memory IDs whose event-time
overlaps the resolved query window, ordered by overlap score
(descending). RRF-fused alongside cosine + BM25 + graph. Build via
`getMemoriesByEventTimeOp` + `scoreEventTimeOverlap`, or
pass-through from `recall()` when the query has a temporal phrase.

***

### useFusion?

> `optional` **useFusion**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#176)

Use the hybrid fusion ranker (cosine + BM25 + RRF + recency) instead of
cosine-only. Default true — new W1 pipeline. Pass false to fall back
to the legacy cosine-only ranker (e.g. for benchmark A/B comparison).
