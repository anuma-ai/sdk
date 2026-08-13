# RecallOptions

Defined in: [src/lib/memory/types.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#110)

## Extended by

* [`ReflectOptions`](ReflectOptions.md)

## Properties

### bm25AdmissionDivisor?

> `optional` **bm25AdmissionDivisor**: `number`

Defined in: [src/lib/memory/types.ts:210](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#210)

Divisor mapping BM25 scores to the admission floor. Default: 50.

***

### budget?

> `optional` **budget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#118)

Search depth. Default: 'low'.

***

### ceWeight?

> `optional` **ceWeight**: `number`

Defined in: [src/lib/memory/types.ts:196](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#196)

Multiplicative cross-encoder blend weight. Default: 0.1.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:138](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#138)

Restrict chunk search to one conversation. Chunk-only.

***

### decomposeOptions?

> `optional` **decomposeOptions**: [`PortalLlmAuth`](PortalLlmAuth.md) & `object`

Defined in: [src/lib/memory/types.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#167)

Auth + endpoint for optional LLM helpers that reuse portal auth —
currently [RecallOptions.graphRefine](#graphrefine) neighbor selection.
Query decomposition is **not** driven by this field inside `recall()`
(719/B4); [createRecallTool](../functions/createRecallTool.md) reads the same shape from
`RecallToolOptions.decomposeOptions` for tool-layer rewrite.

Callers that still pass `{ budget: 'high', decomposeOptions }` without
[RecallOptions.subQueries](#subqueries) keep compiling but no longer rewrite —
`recall()` emits `decompose-moved` on [RecallDiagnostics.degraded](RecallDiagnostics.md#degraded)
so upgrades without a changelog read still leave a telemetry breadcrumb.

Auth is the dual pattern — one of `apiKey` / `getToken` is required;
see [PortalLlmAuth](PortalLlmAuth.md).

**Type Declaration**

**baseUrl?**

> `optional` **baseUrl**: `string`

**model?**

> `optional` **model**: `string`

***

### decryptLast?

> `optional` **decryptLast**: `boolean`

Defined in: [src/lib/memory/types.ts:219](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#219)

Decrypt vault memory content only for the top-N ranked candidates
instead of the whole vault. Forwarded verbatim to the vault search
pipeline's `MemoryVaultSearchOptions`. Default: off (legacy
whole-vault decrypt path).

***

### entityFanout?

> `optional` **entityFanout**: `number`

Defined in: [src/lib/memory/types.ts:228](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#228)

Max neighbor entities expanded per hop. Default: 8.

***

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/memory/types.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#140)

Exclude one conversation from chunk search. Chunk-only.

***

### factTypes?

> `optional` **factTypes**: (`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`)\[]

Defined in: [src/lib/memory/types.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#129)

Typed memory (PR1) — restrict fact recall to these FactTypes. Optional
and no-op when unset (all types are eligible). Vault-only.

***

### factTypeWeights?

> `optional` **factTypeWeights**: `Partial`<`Record`<`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`, `number`>>

Defined in: [src/lib/memory/types.ts:136](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#136)

PR5 — optional per-FactType score multiplier applied in the fusion boost
stage (e.g. boost `identity`/`constraint`, down-weight `ongoing_context`).
A type absent from the map (and untyped rows) uses 1.0, so an empty/omitted
map is a no-op (uniform weighting). Vault-only.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#124)

Vault folder filter. Vault-only.

***

### graphRefine?

> `optional` **graphRefine**: `boolean`

Defined in: [src/lib/memory/types.ts:239](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#239)

PR5 — enable LLM graph path-refinement: at each traversal hop a model picks
which neighbor entities to expand instead of pure co-occurrence ranking.
Opt-in (default false); only active on the `high` budget (needs the
`traverse` flag) AND when `decomposeOptions` is set (reuses that auth).
Falls back to deterministic co-occurrence order on any error. Adds ≤1 LLM
call per expansion hop.

***

### includeChunks?

> `optional` **includeChunks**: `boolean`

Defined in: [src/lib/memory/types.ts:120](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#120)

Include source chunks for fact memories that have provenance. Default: false.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/types.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#114)

Max items returned. Default: 8.

***

### maxHops?

> `optional` **maxHops**: `number`

Defined in: [src/lib/memory/types.ts:226](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#226)

Total graph hops incl. the seed lookup (hop 1). Default: 1 (seed only).

***

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [src/lib/memory/types.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#116)

Token budget for the result; greedy-truncates after ranking. Not yet enforced; reserved for W1.

***

### minScore?

> `optional` **minScore**: `number`

Defined in: [src/lib/memory/types.ts:142](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#142)

Drop results below this score. Default: 0.1 for facts, 0.5 for chunks (mirrors today's defaults).

***

### mmr?

> `optional` **mmr**: `boolean`

Defined in: [src/lib/memory/types.ts:202](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#202)

Apply MMR diversification after ranking (rerank pipeline only). Default: false.

***

### nodeBudget?

> `optional` **nodeBudget**: `number`

Defined in: [src/lib/memory/types.ts:230](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#230)

Hard cap on accumulated memory IDs across all hops. Default: 64.

***

### now?

> `optional` **now**: `number`

Defined in: [src/lib/memory/types.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#178)

Reference "now" for resolving relative temporal phrases in the
query ("last week", "yesterday", "N days ago"). Default: `Date.now()`.
Override for back-dated evaluation harnesses (bench corpora dated
2021–2023) and for deterministic tests — otherwise the W6 lane
resolves windows in 2026 and never overlaps stored event\_time.

***

### onDiagnostics()?

> `optional` **onDiagnostics**: (`diagnostics`: [`RecallDiagnostics`](RecallDiagnostics.md)) => `void`

Defined in: [src/lib/memory/types.ts:186](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#186)

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

Defined in: [src/lib/memory/types.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#208)

Proof-count log-boost scale. Default: 0.1.

***

### recency?

> `optional` **recency**: [`RecencyOptions`](RecencyOptions.md)

Defined in: [src/lib/memory/types.ts:200](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#200)

Recency decay curve overrides (per-year decay slope, floor, no-date multiplier).

***

### recencyAlpha?

> `optional` **recencyAlpha**: `number`

Defined in: [src/lib/memory/types.ts:198](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#198)

Recency boost slope in the fused ranker. Default: 1.0.

***

### rerankTopN?

> `optional` **rerankTopN**: `number`

Defined in: [src/lib/memory/types.ts:194](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#194)

Number of candidates fed to the cross-encoder rerank stage. Default: 5
(`DEFAULT_RERANK_TOP_N`); was 30 until 2026-08-13 — see anuma-ai/sdk#845.

***

### rrfK?

> `optional` **rrfK**: `number`

Defined in: [src/lib/memory/types.ts:212](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#212)

RRF smoothing constant for lane fusion (facts × chunks and side lanes). Default: 60.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/types.ts:122](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#122)

Vault scope filter. Vault-only.

***

### subQueries?

> `optional` **subQueries**: `string`\[]

Defined in: [src/lib/memory/types.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#151)

Pre-decomposed facet queries for the composite ranker. When ≥2 are
supplied, the vault lane runs `rankComposite` over them (no LLM call
inside `recall()` — 719/B4). Callers that still want LLM rewrite
(e.g. [createRecallTool](../functions/createRecallTool.md) at `budget: 'high'`) call
`decomposeQuery` themselves and pass the result here. A single entry
(or omitting this) keeps the single-query path.

***

### supersessionBoost?

> `optional` **supersessionBoost**: `number`

Defined in: [src/lib/memory/types.ts:204](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#204)

Supersession score-gap transfer factor. Default: 0.8.

***

### supersessionWindow?

> `optional` **supersessionWindow**: `number`

Defined in: [src/lib/memory/types.ts:206](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#206)

Hard cap on the supersession candidate window. Default: 50.

***

### types?

> `optional` **types**: [`MemoryKind`](../type-aliases/MemoryKind.md)\[]

Defined in: [src/lib/memory/types.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#112)

Which kinds to search. Default: \['fact'].
