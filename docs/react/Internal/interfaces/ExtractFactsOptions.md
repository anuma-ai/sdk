# ExtractFactsOptions

Defined in: [src/lib/memory/autoExtract.ts:220](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#220)

Auth + endpoint for the extraction LLM call. Auth is the dual pattern —
one of `apiKey` / `getToken` is required at runtime; see
[PortalLlmAuth](PortalLlmAuth.md).

## Extends

* [`PortalLlmAuth`](PortalLlmAuth.md)

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/memory/portalLlm.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#139)

Direct API key — sent as `x-api-key` (server-side / CLI usage). Wins when both are provided.

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`apiKey`](PortalLlmAuth.md#apikey)

***

### backoffMs()?

> `optional` **backoffMs**: (`attempt`: `number`) => `number`

Defined in: [src/lib/memory/autoExtract.ts:294](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#294)

Override the retry backoff (ms) for a given 1-based attempt index. The
extraction call retries transient failures internally (default exponential
backoff); pass `() => 0` to retry without delay (useful for tests).

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

`attempt`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`number`

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memory/autoExtract.ts:221](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#221)

***

### endpointOverride?

> `optional` **endpointOverride**: `string`

Defined in: [src/lib/memory/autoExtract.ts:247](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#247)

Optional per-call request path override, forwarded to
callPortalJsonCompletion. When set, the extraction call POSTs to
`baseUrl + endpointOverride` instead of the default
`/api/v1/chat/completions` — path only, body unchanged. Lets callers route
this internal-utility pass to a dedicated endpoint. Invalid values throw at
call time (see validateEndpointOverride).

Why this exists (anuma-ai/ai-memoryless-client#5536): auto-extraction is the
highest-volume first-party background call in the product — one per
extracting turn, on every platform — and it carries no flow fingerprint, so
the portal's freeloader detector classifies it as scripted abuse. In reject
mode that 403s every basic-tier extraction, which surfaces here as
`onExhaustedEmpty` → `empty-after-retry` and leaves free-tier vaults empty.
[TopicExtractOptions.endpointOverride](TopicExtractOptions.md#endpointoverride) already exists for the same
reason on the topic pass; this is the fact pass catching up.

IMPORTANT — the utility endpoint clamps to a PRICE CEILING and never
rejects, so pointing this at `/api/v1/utility/chat/completions` while the
portal's ceiling prices below DEFAULT\_EXTRACTION\_MODEL silently
rewrites the model instead of 403-ing. That trades a visible failure for an
invisible quality regression: raise `PORTAL_UTILITY_CEILING_MODEL` to at
least the extraction model's rate BEFORE setting this in a client.

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/autoExtract.ts:249](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#249)

Override the global fetch implementation (useful for tests).

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

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/memory/portalLlm.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#141)

Function to get an auth token (e.g., Privy's getIdentityToken). Token is sent as `Authorization: Bearer`.

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`getToken`](PortalLlmAuth.md#gettoken)

***

### maxAttempts?

> `optional` **maxAttempts**: `number`

Defined in: [src/lib/memory/autoExtract.ts:279](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#279)

Max attempts for the extraction call on a transient failure (default 3).
Lower it to bound how long extraction can hold a turn open — e.g. a worker
that runs extraction behind an in-flight-turn guard can pass `2` to keep
repeated failures from delaying later turns.

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/memory/autoExtract.ts:222](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#222)

***

### now?

> `optional` **now**: `number`

Defined in: [src/lib/memory/autoExtract.ts:272](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#272)

Reference "now" (Unix ms) for resolving relative temporal phrases in the
transcript ("yesterday", "next week", "in two days") into the absolute
YYYY-MM-DD anchors the W6 temporal lane indexes on. The transcript itself
carries no timestamps, so without an anchor the model resolves relatives
against its own training-cutoff guess and emits wrong `eventTime` dates.
Defaults to `Date.now()`. Override for back-dated eval corpora and
deterministic tests (mirrors [RecallOptions.now](RecallOptions.md#now)).

Server-side timezone note: the ms value is formatted to a calendar date in
the process's local timezone (same basis as `parseLocalCalendarDay`). On a
UTC server, a user near midnight in a non-UTC offset can get the wrong
calendar day. Pass the user's local-midnight timestamp as `now` when the
process timezone doesn't match the user's.

***

### onCandidatesDropped()?

> `optional` **onCandidatesDropped**: () => `void`

Defined in: [src/lib/memory/autoExtract.ts:334](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#334)

Called when the extractor DID produce candidates but PII de-anonymization
dropped every one of them — the model mangled its placeholders (so they
can't be restored to real values) or restoring the values blew the length
cap. These drops happen before `retain()`, so `failedCount` can't see them,
and the turn would otherwise masquerade as a quiet `no-facts` result. Lets
H3's `outcome` surface `dropped-after-redaction` so a rising PII-drop rate
(i.e. redaction silently eating facts) is alarmable.

**Returns**

`void`

***

### onExhaustedEmpty()?

> `optional` **onExhaustedEmpty**: (`failure`: [`PortalLlmFailure`](PortalLlmFailure.md)) => `void`

Defined in: [src/lib/memory/autoExtract.ts:324](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#324)

Called when the extraction LLM returned no usable result after exhausting
its retries (empty/malformed completion, network/HTTP error) — i.e. a
*failure* that drops the turn's facts, as opposed to a legitimate
`{candidates: []}` "nothing durable here". Lets callers distinguish a
silently-degrading extractor from quiet turns (the two are otherwise
indistinguishable). See [extractAndRetain](../functions/extractAndRetain.md)'s `outcome`.

Receives the classified [PortalLlmFailure](PortalLlmFailure.md). Knowing THAT extraction
failed was not enough: the 2026-08-11 audit found ~60% of production turns
ending here and had to cross-check Prometheus to learn that the cause was
HTTP-200-with-empty-body rather than the 403 everyone assumed. Forward
`failure.reason` into analytics so the next such question is a query.

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

`failure`

</td>
<td>

[`PortalLlmFailure`](PortalLlmFailure.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### piiRedaction?

> `optional` **piiRedaction**: `boolean` | [`PiiRedactor`](../../../expo/Internal/classes/PiiRedactor.md)

Defined in: [src/lib/memory/autoExtract.ts:309](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#309)

When set, PII (emails, phones, SSNs, cards, IPs, API keys, …) in the
conversation transcript is replaced with tagged placeholders before the
extraction call, and the returned facts + entities are de-anonymized so the
vault keeps the real values while raw PII never reaches the extraction
model (and, via `extractAndRetain`, the consolidation model). Pass `true`
for a fresh per-call redactor, or a shared [PiiRedactor](../../../expo/Internal/classes/PiiRedactor.md) to keep
placeholder numbering consistent with other calls.

NOTE: this does NOT cover the embeddings provider. Facts are stored and
embedded with their real values, so to keep PII out of embedding requests
set `RetainContext.embeddingOptions.maskInput` (e.g. `redactor.maskText`)
as well — the two are independent switches.

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/lib/memory/autoExtract.ts:282](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#282)

Per-attempt timeout (ms) for the extraction call. Defaults to the portal
helper's 60s. Combine with [maxAttempts](#maxattempts) to cap the total time budget.

***

### totalTimeoutMs?

> `optional` **totalTimeoutMs**: `number`

Defined in: [src/lib/memory/autoExtract.ts:288](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#288)

Absolute wall-clock budget (ms) across ALL extraction attempts incl. backoff.
When set, the loop stops before an attempt that would exceed it, so worst-case
latency is bounded rather than `maxAttempts × timeoutMs`.

***

### userIdentity?

> `optional` **userIdentity**: `string`\[]

Defined in: [src/lib/memory/autoExtract.ts:256](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#256)

The user's own name(s) / handle(s) (e.g. profile nickname, wallet display
name). Candidates whose entire content is just one of these are dropped —
a personal memory system already knows who the user is, so "Peter Lee" is
circular noise. Optional; when omitted only the bare-fragment gate applies.
