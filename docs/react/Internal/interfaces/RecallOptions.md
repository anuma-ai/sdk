# RecallOptions

Defined in: [src/lib/memory/types.ts:109](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#109)

## Extended by

* [`ReflectOptions`](ReflectOptions.md)

## Properties

### bm25AdmissionDivisor?

> `optional` **bm25AdmissionDivisor**: `number`

Defined in: [src/lib/memory/types.ts:190](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#190)

Divisor mapping BM25 scores to the admission floor. Default: 50.

***

### budget?

> `optional` **budget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#117)

Search depth. Default: 'low'.

***

### ceWeight?

> `optional` **ceWeight**: `number`

Defined in: [src/lib/memory/types.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#176)

Multiplicative cross-encoder blend weight. Default: 0.1.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#137)

Restrict chunk search to one conversation. Chunk-only.

***

### decomposeOptions?

> `optional` **decomposeOptions**: [`PortalLlmAuth`](PortalLlmAuth.md) & `object`

Defined in: [src/lib/memory/types.ts:148](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#148)

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

### decryptLast?

> `optional` **decryptLast**: `boolean`

Defined in: [src/lib/memory/types.ts:199](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#199)

Decrypt vault memory content only for the top-N ranked candidates
instead of the whole vault. Forwarded verbatim to the vault search
pipeline's `MemoryVaultSearchOptions`. Default: off (legacy
whole-vault decrypt path).

***

### entityFanout?

> `optional` **entityFanout**: `number`

Defined in: [src/lib/memory/types.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#208)

Max neighbor entities expanded per hop. Default: 8.

***

### entityVocabulary?

> `optional` **entityVocabulary**: `"auto"` | `"off"`

Defined in: [src/lib/memory/types.ts:231](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#231)

W5 vocabulary-grounded query resolution. `"auto"` (the default) resolves
query tokens against the vault's stored entity names when the entity table
is readable and the context is single-user; `"off"` forces the
deterministic heuristic extractor and issues no vocabulary read at all.

The kill switch for the tier. Grounding roughly triples how often the graph
lane finds something, and correspondingly lowers its precision — it fires on
queries where it used to stay quiet. Turn it off per call if that trade is
wrong for a given surface.

***

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/memory/types.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#139)

Exclude one conversation from chunk search. Chunk-only.

***

### factTypes?

> `optional` **factTypes**: (`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`)\[]

Defined in: [src/lib/memory/types.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#128)

Typed memory (PR1) — restrict fact recall to these FactTypes. Optional
and no-op when unset (all types are eligible). Vault-only.

***

### factTypeWeights?

> `optional` **factTypeWeights**: `Partial`<`Record`<`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`, `number`>>

Defined in: [src/lib/memory/types.ts:135](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#135)

PR5 — optional per-FactType score multiplier applied in the fusion boost
stage (e.g. boost `identity`/`constraint`, down-weight `ongoing_context`).
A type absent from the map (and untyped rows) uses 1.0, so an empty/omitted
map is a no-op (uniform weighting). Vault-only.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#123)

Vault folder filter. Vault-only.

***

### graphRefine?

> `optional` **graphRefine**: `boolean`

Defined in: [src/lib/memory/types.ts:219](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#219)

PR5 — enable LLM graph path-refinement: at each traversal hop a model picks
which neighbor entities to expand instead of pure co-occurrence ranking.
Opt-in (default false); only active on the `high` budget (needs the
`traverse` flag) AND when `decomposeOptions` is set (reuses that auth).
Falls back to deterministic co-occurrence order on any error. Adds ≤1 LLM
call per expansion hop.

***

### includeChunks?

> `optional` **includeChunks**: `boolean`

Defined in: [src/lib/memory/types.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#119)

Include source chunks for fact memories that have provenance. Default: false.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/types.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#113)

Max items returned. Default: 8.

***

### maxHops?

> `optional` **maxHops**: `number`

Defined in: [src/lib/memory/types.ts:206](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#206)

Total graph hops incl. the seed lookup (hop 1). Default: 1 (seed only).

***

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [src/lib/memory/types.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#115)

Token budget for the result; greedy-truncates after ranking. Not yet enforced; reserved for W1.

***

### minScore?

> `optional` **minScore**: `number`

Defined in: [src/lib/memory/types.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#141)

Drop results below this score. Default: 0.1 for facts, 0.5 for chunks (mirrors today's defaults).

***

### mmr?

> `optional` **mmr**: `boolean`

Defined in: [src/lib/memory/types.ts:182](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#182)

Apply MMR diversification after ranking (rerank pipeline only). Default: false.

***

### nodeBudget?

> `optional` **nodeBudget**: `number`

Defined in: [src/lib/memory/types.ts:210](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#210)

Hard cap on accumulated memory IDs across all hops. Default: 64.

***

### now?

> `optional` **now**: `number`

Defined in: [src/lib/memory/types.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#159)

Reference "now" for resolving relative temporal phrases in the
query ("last week", "yesterday", "N days ago"). Default: `Date.now()`.
Override for back-dated evaluation harnesses (bench corpora dated
2021–2023) and for deterministic tests — otherwise the W6 lane
resolves windows in 2026 and never overlaps stored event\_time.

***

### onDiagnostics()?

> `optional` **onDiagnostics**: (`diagnostics`: [`RecallDiagnostics`](RecallDiagnostics.md)) => `void`

Defined in: [src/lib/memory/types.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#167)

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

Defined in: [src/lib/memory/types.ts:188](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#188)

Proof-count log-boost scale. Default: 0.1.

***

### recency?

> `optional` **recency**: [`RecencyOptions`](RecencyOptions.md)

Defined in: [src/lib/memory/types.ts:180](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#180)

Recency decay curve overrides (per-year decay slope, floor, no-date multiplier).

***

### recencyAlpha?

> `optional` **recencyAlpha**: `number`

Defined in: [src/lib/memory/types.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#178)

Recency boost slope in the fused ranker. Default: 1.0.

***

### rerankTopN?

> `optional` **rerankTopN**: `number`

Defined in: [src/lib/memory/types.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#174)

Number of candidates fed to the cross-encoder rerank stage. Default: 30.

***

### rrfK?

> `optional` **rrfK**: `number`

Defined in: [src/lib/memory/types.ts:192](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#192)

RRF smoothing constant for lane fusion (facts × chunks and side lanes). Default: 60.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/types.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#121)

Vault scope filter. Vault-only.

***

### supersessionBoost?

> `optional` **supersessionBoost**: `number`

Defined in: [src/lib/memory/types.ts:184](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#184)

Supersession score-gap transfer factor. Default: 0.8.

***

### supersessionWindow?

> `optional` **supersessionWindow**: `number`

Defined in: [src/lib/memory/types.ts:186](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#186)

Hard cap on the supersession candidate window. Default: 50.

***

### types?

> `optional` **types**: [`MemoryKind`](../type-aliases/MemoryKind.md)\[]

Defined in: [src/lib/memory/types.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#111)

Which kinds to search. Default: \['fact'].
