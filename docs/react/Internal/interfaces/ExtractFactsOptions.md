# ExtractFactsOptions

Defined in: [src/lib/memory/autoExtract.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#127)

Auth + endpoint for the extraction LLM call. Auth is the dual pattern —
one of `apiKey` / `getToken` is required at runtime; see
[PortalLlmAuth](PortalLlmAuth.md).

## Extends

* [`PortalLlmAuth`](PortalLlmAuth.md)

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/memory/portalLlm.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#34)

Direct API key — sent as `x-api-key` (server-side / CLI usage). Wins when both are provided.

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`apiKey`](PortalLlmAuth.md#apikey)

***

### backoffMs()?

> `optional` **backoffMs**: (`attempt`: `number`) => `number`

Defined in: [src/lib/memory/autoExtract.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#147)

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

Defined in: [src/lib/memory/autoExtract.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#128)

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/autoExtract.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#131)

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

Defined in: [src/lib/memory/portalLlm.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#36)

Function to get an auth token (e.g., Privy's getIdentityToken). Token is sent as `Authorization: Bearer`.

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`getToken`](PortalLlmAuth.md#gettoken)

***

### maxAttempts?

> `optional` **maxAttempts**: `number`

Defined in: [src/lib/memory/autoExtract.ts:138](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#138)

Max attempts for the extraction call on a transient failure (default 3).
Lower it to bound how long extraction can hold a turn open — e.g. a worker
that runs extraction behind an in-flight-turn guard can pass `2` to keep
repeated failures from delaying later turns.

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/memory/autoExtract.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#129)

***

### piiRedaction?

> `optional` **piiRedaction**: `boolean` | `PiiRedactor`

Defined in: [src/lib/memory/autoExtract.ts:162](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#162)

When set, PII (emails, phones, SSNs, cards, IPs, API keys, …) in the
conversation transcript is replaced with tagged placeholders before the
extraction call, and the returned facts + entities are de-anonymized so the
vault keeps the real values while raw PII never reaches the extraction
model (and, via `extractAndRetain`, the consolidation model). Pass `true`
for a fresh per-call redactor, or a shared PiiRedactor to keep
placeholder numbering consistent with other calls.

NOTE: this does NOT cover the embeddings provider. Facts are stored and
embedded with their real values, so to keep PII out of embedding requests
set `RetainContext.embeddingOptions.maskInput` (e.g. `redactor.maskText`)
as well — the two are independent switches.

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/lib/memory/autoExtract.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#141)

Per-attempt timeout (ms) for the extraction call. Defaults to the portal
helper's 60s. Combine with [maxAttempts](#maxattempts) to cap the total time budget.
