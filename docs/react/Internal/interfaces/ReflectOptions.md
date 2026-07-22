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

Defined in: [src/lib/memory/portalLlm.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#84)

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

Defined in: [src/lib/memory/types.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#168)

Divisor mapping BM25 scores to the admission floor. Default: 50.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`bm25AdmissionDivisor`](RecallOptions.md#bm25admissiondivisor)

***

### budget?

> `optional` **budget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#107)

Search depth. Default: 'low'.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`budget`](RecallOptions.md#budget)

***

### ceWeight?

> `optional` **ceWeight**: `number`

Defined in: [src/lib/memory/types.ts:154](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#154)

Multiplicative cross-encoder blend weight. Default: 0.1.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`ceWeight`](RecallOptions.md#ceweight)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#115)

Restrict chunk search to one conversation. Chunk-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`conversationId`](RecallOptions.md#conversationid)

***

### decomposeOptions?

> `optional` **decomposeOptions**: [`PortalLlmAuth`](PortalLlmAuth.md) & `object`

Defined in: [src/lib/memory/types.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#126)

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

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/memory/types.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#117)

Exclude one conversation from chunk search. Chunk-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`excludeConversationId`](RecallOptions.md#excludeconversationid)

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

Defined in: [src/lib/memory/types.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#113)

Vault folder filter. Vault-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`folderId`](RecallOptions.md#folderid)

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/memory/portalLlm.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#86)

Function to get an auth token (e.g., Privy's getIdentityToken). Token is sent as `Authorization: Bearer`.

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`getToken`](PortalLlmAuth.md#gettoken)

***

### includeChunks?

> `optional` **includeChunks**: `boolean`

Defined in: [src/lib/memory/types.ts:109](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#109)

Include source chunks for fact memories that have provenance. Default: false.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`includeChunks`](RecallOptions.md#includechunks)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/types.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#103)

Max items returned. Default: 8.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`limit`](RecallOptions.md#limit)

***

### llmModel?

> `optional` **llmModel**: `string`

Defined in: [src/lib/memory/reflect.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#56)

Override the answer model. Default: anthropic/claude-sonnet-4-6.

***

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [src/lib/memory/reflect.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#58)

Cap response length. Default: 4096.

**Overrides**

[`RecallOptions`](RecallOptions.md).[`maxTokens`](RecallOptions.md#maxtokens)

***

### minScore?

> `optional` **minScore**: `number`

Defined in: [src/lib/memory/types.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#119)

Drop results below this score. Default: 0.1 for facts, 0.5 for chunks (mirrors today's defaults).

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`minScore`](RecallOptions.md#minscore)

***

### mmr?

> `optional` **mmr**: `boolean`

Defined in: [src/lib/memory/types.ts:160](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#160)

Apply MMR diversification after ranking (rerank pipeline only). Default: false.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`mmr`](RecallOptions.md#mmr)

***

### now?

> `optional` **now**: `number`

Defined in: [src/lib/memory/types.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#137)

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

Defined in: [src/lib/memory/types.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#145)

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

Defined in: [src/lib/memory/types.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#166)

Proof-count log-boost scale. Default: 0.1.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`proofCountAlpha`](RecallOptions.md#proofcountalpha)

***

### recency?

> `optional` **recency**: [`RecencyOptions`](RecencyOptions.md)

Defined in: [src/lib/memory/types.ts:158](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#158)

Recency decay curve overrides (per-year decay slope, floor, no-date multiplier).

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`recency`](RecallOptions.md#recency)

***

### recencyAlpha?

> `optional` **recencyAlpha**: `number`

Defined in: [src/lib/memory/types.ts:156](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#156)

Recency boost slope in the fused ranker. Default: 1.0.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`recencyAlpha`](RecallOptions.md#recencyalpha)

***

### rerankTopN?

> `optional` **rerankTopN**: `number`

Defined in: [src/lib/memory/types.ts:152](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#152)

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

Defined in: [src/lib/memory/types.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#170)

RRF smoothing constant for lane fusion (facts × chunks and side lanes). Default: 60.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`rrfK`](RecallOptions.md#rrfk)

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/types.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#111)

Vault scope filter. Vault-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`scopes`](RecallOptions.md#scopes)

***

### supersessionBoost?

> `optional` **supersessionBoost**: `number`

Defined in: [src/lib/memory/types.ts:162](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#162)

Supersession score-gap transfer factor. Default: 0.8.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`supersessionBoost`](RecallOptions.md#supersessionboost)

***

### supersessionWindow?

> `optional` **supersessionWindow**: `number`

Defined in: [src/lib/memory/types.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#164)

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

Defined in: [src/lib/memory/types.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#101)

Which kinds to search. Default: \['fact'].

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`types`](RecallOptions.md#types)
