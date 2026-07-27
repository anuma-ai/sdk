# ReflectOptions

Defined in: [src/lib/memory/reflect.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#54)

Options for [reflect](../functions/reflect.md). Auth for the answer LLM is the dual pattern
inherited from [PortalLlmAuth](PortalLlmAuth.md) — one of `apiKey` / `getToken` is
required at runtime; `apiKey` wins when both are set.

## Extends

* [`RecallOptions`](RecallOptions.md).[`PortalLlmAuth`](PortalLlmAuth.md)

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/memory/portalLlm.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#85)

Direct API key — sent as `x-api-key` (server-side / CLI usage). Wins when both are provided.

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`apiKey`](PortalLlmAuth.md#apikey)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memory/reflect.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#62)

Endpoint for the answer LLM.

***

### bm25AdmissionDivisor?

> `optional` **bm25AdmissionDivisor**: `number`

Defined in: [src/lib/memory/types.ts:190](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#190)

Divisor mapping BM25 scores to the admission floor. Default: 50.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`bm25AdmissionDivisor`](RecallOptions.md#bm25admissiondivisor)

***

### budget?

> `optional` **budget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#117)

Search depth. Default: 'low'.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`budget`](RecallOptions.md#budget)

***

### ceWeight?

> `optional` **ceWeight**: `number`

Defined in: [src/lib/memory/types.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#176)

Multiplicative cross-encoder blend weight. Default: 0.1.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`ceWeight`](RecallOptions.md#ceweight)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#137)

Restrict chunk search to one conversation. Chunk-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`conversationId`](RecallOptions.md#conversationid)

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

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`decomposeOptions`](RecallOptions.md#decomposeoptions)

***

### decryptLast?

> `optional` **decryptLast**: `boolean`

Defined in: [src/lib/memory/types.ts:199](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#199)

Decrypt vault memory content only for the top-N ranked candidates
instead of the whole vault. Forwarded verbatim to the vault search
pipeline's `MemoryVaultSearchOptions`. Default: off (legacy
whole-vault decrypt path).

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`decryptLast`](RecallOptions.md#decryptlast)

***

### entityFanout?

> `optional` **entityFanout**: `number`

Defined in: [src/lib/memory/types.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#208)

Max neighbor entities expanded per hop. Default: 8.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`entityFanout`](RecallOptions.md#entityfanout)

***

### entityVocabulary?

> `optional` **entityVocabulary**: `"auto"` | `"off"`

Defined in: [src/lib/memory/types.ts:238](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#238)

W5 vocabulary-grounded query resolution. **Defaults to `"off"` — this is
opt-in.** Pass `"auto"` to turn it on; until you do, recall runs the
deterministic heuristic extractor and issues no vocabulary read at all.

`"auto"` resolves query tokens against the vault's stored entity names,
when the entity table is readable and `entityCtx.singleTenant` is declared.
It roughly triples how often the graph lane finds something (lane
activation 25% to 74% on the benchmark corpus, 2.33x the lane's RRF
contribution) and correspondingly lowers its precision, 46% to 24%, because
it fires on queries where the lane used to stay quiet — including ones it
should have.

It is off by default because every one of those numbers measures the lane
in isolation. None of them measure what a user receives after the lane is
RRF-fused with the cosine/BM25 head and reranked. Opt in per surface where
more recall is worth more noise in context; leave it off where it is not.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`entityVocabulary`](RecallOptions.md#entityvocabulary)

***

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/memory/types.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#139)

Exclude one conversation from chunk search. Chunk-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`excludeConversationId`](RecallOptions.md#excludeconversationid)

***

### factTypes?

> `optional` **factTypes**: (`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`)\[]

Defined in: [src/lib/memory/types.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#128)

Typed memory (PR1) — restrict fact recall to these FactTypes. Optional
and no-op when unset (all types are eligible). Vault-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`factTypes`](RecallOptions.md#facttypes)

***

### factTypeWeights?

> `optional` **factTypeWeights**: `Partial`<`Record`<`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`, `number`>>

Defined in: [src/lib/memory/types.ts:135](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#135)

PR5 — optional per-FactType score multiplier applied in the fusion boost
stage (e.g. boost `identity`/`constraint`, down-weight `ongoing_context`).
A type absent from the map (and untyped rows) uses 1.0, so an empty/omitted
map is a no-op (uniform weighting). Vault-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`factTypeWeights`](RecallOptions.md#facttypeweights)

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/reflect.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#64)

Override fetch (for tests).

**Call Signature**

> (`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

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

`input`

</td>
<td>

`RequestInfo` | `URL`

</td>
</tr>
<tr>
<td>

`init?`

</td>
<td>

`RequestInit`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Response`>

**Call Signature**

> (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

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

`input`

</td>
<td>

`string` | `Request` | `URL`

</td>
</tr>
<tr>
<td>

`init?`

</td>
<td>

`RequestInit`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Response`>

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#123)

Vault folder filter. Vault-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`folderId`](RecallOptions.md#folderid)

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/memory/portalLlm.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#87)

Function to get an auth token (e.g., Privy's getIdentityToken). Token is sent as `Authorization: Bearer`.

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`getToken`](PortalLlmAuth.md#gettoken)

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

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`graphRefine`](RecallOptions.md#graphrefine)

***

### includeChunks?

> `optional` **includeChunks**: `boolean`

Defined in: [src/lib/memory/types.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#119)

Include source chunks for fact memories that have provenance. Default: false.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`includeChunks`](RecallOptions.md#includechunks)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/types.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#113)

Max items returned. Default: 8.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`limit`](RecallOptions.md#limit)

***

### llmModel?

> `optional` **llmModel**: `string`

Defined in: [src/lib/memory/reflect.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#56)

Override the answer model. Default: anthropic/claude-sonnet-4-6.

***

### maxHops?

> `optional` **maxHops**: `number`

Defined in: [src/lib/memory/types.ts:206](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#206)

Total graph hops incl. the seed lookup (hop 1). Default: 1 (seed only).

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`maxHops`](RecallOptions.md#maxhops)

***

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [src/lib/memory/reflect.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#58)

Cap response length. Default: 4096.

**Overrides**

[`RecallOptions`](RecallOptions.md).[`maxTokens`](RecallOptions.md#maxtokens)

***

### memories?

> `optional` **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/reflect.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#72)

Skip Stage-1 [recall](../functions/recall.md) and synthesize from these memories instead.
Used by `synthesizeProfile` after intersecting recall with a
`reviewedMemoryIds` gate so the LLM never sees unreviewed evidence.

***

### minScore?

> `optional` **minScore**: `number`

Defined in: [src/lib/memory/types.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#141)

Drop results below this score. Default: 0.1 for facts, 0.5 for chunks (mirrors today's defaults).

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`minScore`](RecallOptions.md#minscore)

***

### mmr?

> `optional` **mmr**: `boolean`

Defined in: [src/lib/memory/types.ts:182](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#182)

Apply MMR diversification after ranking (rerank pipeline only). Default: false.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`mmr`](RecallOptions.md#mmr)

***

### nodeBudget?

> `optional` **nodeBudget**: `number`

Defined in: [src/lib/memory/types.ts:210](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#210)

Hard cap on accumulated memory IDs across all hops. Default: 64.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`nodeBudget`](RecallOptions.md#nodebudget)

***

### now?

> `optional` **now**: `number`

Defined in: [src/lib/memory/types.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#159)

Reference "now" for resolving relative temporal phrases in the
query ("last week", "yesterday", "N days ago"). Default: `Date.now()`.
Override for back-dated evaluation harnesses (bench corpora dated
2021–2023) and for deterministic tests — otherwise the W6 lane
resolves windows in 2026 and never overlaps stored event\_time.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`now`](RecallOptions.md#now)

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

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`onDiagnostics`](RecallOptions.md#ondiagnostics)

***

### proofCountAlpha?

> `optional` **proofCountAlpha**: `number`

Defined in: [src/lib/memory/types.ts:188](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#188)

Proof-count log-boost scale. Default: 0.1.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`proofCountAlpha`](RecallOptions.md#proofcountalpha)

***

### recency?

> `optional` **recency**: [`RecencyOptions`](RecencyOptions.md)

Defined in: [src/lib/memory/types.ts:180](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#180)

Recency decay curve overrides (per-year decay slope, floor, no-date multiplier).

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`recency`](RecallOptions.md#recency)

***

### recencyAlpha?

> `optional` **recencyAlpha**: `number`

Defined in: [src/lib/memory/types.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#178)

Recency boost slope in the fused ranker. Default: 1.0.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`recencyAlpha`](RecallOptions.md#recencyalpha)

***

### rerankTopN?

> `optional` **rerankTopN**: `number`

Defined in: [src/lib/memory/types.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#174)

Number of candidates fed to the cross-encoder rerank stage. Default: 30.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`rerankTopN`](RecallOptions.md#reranktopn)

***

### responseSchema?

> `optional` **responseSchema**: `Record`<`string`, `unknown`>

Defined in: [src/lib/memory/reflect.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#66)

Optional JSON Schema to coerce structured outputs.

***

### rrfK?

> `optional` **rrfK**: `number`

Defined in: [src/lib/memory/types.ts:192](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#192)

RRF smoothing constant for lane fusion (facts × chunks and side lanes). Default: 60.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`rrfK`](RecallOptions.md#rrfk)

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/types.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#121)

Vault scope filter. Vault-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`scopes`](RecallOptions.md#scopes)

***

### supersessionBoost?

> `optional` **supersessionBoost**: `number`

Defined in: [src/lib/memory/types.ts:184](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#184)

Supersession score-gap transfer factor. Default: 0.8.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`supersessionBoost`](RecallOptions.md#supersessionboost)

***

### supersessionWindow?

> `optional` **supersessionWindow**: `number`

Defined in: [src/lib/memory/types.ts:186](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#186)

Hard cap on the supersession candidate window. Default: 50.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`supersessionWindow`](RecallOptions.md#supersessionwindow)

***

### systemPrompt?

> `optional` **systemPrompt**: `string`

Defined in: [src/lib/memory/reflect.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#60)

Override the grounding system prompt.

***

### types?

> `optional` **types**: [`MemoryKind`](../type-aliases/MemoryKind.md)\[]

Defined in: [src/lib/memory/types.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#111)

Which kinds to search. Default: \['fact'].

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`types`](RecallOptions.md#types)
