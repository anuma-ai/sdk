# VerifyMemoriesForPublishOptions

Defined in: [src/lib/memory/verifySupport.ts:280](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#280)

Auth + tuning for [verifyMemoriesForPublish](../functions/verifyMemoriesForPublish.md). Auth is the dual pattern
— one of `apiKey` / `getToken` is required at runtime (see
[PortalLlmAuth](PortalLlmAuth.md)); without it nothing is verified.

## Extends

* [`PortalLlmAuth`](PortalLlmAuth.md)

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/memory/portalLlm.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#170)

Direct API key — sent as `x-api-key` (server-side / CLI usage). Wins when both are provided.

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`apiKey`](PortalLlmAuth.md#apikey)

***

### backoffMs()?

> `optional` **backoffMs**: (`attempt`: `number`) => `number`

Defined in: [src/lib/memory/verifySupport.ts:290](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#290)

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

Defined in: [src/lib/memory/verifySupport.ts:281](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#281)

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/verifySupport.ts:284](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#284)

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

Defined in: [src/lib/memory/portalLlm.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#172)

Function to get an auth token (e.g., Privy's getIdentityToken). Token is sent as `Authorization: Bearer`.

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`getToken`](PortalLlmAuth.md#gettoken)

***

### maxAttempts?

> `optional` **maxAttempts**: `number`

Defined in: [src/lib/memory/verifySupport.ts:286](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#286)

Max portal attempts on a TRANSIENT failure. Default 2.

***

### maxEvidenceChars?

> `optional` **maxEvidenceChars**: `number`

Defined in: [src/lib/memory/verifySupport.ts:313](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#313)

Per-memory cap on joined evidence characters. Default 2000.

***

### maxItems?

> `optional` **maxItems**: `number`

Defined in: [src/lib/memory/verifySupport.ts:311](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#311)

Max memories verified in one call; the rest come back `unchecked`
(`over-budget`). Default 20.

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/memory/verifySupport.ts:282](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#282)

***

### piiRedaction?

> `optional` **piiRedaction**: `boolean` | [`PiiRedactor`](../../../expo/Internal/classes/PiiRedactor.md)

Defined in: [src/lib/memory/verifySupport.ts:308](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#308)

PII redaction for the outbound fact + evidence.

OPT-OUT: defaults to ON (a fresh per-call redactor) when omitted, the same
posture as the LLM decay classifier. This is a standalone entry point — there
is no `extract.piiRedaction` upstream of it to inherit from the way the
injection classifier and consolidation inherit theirs — so an off-by-
default switch would mean the widest memory egress in the SDK (fact text
PLUS raw conversation) shipping raw unless a client remembered a flag.
Pass `false` to deliberately disable it.

Pass a shared [PiiRedactor](../../../expo/Internal/classes/PiiRedactor.md) to keep placeholder numbering consistent
with other calls in the same session. Either way ONE instance covers a
whole call, so the same value redacts to the same placeholder in the fact
and in the evidence — with two instances entailment would break on every
redacted value.

***

### totalTimeoutMs?

> `optional` **totalTimeoutMs**: `number`

Defined in: [src/lib/memory/verifySupport.ts:288](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#288)

Absolute wall-clock budget across attempts. Default 20s.
