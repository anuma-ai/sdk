# InjectionClassifierOptions

Defined in: [src/lib/memory/injectionClassifier.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionClassifier.ts#102)

Auth + tuning for the optional LLM injection classifier. Auth is the dual
pattern — one of `apiKey` / `getToken` is required at runtime (see
[PortalLlmAuth](PortalLlmAuth.md)). The mere PRESENCE of this options object in
`extractAndRetain` is the opt-in switch; omit it for the default-off,
deterministic-only screen.

## Extends

* [`PortalLlmAuth`](PortalLlmAuth.md)

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/memory/portalLlm.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#85)

Direct API key — sent as `x-api-key` (server-side / CLI usage). Wins when both are provided.

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`apiKey`](PortalLlmAuth.md#apikey)

***

### backoffMs()?

> `optional` **backoffMs**: (`attempt`: `number`) => `number`

Defined in: [src/lib/memory/injectionClassifier.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionClassifier.ts#113)

Backoff before each retry (ms). Tests pass `() => 0`.

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

Defined in: [src/lib/memory/injectionClassifier.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionClassifier.ts#103)

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/injectionClassifier.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionClassifier.ts#106)

Override fetch (tests).

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

Defined in: [src/lib/memory/portalLlm.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#87)

Function to get an auth token (e.g., Privy's getIdentityToken). Token is sent as `Authorization: Bearer`.

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`getToken`](PortalLlmAuth.md#gettoken)

***

### maxAttempts?

> `optional` **maxAttempts**: `number`

Defined in: [src/lib/memory/injectionClassifier.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionClassifier.ts#108)

Max portal attempts on a TRANSIENT failure. Default 2.

***

### maxCandidates?

> `optional` **maxCandidates**: `number`

Defined in: [src/lib/memory/injectionClassifier.ts:122](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionClassifier.ts#122)

Max candidates classified per call. Default 20.

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/memory/injectionClassifier.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionClassifier.ts#104)

***

### piiRedaction?

> `optional` **piiRedaction**: `boolean` | [`PiiRedactor`](../../../expo/Internal/classes/PiiRedactor.md)

Defined in: [src/lib/memory/injectionClassifier.ts:120](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionClassifier.ts#120)

PII redaction for the outbound content, same switch as the extractor.
`extractAndRetain` inherits the extraction setting so enabling redaction
there also protects this call. `true` = fresh per-call redactor; pass a
shared [PiiRedactor](../../../expo/Internal/classes/PiiRedactor.md) to keep placeholder numbering consistent.

***

### totalTimeoutMs?

> `optional` **totalTimeoutMs**: `number`

Defined in: [src/lib/memory/injectionClassifier.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionClassifier.ts#111)

Absolute wall-clock budget across attempts. Default 45s — sized for slow
open-weights provider tail latency; tighten on a latency-sensitive path.
