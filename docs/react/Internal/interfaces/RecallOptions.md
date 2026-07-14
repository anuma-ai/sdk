# RecallOptions

Defined in: [src/lib/memory/types.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#97)

## Extended by

* [`ReflectOptions`](ReflectOptions.md)

## Properties

### bm25AdmissionDivisor?

> `optional` **bm25AdmissionDivisor**: `number`

Defined in: [src/lib/memory/types.ts:163](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#163)

Divisor mapping BM25 scores to the admission floor. Default: 50.

***

### budget?

> `optional` **budget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#105)

Search depth. Default: 'low'.

***

### ceWeight?

> `optional` **ceWeight**: `number`

Defined in: [src/lib/memory/types.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#149)

Multiplicative cross-encoder blend weight. Default: 0.1.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#118)

Restrict chunk search to one conversation. Chunk-only.

***

### decomposeOptions?

> `optional` **decomposeOptions**: [`PortalLlmAuth`](PortalLlmAuth.md) & `object`

Defined in: [src/lib/memory/types.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#129)

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

### entityFanout?

> `optional` **entityFanout**: `number`

Defined in: [src/lib/memory/types.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#174)

Max neighbor entities expanded per hop. Default: 8.

***

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/memory/types.ts:120](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#120)

Exclude one conversation from chunk search. Chunk-only.

***

### factTypes?

> `optional` **factTypes**: (`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`)\[]

Defined in: [src/lib/memory/types.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#116)

Typed memory (PR1) — restrict fact recall to these FactTypes. Optional
and no-op when unset (all types are eligible). Vault-only.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#111)

Vault folder filter. Vault-only.

***

### includeChunks?

> `optional` **includeChunks**: `boolean`

Defined in: [src/lib/memory/types.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#107)

Include source chunks for fact memories that have provenance. Default: false.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/types.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#101)

Max items returned. Default: 8.

***

### maxHops?

> `optional` **maxHops**: `number`

Defined in: [src/lib/memory/types.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#172)

Total graph hops incl. the seed lookup (hop 1). Default: 1 (seed only).

***

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [src/lib/memory/types.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#103)

Token budget for the result; greedy-truncates after ranking. Not yet enforced; reserved for W1.

***

### minScore?

> `optional` **minScore**: `number`

Defined in: [src/lib/memory/types.ts:122](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#122)

Drop results below this score. Default: 0.1 for facts, 0.5 for chunks (mirrors today's defaults).

***

### mmr?

> `optional` **mmr**: `boolean`

Defined in: [src/lib/memory/types.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#155)

Apply MMR diversification after ranking (rerank pipeline only). Default: false.

***

### nodeBudget?

> `optional` **nodeBudget**: `number`

Defined in: [src/lib/memory/types.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#176)

Hard cap on accumulated memory IDs across all hops. Default: 64.

***

### now?

> `optional` **now**: `number`

Defined in: [src/lib/memory/types.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#140)

Reference "now" for resolving relative temporal phrases in the
query ("last week", "yesterday", "N days ago"). Default: `Date.now()`.
Override for back-dated evaluation harnesses (bench corpora dated
2021–2023) and for deterministic tests — otherwise the W6 lane
resolves windows in 2026 and never overlaps stored event\_time.

***

### proofCountAlpha?

> `optional` **proofCountAlpha**: `number`

Defined in: [src/lib/memory/types.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#161)

Proof-count log-boost scale. Default: 0.1.

***

### recency?

> `optional` **recency**: [`RecencyOptions`](RecencyOptions.md)

Defined in: [src/lib/memory/types.ts:153](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#153)

Recency decay curve overrides (per-year decay slope, floor, no-date multiplier).

***

### recencyAlpha?

> `optional` **recencyAlpha**: `number`

Defined in: [src/lib/memory/types.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#151)

Recency boost slope in the fused ranker. Default: 1.0.

***

### rerankTopN?

> `optional` **rerankTopN**: `number`

Defined in: [src/lib/memory/types.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#147)

Number of candidates fed to the cross-encoder rerank stage. Default: 30.

***

### rrfK?

> `optional` **rrfK**: `number`

Defined in: [src/lib/memory/types.ts:165](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#165)

RRF smoothing constant for lane fusion (facts × chunks and side lanes). Default: 60.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/types.ts:109](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#109)

Vault scope filter. Vault-only.

***

### supersessionBoost?

> `optional` **supersessionBoost**: `number`

Defined in: [src/lib/memory/types.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#157)

Supersession score-gap transfer factor. Default: 0.8.

***

### supersessionWindow?

> `optional` **supersessionWindow**: `number`

Defined in: [src/lib/memory/types.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#159)

Hard cap on the supersession candidate window. Default: 50.

***

### types?

> `optional` **types**: [`MemoryKind`](../type-aliases/MemoryKind.md)\[]

Defined in: [src/lib/memory/types.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#99)

Which kinds to search. Default: \['fact'].
