# RecallOptions

Defined in: [src/lib/memory/types.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#102)

## Extended by

* [`ReflectOptions`](ReflectOptions.md)

## Properties

### bm25AdmissionDivisor?

> `optional` **bm25AdmissionDivisor**: `number`

Defined in: [src/lib/memory/types.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#183)

Divisor mapping BM25 scores to the admission floor. Default: 50.

***

### budget?

> `optional` **budget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#110)

Search depth. Default: 'low'.

***

### ceWeight?

> `optional` **ceWeight**: `number`

Defined in: [src/lib/memory/types.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#169)

Multiplicative cross-encoder blend weight. Default: 0.1.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#130)

Restrict chunk search to one conversation. Chunk-only.

***

### decomposeOptions?

> `optional` **decomposeOptions**: [`PortalLlmAuth`](PortalLlmAuth.md) & `object`

Defined in: [src/lib/memory/types.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#141)

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

Defined in: [src/lib/memory/types.ts:194](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#194)

Max neighbor entities expanded per hop. Default: 8.

***

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/memory/types.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#132)

Exclude one conversation from chunk search. Chunk-only.

***

### factTypes?

> `optional` **factTypes**: (`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`)\[]

Defined in: [src/lib/memory/types.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#121)

Typed memory (PR1) — restrict fact recall to these FactTypes. Optional
and no-op when unset (all types are eligible). Vault-only.

***

### factTypeWeights?

> `optional` **factTypeWeights**: `Partial`<`Record`<`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`, `number`>>

Defined in: [src/lib/memory/types.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#128)

PR5 — optional per-FactType score multiplier applied in the fusion boost
stage (e.g. boost `identity`/`constraint`, down-weight `ongoing_context`).
A type absent from the map (and untyped rows) uses 1.0, so an empty/omitted
map is a no-op (uniform weighting). Vault-only.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#116)

Vault folder filter. Vault-only.

***

### graphRefine?

> `optional` **graphRefine**: `boolean`

Defined in: [src/lib/memory/types.ts:205](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#205)

PR5 — enable LLM graph path-refinement: at each traversal hop a model picks
which neighbor entities to expand instead of pure co-occurrence ranking.
Opt-in (default false); only active on the `high` budget (needs the
`traverse` flag) AND when `decomposeOptions` is set (reuses that auth).
Falls back to deterministic co-occurrence order on any error. Adds ≤1 LLM
call per expansion hop.

***

### includeChunks?

> `optional` **includeChunks**: `boolean`

Defined in: [src/lib/memory/types.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#112)

Include source chunks for fact memories that have provenance. Default: false.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/types.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#106)

Max items returned. Default: 8.

***

### maxHops?

> `optional` **maxHops**: `number`

Defined in: [src/lib/memory/types.ts:192](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#192)

Total graph hops incl. the seed lookup (hop 1). Default: 1 (seed only).

***

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [src/lib/memory/types.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#108)

Token budget for the result; greedy-truncates after ranking. Not yet enforced; reserved for W1.

***

### minScore?

> `optional` **minScore**: `number`

Defined in: [src/lib/memory/types.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#134)

Drop results below this score. Default: 0.1 for facts, 0.5 for chunks (mirrors today's defaults).

***

### mmr?

> `optional` **mmr**: `boolean`

Defined in: [src/lib/memory/types.ts:175](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#175)

Apply MMR diversification after ranking (rerank pipeline only). Default: false.

***

### nodeBudget?

> `optional` **nodeBudget**: `number`

Defined in: [src/lib/memory/types.ts:196](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#196)

Hard cap on accumulated memory IDs across all hops. Default: 64.

***

### now?

> `optional` **now**: `number`

Defined in: [src/lib/memory/types.ts:152](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#152)

Reference "now" for resolving relative temporal phrases in the
query ("last week", "yesterday", "N days ago"). Default: `Date.now()`.
Override for back-dated evaluation harnesses (bench corpora dated
2021–2023) and for deterministic tests — otherwise the W6 lane
resolves windows in 2026 and never overlaps stored event\_time.

***

### onDiagnostics()?

> `optional` **onDiagnostics**: (`diagnostics`: [`RecallDiagnostics`](RecallDiagnostics.md)) => `void`

Defined in: [src/lib/memory/types.ts:160](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#160)

Best-effort observability hook. Called once per `recall()` with per-lane
timings, lane counts, and soft-degradation signals — the raw material for
tuning latency/quality and for wiring recall telemetry to PostHog. Invoked
synchronously just before `recall()` returns; a throwing callback is
swallowed (diagnostics must never break retrieval). Off unless provided.

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

`diagnostics`

</td>
<td>

[`RecallDiagnostics`](RecallDiagnostics.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### proofCountAlpha?

> `optional` **proofCountAlpha**: `number`

Defined in: [src/lib/memory/types.ts:181](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#181)

Proof-count log-boost scale. Default: 0.1.

***

### recency?

> `optional` **recency**: [`RecencyOptions`](RecencyOptions.md)

Defined in: [src/lib/memory/types.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#173)

Recency decay curve overrides (per-year decay slope, floor, no-date multiplier).

***

### recencyAlpha?

> `optional` **recencyAlpha**: `number`

Defined in: [src/lib/memory/types.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#171)

Recency boost slope in the fused ranker. Default: 1.0.

***

### rerankTopN?

> `optional` **rerankTopN**: `number`

Defined in: [src/lib/memory/types.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#167)

Number of candidates fed to the cross-encoder rerank stage. Default: 30.

***

### rrfK?

> `optional` **rrfK**: `number`

Defined in: [src/lib/memory/types.ts:185](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#185)

RRF smoothing constant for lane fusion (facts × chunks and side lanes). Default: 60.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/types.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#114)

Vault scope filter. Vault-only.

***

### supersessionBoost?

> `optional` **supersessionBoost**: `number`

Defined in: [src/lib/memory/types.ts:177](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#177)

Supersession score-gap transfer factor. Default: 0.8.

***

### supersessionWindow?

> `optional` **supersessionWindow**: `number`

Defined in: [src/lib/memory/types.ts:179](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#179)

Hard cap on the supersession candidate window. Default: 50.

***

### types?

> `optional` **types**: [`MemoryKind`](../type-aliases/MemoryKind.md)\[]

Defined in: [src/lib/memory/types.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#104)

Which kinds to search. Default: \['fact'].
