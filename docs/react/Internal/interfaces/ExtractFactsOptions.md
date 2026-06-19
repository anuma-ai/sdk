# ExtractFactsOptions

Defined in: [src/lib/memory/autoExtract.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#126)

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

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memory/autoExtract.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#127)

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/autoExtract.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#130)

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

### model?

> `optional` **model**: `string`

Defined in: [src/lib/memory/autoExtract.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#128)

***

### piiRedaction?

> `optional` **piiRedaction**: `boolean` | `PiiRedactor`

Defined in: [src/lib/memory/autoExtract.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#145)

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
