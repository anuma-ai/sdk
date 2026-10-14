# MemoryVaultSearchOptions

Defined in: [src/lib/memoryVault/searchTool.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#99)

Options for the vault search tool.

## Properties

### admitFactor?

> `optional` **admitFactor**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:233](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#233)

Admission window multiplier for decrypt-last (`limit * admitFactor`). Default 3.

***

### admitFloor?

> `optional` **admitFloor**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:235](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#235)

Admission window floor for decrypt-last. Default 30.

***

### bm25AdmissionDivisor?

> `optional` **bm25AdmissionDivisor**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#164)

Divisor mapping BM25 scores to the admission floor (`bm25 / divisor`). Default 50.

***

### ceWeight?

> `optional` **ceWeight**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#141)

Multiplicative cross-encoder blend weight. Default 0.1. Only used when `rerank` is true.

***

### ~~decompose?~~

> `optional` **decompose**: `"off"` | `"llm"`

Defined in: [src/lib/memoryVault/searchTool.ts:182](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#182)

**Deprecated**

719/B4 — ignored by [searchVaultMemories](../functions/searchVaultMemories.md) /
searchVaultMemoriesWithSize. Pass [MemoryVaultSearchOptions.subQueries](#subqueries)
(or use `createRecallTool`). The legacy [createMemoryVaultSearchTool](../functions/createMemoryVaultSearchTool.md)
executor still honors `decompose: "llm"` + `decomposeOptions` for eval
parity, then forwards facets into the LLM-free search path.

***

### ~~decomposeOptions?~~

> `optional` **decomposeOptions**: [`PortalLlmAuth`](PortalLlmAuth.md) & `object`

Defined in: [src/lib/memoryVault/searchTool.ts:188](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#188)

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

Defined in: [src/lib/memoryVault/searchTool.ts:214](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#214)

B2 decrypt-last — when set, build the ranking corpus from a
column-projected key scan + vector LRU (no whole-vault blob load),
decrypting content only for the admission window via
buildProjectedCorpus. Default OFF: the legacy whole-vault
prefix stays byte-identical.

***

### entityRanking?

> `optional` **entityRanking**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:198](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#198)

W5 graph lane — pre-built ranking of memory IDs by entity-overlap
score with the query. RRF-fused alongside cosine + BM25. Build via
rankByEntityOverlap or pass-through from `recall()` when
`RecallContext.entityCtx` is available.

***

### factTypes?

> `optional` **factTypes**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#112)

Typed memory (PR1) — when provided, only search memories of these fact
types. Applied at load time via `Q.oneOf` on the indexed `fact_type`
column. Omit for no type filter.

***

### factTypeWeights?

> `optional` **factTypeWeights**: `Record`<`string`, `number`>

Defined in: [src/lib/memoryVault/searchTool.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#119)

PR5 — optional per-FactType score multiplier applied in the boost stage
(e.g. `{ identity: 1.2, ongoing_context: 0.8 }`). Empty/omitted = uniform
(no behavior change). See rankFusedVaultMemories.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#108)

When provided, only search memories in this folder (null for unfiled)

***

### includeArchived?

> `optional` **includeArchived**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#126)

PR5 — include archived (decayed) rows in the candidate load. Default false
(the baseVaultConditions choke point excludes them). retain()'s dedup
search sets this so a re-observed fact can merge into — and un-archive — an
archived row instead of creating a fresh duplicate.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#102)

Maximum number of results to return (default: 5)

***

### memoryIds?

> `optional` **memoryIds**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#113)

***

### minSimilarity?

> `optional` **minSimilarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#104)

Minimum similarity threshold below which results are discarded (default: 0.1)

***

### mmr?

> `optional` **mmr**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:156](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#156)

Apply Maximal Marginal Relevance after the relevance pass. Default false.
Only effective on the rerank (async) pipeline.

***

### onCandidateCount()?

> `optional` **onCandidateCount**: (`count`: `number`) => `void`

Defined in: [src/lib/memoryVault/searchTool.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#100)

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`count`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### proofCountAlpha?

> `optional` **proofCountAlpha**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:162](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#162)

Proof-count log-boost scale (Hindsight α). Default 0.1.

***

### queryEmbedding?

> `optional` **queryEmbedding**: `number`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:223](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#223)

A vector the caller already computed for THIS query, with the model named in
`embeddingOptions`. When set, the search uses it instead of embedding the
query a second time — `recall()` embeds once for its chunk lane and passes
the vector here. An EMPTY array means the caller's embed failed: the search
degrades to BM25 (reported as embeddings unavailable) without re-trying a
provider that just failed.

***

### queryEmbedTotalTimeoutMs?

> `optional` **queryEmbedTotalTimeoutMs**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:231](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#231)

Overall deadline, in ms, for embedding the QUERY (token read + all attempts

* backoff). On expiry the search degrades to BM25 and reports embeddings
  unavailable. Unset = only the per-attempt deadlines apply. `recall()` sets
  it (default 8000 — see `RecallOptions.queryEmbedTotalTimeoutMs`); row
  (re)embeds are never subject to it.

***

### recency?

> `optional` **recency**: [`RecencyOptions`](RecencyOptions.md)

Defined in: [src/lib/memoryVault/searchTool.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#151)

Recency decay curve overrides (per-year decay slope, floor, no-date multiplier).

***

### recencyAlpha?

> `optional` **recencyAlpha**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#149)

Recency boost slope applied in the fused ranker. Default 1.0.

***

### rerank?

> `optional` **rerank**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#137)

Run the cross-encoder reranker on the top-N V2 candidates. Default false.
When true, switches to the async pipeline (rankFusedVaultMemoriesAsync).

***

### rerankLoadTimeoutMs?

> `optional` **rerankLoadTimeoutMs**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#147)

Max ms a rerank waits for the cross-encoder's FIRST model load (default
10000\). On expiry the search degrades to the fused ranking and reports
`reranked: false`; the load continues in the background for later calls.

***

### rerankTopN?

> `optional` **rerankTopN**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#139)

Number of CE rerank candidates. Default 5 (DEFAULT\_RERANK\_TOP\_N).

***

### rrfK?

> `optional` **rrfK**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#166)

RRF smoothing constant for lane fusion. Default 60.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#106)

When provided, only search memories with these scopes

***

### subQueries?

> `optional` **subQueries**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#174)

Pre-decomposed facet queries for the composite ranker (719/B4). When
≥2 are supplied (and embeddings are available), runs rankComposite
over them — no LLM call inside the search path. Callers that want LLM
rewrite (e.g. `createRecallTool`) call `decomposeQuery` first and pass
the facets here.

***

### supersessionBoost?

> `optional` **supersessionBoost**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:158](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#158)

Supersession score-gap transfer factor. Default 0.8.

***

### supersessionWindow?

> `optional` **supersessionWindow**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:160](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#160)

Hard cap on the supersession candidate window. Default 50.

***

### temporalRanking?

> `optional` **temporalRanking**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:206](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#206)

W6 temporal lane — pre-built ranking of memory IDs whose event-time
overlaps the resolved query window, ordered by overlap score
(descending). RRF-fused alongside cosine + BM25 + graph. Build via
`getMemoriesByEventTimeOp` + `scoreEventTimeOverlap`, or
pass-through from `recall()` when the query has a temporal phrase.

***

### useFusion?

> `optional` **useFusion**: `boolean`

Defined in: [src/lib/memoryVault/searchTool.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#132)

Use the hybrid fusion ranker (cosine + BM25 + RRF + recency) instead of
cosine-only. Default true — new W1 pipeline. Pass false to fall back
to the legacy cosine-only ranker (e.g. for benchmark A/B comparison).
