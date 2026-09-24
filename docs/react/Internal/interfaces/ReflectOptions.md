# ReflectOptions

Defined in: [src/lib/memory/reflect.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#131)

Options for [reflect](../functions/reflect.md). Auth for the answer LLM is the dual pattern
inherited from [PortalLlmAuth](PortalLlmAuth.md) — one of `apiKey` / `getToken` is
required at runtime; `apiKey` wins when both are set.

## Extends

* [`RecallOptions`](RecallOptions.md).[`PortalLlmAuth`](PortalLlmAuth.md)

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/memory/portalLlm.ts:179](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#179)

Direct API key — sent as `x-api-key` (server-side / CLI usage). Wins when both are provided.

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`apiKey`](PortalLlmAuth.md#apikey)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memory/reflect.ts:184](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#184)

Endpoint for the answer LLM.

***

### bm25AdmissionDivisor?

> `optional` **bm25AdmissionDivisor**: `number`

Defined in: [src/lib/memory/types.ts:229](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#229)

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

Defined in: [src/lib/memory/types.ts:201](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#201)

Multiplicative cross-encoder blend weight. Default: 0.1.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`ceWeight`](RecallOptions.md#ceweight)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:143](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#143)

Restrict chunk search to one conversation. Chunk-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`conversationId`](RecallOptions.md#conversationid)

***

### decomposeOptions?

> `optional` **decomposeOptions**: [`PortalLlmAuth`](PortalLlmAuth.md) & `object`

Defined in: [src/lib/memory/types.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#172)

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

Defined in: [src/lib/memory/types.ts:238](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#238)

Decrypt vault memory content only for the top-N ranked candidates
instead of the whole vault. Forwarded verbatim to the vault search
pipeline's `MemoryVaultSearchOptions`. Default: off (legacy
whole-vault decrypt path).

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`decryptLast`](RecallOptions.md#decryptlast)

***

### entityFanout?

> `optional` **entityFanout**: `number`

Defined in: [src/lib/memory/types.ts:247](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#247)

Max neighbor entities expanded per hop. Default: 8.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`entityFanout`](RecallOptions.md#entityfanout)

***

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/memory/types.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#145)

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

Defined in: [src/lib/memory/types.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#141)

PR5 — optional per-FactType score multiplier applied in the fusion boost
stage (e.g. boost `identity`/`constraint`, down-weight `ongoing_context`).
A type absent from the map (and untyped rows) uses 1.0, so an empty/omitted
map is a no-op (uniform weighting). Vault-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`factTypeWeights`](RecallOptions.md#facttypeweights)

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/reflect.ts:186](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#186)

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

Defined in: [src/lib/memory/portalLlm.ts:181](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#181)

Function to get an auth token (e.g., Privy's getIdentityToken). Token is sent as `Authorization: Bearer`.

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`getToken`](PortalLlmAuth.md#gettoken)

***

### graphRefine?

> `optional` **graphRefine**: `boolean`

Defined in: [src/lib/memory/types.ts:259](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#259)

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

Defined in: [src/lib/memory/reflect.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#133)

Override the answer model. Default: anthropic/claude-sonnet-4-6.

***

### maxHops?

> `optional` **maxHops**: `number`

Defined in: [src/lib/memory/types.ts:245](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#245)

Total graph hops incl. the seed lookup (hop 1). Default: 1 (seed only).

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`maxHops`](RecallOptions.md#maxhops)

***

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [src/lib/memory/reflect.ts:135](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#135)

Cap response length. Default: 4096.

**Overrides**

[`RecallOptions`](RecallOptions.md).[`maxTokens`](RecallOptions.md#maxtokens)

***

### memories?

> `optional` **memories**: [`RankedMemory`](RankedMemory.md)\[]

Defined in: [src/lib/memory/reflect.ts:194](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#194)

Skip Stage-1 [recall](../functions/recall.md) and synthesize from these memories instead.
Used by `synthesizeProfile` after intersecting recall with a
`reviewedMemoryIds` gate so the LLM never sees unreviewed evidence.

***

### memoryIds?

> `optional` **memoryIds**: `string`\[]

Defined in: [src/lib/memory/types.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#134)

Restrict fact candidates BEFORE ranking. Empty means no facts. When set,
unrestricted chunk search is disabled; it must not escape a topic scope.
Asking for `"chunk"` alongside this yields no excerpts and reports
`"chunks-scope-restricted"` on [RecallDiagnostics.degraded](RecallDiagnostics.md#degraded).

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`memoryIds`](RecallOptions.md#memoryids)

***

### minScore?

> `optional` **minScore**: `number`

Defined in: [src/lib/memory/types.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#147)

Drop results below this score. Default: 0.1 for facts, 0.5 for chunks (mirrors today's defaults).

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`minScore`](RecallOptions.md#minscore)

***

### mmr?

> `optional` **mmr**: `boolean`

Defined in: [src/lib/memory/types.ts:221](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#221)

Apply MMR diversification after ranking (rerank pipeline only). Default: false.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`mmr`](RecallOptions.md#mmr)

***

### nodeBudget?

> `optional` **nodeBudget**: `number`

Defined in: [src/lib/memory/types.ts:250](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#250)

Hard cap on graph-lane memory IDs — across all hops, and on the single-hop
lane `low`/`mid` run. Default: 64.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`nodeBudget`](RecallOptions.md#nodebudget)

***

### now?

> `optional` **now**: `number`

Defined in: [src/lib/memory/types.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#183)

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

Defined in: [src/lib/memory/types.ts:191](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#191)

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

Defined in: [src/lib/memory/types.ts:227](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#227)

Proof-count log-boost scale. Default: 0.1.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`proofCountAlpha`](RecallOptions.md#proofcountalpha)

***

### queryEmbedTotalTimeoutMs?

> `optional` **queryEmbedTotalTimeoutMs**: `number`

Defined in: [src/lib/memory/types.ts:215](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#215)

Overall deadline, in ms, for embedding the query — token read, every retry
attempt and the backoff between them. Default: 8000. On expiry the fact lane
degrades to BM25 and the (cosine-only) chunk lane is skipped, reported as
`embeddings-unavailable`, so an embeddings outage costs a turn at most this
long rather than ~4 x the per-attempt timeout. `0` disables it.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`queryEmbedTotalTimeoutMs`](RecallOptions.md#queryembedtotaltimeoutms)

***

### recency?

> `optional` **recency**: [`RecencyOptions`](RecencyOptions.md)

Defined in: [src/lib/memory/types.ts:219](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#219)

Recency decay curve overrides (per-year decay slope, floor, no-date multiplier).

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`recency`](RecallOptions.md#recency)

***

### recencyAlpha?

> `optional` **recencyAlpha**: `number`

Defined in: [src/lib/memory/types.ts:217](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#217)

Recency boost slope in the fused ranker. Default: 1.0.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`recencyAlpha`](RecallOptions.md#recencyalpha)

***

### rerankLoadTimeoutMs?

> `optional` **rerankLoadTimeoutMs**: `number`

Defined in: [src/lib/memory/types.ts:207](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#207)

Max ms a `mid`/`high` recall waits for the cross-encoder's FIRST model load
before degrading to the fused ranking (reported as `rerank-unavailable`).
Default: 10000. The load keeps going in the background for later calls.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`rerankLoadTimeoutMs`](RecallOptions.md#rerankloadtimeoutms)

***

### rerankTopN?

> `optional` **rerankTopN**: `number`

Defined in: [src/lib/memory/types.ts:199](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#199)

Number of candidates fed to the cross-encoder rerank stage. Default: 5;
was 30 until 2026-08-13 — see anuma-ai/sdk#845.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`rerankTopN`](RecallOptions.md#reranktopn)

***

### responseSchema?

> `optional` **responseSchema**: `Record`<`string`, `unknown`>

Defined in: [src/lib/memory/reflect.ts:188](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#188)

Optional JSON Schema to coerce structured outputs.

***

### rrfK?

> `optional` **rrfK**: `number`

Defined in: [src/lib/memory/types.ts:231](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#231)

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

Defined in: [src/lib/memory/types.ts:156](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#156)

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

Defined in: [src/lib/memory/types.ts:223](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#223)

Supersession score-gap transfer factor. Default: 0.8.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`supersessionBoost`](RecallOptions.md#supersessionboost)

***

### supersessionWindow?

> `optional` **supersessionWindow**: `number`

Defined in: [src/lib/memory/types.ts:225](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#225)

Hard cap on the supersession candidate window. Default: 50.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`supersessionWindow`](RecallOptions.md#supersessionwindow)

***

### systemPrompt?

> `optional` **systemPrompt**: `string`

Defined in: [src/lib/memory/reflect.ts:160](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#160)

Override the grounding system prompt.

⚠ DOING THIS MAKES THE REQUEST'S PROVENANCE YOURS. The default prompt's first sentence is
this flow's fingerprint in the portal's freeloader (anti-bot) detector (see
DEFAULT\_SYSTEM\_PROMPT); replacing it wholesale removes that, and a free-tier request
carrying no recognised provenance is rejected outright once the portal's markerless reject is
enabled — a 403, not a degraded answer.

Which replacement is correct depends on what the call IS, and there is no safe default:

* **A background/internal call** (a fixed-purpose helper, not a user's own question): prepend
  [withInternalFlowMarker](../functions/withInternalFlowMarker.md), which is exported for exactly this. That is what
  profile-facet synthesis does.
* **A user-facing call** (the person is asking their own question and expects an answer):
  do NOT use the internal marker — it asserts "not user chat" and would be false. Keep the
  default prompt, or append your instructions to it rather than replacing it, so the
  fingerprint survives. A genuinely distinct user-facing flow needs its own fingerprint
  registered in ai-portal `internal/detection/markers.go`.

Appending is the cheap way to stay safe: `${DEFAULT_SYSTEM_PROMPT}\n\n${yourInstructions}`
keeps the fingerprint as a prefix. `reflect.test.ts` pins both the marked and the bare
override paths so this stays true.

***

### taskType?

> `optional` **taskType**: `TaskType`

Defined in: [src/lib/memory/reflect.ts:182](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#182)

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

Defined in: [src/lib/memory/reflect.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#169)

Extra caller instruction to carry on the USER turn, between the question and
the evidence block (see the `userMessage` assembly below). This is the slot a
background caller uses to keep its per-request data OUT of the system message
without colliding with the numbered evidence list — profile-facet synthesis
puts its section label, guidance and response-field hint here so its system
half can stay fixed and server-ownable.
