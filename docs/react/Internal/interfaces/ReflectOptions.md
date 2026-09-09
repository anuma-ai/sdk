# ReflectOptions

Defined in: [src/lib/memory/reflect.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#102)

Options for [reflect](../functions/reflect.md). Auth for the answer LLM is the dual pattern
inherited from [PortalLlmAuth](PortalLlmAuth.md) — one of `apiKey` / `getToken` is
required at runtime; `apiKey` wins when both are set.

## Extends

* [`RecallOptions`](RecallOptions.md).[`PortalLlmAuth`](PortalLlmAuth.md)

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/memory/portalLlm.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#170)

Direct API key — sent as `x-api-key` (server-side / CLI usage). Wins when both are provided.

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`apiKey`](PortalLlmAuth.md#apikey)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memory/reflect.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#132)

Endpoint for the answer LLM.

***

### bm25AdmissionDivisor?

> `optional` **bm25AdmissionDivisor**: `number`

Defined in: [src/lib/memory/types.ts:210](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#210)

Divisor mapping BM25 scores to the admission floor. Default: 50.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`bm25AdmissionDivisor`](RecallOptions.md#bm25admissiondivisor)

***

### budget?

> `optional` **budget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#118)

Search depth. Default: 'low'.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`budget`](RecallOptions.md#budget)

***

### ceWeight?

> `optional` **ceWeight**: `number`

Defined in: [src/lib/memory/types.ts:196](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#196)

Multiplicative cross-encoder blend weight. Default: 0.1.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`ceWeight`](RecallOptions.md#ceweight)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:138](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#138)

Restrict chunk search to one conversation. Chunk-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`conversationId`](RecallOptions.md#conversationid)

***

### decomposeOptions?

> `optional` **decomposeOptions**: [`PortalLlmAuth`](PortalLlmAuth.md) & `object`

Defined in: [src/lib/memory/types.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#167)

Auth + endpoint for optional LLM helpers that reuse portal auth —
currently [RecallOptions.graphRefine](RecallOptions.md#graphrefine) neighbor selection.
Query decomposition is **not** driven by this field inside `recall()`
(719/B4); [createRecallTool](../functions/createRecallTool.md) reads the same shape from
`RecallToolOptions.decomposeOptions` for tool-layer rewrite.

Callers that still pass `{ budget: 'high', decomposeOptions }` without
[RecallOptions.subQueries](RecallOptions.md#subqueries) keep compiling but no longer rewrite —
`recall()` emits `decompose-moved` on [RecallDiagnostics.degraded](RecallDiagnostics.md#degraded)
so upgrades without a changelog read still leave a telemetry breadcrumb.

Auth is the dual pattern — one of `apiKey` / `getToken` is required;
see [PortalLlmAuth](PortalLlmAuth.md).

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

Defined in: [src/lib/memory/types.ts:219](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#219)

Decrypt vault memory content only for the top-N ranked candidates
instead of the whole vault. Forwarded verbatim to the vault search
pipeline's `MemoryVaultSearchOptions`. Default: off (legacy
whole-vault decrypt path).

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`decryptLast`](RecallOptions.md#decryptlast)

***

### entityFanout?

> `optional` **entityFanout**: `number`

Defined in: [src/lib/memory/types.ts:228](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#228)

Max neighbor entities expanded per hop. Default: 8.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`entityFanout`](RecallOptions.md#entityfanout)

***

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/memory/types.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#140)

Exclude one conversation from chunk search. Chunk-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`excludeConversationId`](RecallOptions.md#excludeconversationid)

***

### factTypes?

> `optional` **factTypes**: (`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`)\[]

Defined in: [src/lib/memory/types.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#129)

Typed memory (PR1) — restrict fact recall to these FactTypes. Optional
and no-op when unset (all types are eligible). Vault-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`factTypes`](RecallOptions.md#facttypes)

***

### factTypeWeights?

> `optional` **factTypeWeights**: `Partial`<`Record`<`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`, `number`>>

Defined in: [src/lib/memory/types.ts:136](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#136)

PR5 — optional per-FactType score multiplier applied in the fusion boost
stage (e.g. boost `identity`/`constraint`, down-weight `ongoing_context`).
A type absent from the map (and untyped rows) uses 1.0, so an empty/omitted
map is a no-op (uniform weighting). Vault-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`factTypeWeights`](RecallOptions.md#facttypeweights)

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/reflect.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#134)

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

Defined in: [src/lib/memory/types.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#124)

Vault folder filter. Vault-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`folderId`](RecallOptions.md#folderid)

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/memory/portalLlm.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#172)

Function to get an auth token (e.g., Privy's getIdentityToken). Token is sent as `Authorization: Bearer`.

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`getToken`](PortalLlmAuth.md#gettoken)

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

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`graphRefine`](RecallOptions.md#graphrefine)

***

### includeChunks?

> `optional` **includeChunks**: `boolean`

Defined in: [src/lib/memory/types.ts:120](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#120)

Include source chunks for fact memories that have provenance. Default: false.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`includeChunks`](RecallOptions.md#includechunks)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/types.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#114)

Max items returned. Default: 8.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`limit`](RecallOptions.md#limit)

***

### llmModel?

> `optional` **llmModel**: `string`

Defined in: [src/lib/memory/reflect.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#104)

Override the answer model. Default: anthropic/claude-sonnet-4-6.

***

### maxHops?

> `optional` **maxHops**: `number`

Defined in: [src/lib/memory/types.ts:226](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#226)

Total graph hops incl. the seed lookup (hop 1). Default: 1 (seed only).

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`maxHops`](RecallOptions.md#maxhops)

***

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [src/lib/memory/reflect.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#106)

Cap response length. Default: 4096.

**Overrides**

[`RecallOptions`](RecallOptions.md).[`maxTokens`](RecallOptions.md#maxtokens)

***

### memories?

> `optional` **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/reflect.ts:142](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#142)

Skip Stage-1 [recall](../functions/recall.md) and synthesize from these memories instead.
Used by `synthesizeProfile` after intersecting recall with a
`reviewedMemoryIds` gate so the LLM never sees unreviewed evidence.

***

### minScore?

> `optional` **minScore**: `number`

Defined in: [src/lib/memory/types.ts:142](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#142)

Drop results below this score. Default: 0.1 for facts, 0.5 for chunks (mirrors today's defaults).

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`minScore`](RecallOptions.md#minscore)

***

### mmr?

> `optional` **mmr**: `boolean`

Defined in: [src/lib/memory/types.ts:202](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#202)

Apply MMR diversification after ranking (rerank pipeline only). Default: false.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`mmr`](RecallOptions.md#mmr)

***

### nodeBudget?

> `optional` **nodeBudget**: `number`

Defined in: [src/lib/memory/types.ts:230](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#230)

Hard cap on accumulated memory IDs across all hops. Default: 64.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`nodeBudget`](RecallOptions.md#nodebudget)

***

### now?

> `optional` **now**: `number`

Defined in: [src/lib/memory/types.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#178)

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

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`onDiagnostics`](RecallOptions.md#ondiagnostics)

***

### proofCountAlpha?

> `optional` **proofCountAlpha**: `number`

Defined in: [src/lib/memory/types.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#208)

Proof-count log-boost scale. Default: 0.1.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`proofCountAlpha`](RecallOptions.md#proofcountalpha)

***

### recency?

> `optional` **recency**: [`RecencyOptions`](RecencyOptions.md)

Defined in: [src/lib/memory/types.ts:200](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#200)

Recency decay curve overrides (per-year decay slope, floor, no-date multiplier).

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`recency`](RecallOptions.md#recency)

***

### recencyAlpha?

> `optional` **recencyAlpha**: `number`

Defined in: [src/lib/memory/types.ts:198](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#198)

Recency boost slope in the fused ranker. Default: 1.0.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`recencyAlpha`](RecallOptions.md#recencyalpha)

***

### rerankTopN?

> `optional` **rerankTopN**: `number`

Defined in: [src/lib/memory/types.ts:194](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#194)

Number of candidates fed to the cross-encoder rerank stage. Default: 5;
was 30 until 2026-08-13 — see anuma-ai/sdk#845.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`rerankTopN`](RecallOptions.md#reranktopn)

***

### responseSchema?

> `optional` **responseSchema**: `Record`<`string`, `unknown`>

Defined in: [src/lib/memory/reflect.ts:136](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#136)

Optional JSON Schema to coerce structured outputs.

***

### rrfK?

> `optional` **rrfK**: `number`

Defined in: [src/lib/memory/types.ts:212](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#212)

RRF smoothing constant for lane fusion (facts × chunks and side lanes). Default: 60.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`rrfK`](RecallOptions.md#rrfk)

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/types.ts:122](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#122)

Vault scope filter. Vault-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`scopes`](RecallOptions.md#scopes)

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

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`subQueries`](RecallOptions.md#subqueries)

***

### supersessionBoost?

> `optional` **supersessionBoost**: `number`

Defined in: [src/lib/memory/types.ts:204](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#204)

Supersession score-gap transfer factor. Default: 0.8.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`supersessionBoost`](RecallOptions.md#supersessionboost)

***

### supersessionWindow?

> `optional` **supersessionWindow**: `number`

Defined in: [src/lib/memory/types.ts:206](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#206)

Hard cap on the supersession candidate window. Default: 50.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`supersessionWindow`](RecallOptions.md#supersessionwindow)

***

### systemPrompt?

> `optional` **systemPrompt**: `string`

Defined in: [src/lib/memory/reflect.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#108)

Override the grounding system prompt.

***

### taskType?

> `optional` **taskType**: `TaskType`

Defined in: [src/lib/memory/reflect.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#130)

Class-B task name for the `X-Anuma-Task-Type` header, or nothing.

Deliberately OPTIONAL and unset by default. reflect() also answers the user's
OWN question, and that traffic is chat, not an internal flow — declaring a
task type unconditionally here would put an internal-flow name on real
conversation, which is the same boundary `INTERNAL_FLOW_MARKER` draws
(reflect is deliberately unmarked; its background caller marks its own
prompt — see ../internalFlowMarker.ts). So the name is per call: only a
caller with ONE fixed purpose passes
one, and today that is profile-facet synthesis (`memory_profile_synth`).

***

### types?

> `optional` **types**: [`MemoryKind`](../type-aliases/MemoryKind.md)\[]

Defined in: [src/lib/memory/types.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#112)

Which kinds to search. Default: \['fact'].

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`types`](RecallOptions.md#types)

***

### userInstructions?

> `optional` **userInstructions**: `string`

Defined in: [src/lib/memory/reflect.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#117)

Extra caller instruction to carry on the USER turn, between the question and
the evidence block (see the `userMessage` assembly below). This is the slot a
background caller uses to keep its per-request data OUT of the system message
without colliding with the numbered evidence list — profile-facet synthesis
puts its section label, guidance and response-field hint here so its system
half can stay fixed and server-ownable.
