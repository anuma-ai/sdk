# RecallOptions

Defined in: [src/lib/memory/types.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#88)

## Extended by

* [`ReflectOptions`](ReflectOptions.md)

## Properties

### bm25AdmissionDivisor?

> `optional` **bm25AdmissionDivisor**: `number`

Defined in: [src/lib/memory/types.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#149)

Divisor mapping BM25 scores to the admission floor. Default: 50.

***

### budget?

> `optional` **budget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#96)

Search depth. Default: 'low'.

***

### ceWeight?

> `optional` **ceWeight**: `number`

Defined in: [src/lib/memory/types.ts:135](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#135)

Multiplicative cross-encoder blend weight. Default: 0.1.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#104)

Restrict chunk search to one conversation. Chunk-only.

***

### decomposeOptions?

> `optional` **decomposeOptions**: [`PortalLlmAuth`](PortalLlmAuth.md) & `object`

Defined in: [src/lib/memory/types.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#115)

Auth + endpoint for the LLM-based query decomposition pass. Without
these, decompose is skipped even at `budget: 'high'`. Mirrors the
shape used by `searchVaultMemories`. Auth is the dual pattern — one
of `apiKey` / `getToken` is required; see [PortalLlmAuth](PortalLlmAuth.md).

**Type Declaration**

**baseUrl?**

> `optional` **baseUrl**: `string`

**model?**

> `optional` **model**: `string`

***

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/memory/types.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#106)

Exclude one conversation from chunk search. Chunk-only.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#102)

Vault folder filter. Vault-only.

***

### includeChunks?

> `optional` **includeChunks**: `boolean`

Defined in: [src/lib/memory/types.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#98)

Include source chunks for fact memories that have provenance. Default: false.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/types.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#92)

Max items returned. Default: 8.

***

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [src/lib/memory/types.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#94)

Token budget for the result; greedy-truncates after ranking. Not yet enforced; reserved for W1.

***

### minScore?

> `optional` **minScore**: `number`

Defined in: [src/lib/memory/types.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#108)

Drop results below this score. Default: 0.1 for facts, 0.5 for chunks (mirrors today's defaults).

***

### mmr?

> `optional` **mmr**: `boolean`

Defined in: [src/lib/memory/types.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#141)

Apply MMR diversification after ranking (rerank pipeline only). Default: false.

***

### now?

> `optional` **now**: `number`

Defined in: [src/lib/memory/types.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#126)

Reference "now" for resolving relative temporal phrases in the
query ("last week", "yesterday", "N days ago"). Default: `Date.now()`.
Override for back-dated evaluation harnesses (bench corpora dated
2021–2023) and for deterministic tests — otherwise the W6 lane
resolves windows in 2026 and never overlaps stored event\_time.

***

### proofCountAlpha?

> `optional` **proofCountAlpha**: `number`

Defined in: [src/lib/memory/types.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#147)

Proof-count log-boost scale. Default: 0.1.

***

### recency?

> `optional` **recency**: [`RecencyOptions`](RecencyOptions.md)

Defined in: [src/lib/memory/types.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#139)

Recency decay curve overrides (per-year decay slope, floor, no-date multiplier).

***

### recencyAlpha?

> `optional` **recencyAlpha**: `number`

Defined in: [src/lib/memory/types.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#137)

Recency boost slope in the fused ranker. Default: 1.0.

***

### rerankTopN?

> `optional` **rerankTopN**: `number`

Defined in: [src/lib/memory/types.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#133)

Number of candidates fed to the cross-encoder rerank stage. Default: 30.

***

### rrfK?

> `optional` **rrfK**: `number`

Defined in: [src/lib/memory/types.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#151)

RRF smoothing constant for lane fusion (facts × chunks and side lanes). Default: 60.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/types.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#100)

Vault scope filter. Vault-only.

***

### supersessionBoost?

> `optional` **supersessionBoost**: `number`

Defined in: [src/lib/memory/types.ts:143](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#143)

Supersession score-gap transfer factor. Default: 0.8.

***

### supersessionWindow?

> `optional` **supersessionWindow**: `number`

Defined in: [src/lib/memory/types.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#145)

Hard cap on the supersession candidate window. Default: 50.

***

### types?

> `optional` **types**: [`MemoryKind`](../type-aliases/MemoryKind.md)\[]

Defined in: [src/lib/memory/types.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#90)

Which kinds to search. Default: \['fact'].
