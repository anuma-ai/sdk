# LlmDecayClassifierOptions

Defined in: [src/lib/memory/decayClassifier.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayClassifier.ts#92)

Auth + wiring for [createLlmDecayClassifier](../functions/createLlmDecayClassifier.md). Auth is the dual pattern —
one of `apiKey` / `getToken` is required at runtime (see [PortalLlmAuth](PortalLlmAuth.md)).

## Extends

* [`PortalLlmAuth`](PortalLlmAuth.md)

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/memory/portalLlm.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#84)

Direct API key — sent as `x-api-key` (server-side / CLI usage). Wins when both are provided.

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`apiKey`](PortalLlmAuth.md#apikey)

***

### backoffMs()?

> `optional` **backoffMs**: (`attempt`: `number`) => `number`

Defined in: [src/lib/memory/decayClassifier.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayClassifier.ts#102)

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

Defined in: [src/lib/memory/decayClassifier.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayClassifier.ts#93)

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/decayClassifier.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayClassifier.ts#96)

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

### getContent()

> **getContent**: (`id`: `string`) => `Promise`<`string` | `null`>

Defined in: [src/lib/memory/decayClassifier.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayClassifier.ts#117)

Resolve a memory's DECRYPTED content by id. The caller supplies this and
MUST gate it on wallet-key availability — return `null` when no key is
loaded so the classifier degrades to the rule verdict (zero-knowledge).
A throw is treated the same as `null` (fail to the rule verdict).

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

`id`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string` | `null`>

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

### maxAttempts?

> `optional` **maxAttempts**: `number`

Defined in: [src/lib/memory/decayClassifier.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayClassifier.ts#98)

Max portal attempts on a TRANSIENT failure. Default 2.

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/memory/decayClassifier.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayClassifier.ts#94)

***

### piiRedaction?

> `optional` **piiRedaction**: `boolean` | [`PiiRedactor`](../../../expo/Internal/classes/PiiRedactor.md)

Defined in: [src/lib/memory/decayClassifier.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayClassifier.ts#110)

PII redaction for the outbound content. OPT-OUT: defaults to ON (a fresh
per-call redactor) when omitted, so decrypted content is never egressed
raw by accident. Pass a shared [PiiRedactor](../../../expo/Internal/classes/PiiRedactor.md) to keep placeholder
numbering consistent with other calls, or `false` to deliberately disable
redaction. The verdict returned is a bare enum — nothing to de-anonymize.

***

### totalTimeoutMs?

> `optional` **totalTimeoutMs**: `number`

Defined in: [src/lib/memory/decayClassifier.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayClassifier.ts#100)

Absolute wall-clock budget across attempts. Default 12s.
