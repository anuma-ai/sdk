# SynthesizeProfileOptions

Defined in: [src/lib/memory/synthesizeProfile.ts:196](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#196)

Options for [synthesizeProfile](../functions/synthesizeProfile.md). Auth is the dual [PortalLlmAuth](PortalLlmAuth.md)
pattern — one of `apiKey` / `getToken` is required at runtime.

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

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:204](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#204)

LLM endpoint override.

***

### facets?

> `optional` **facets**: [`ProfileFacet`](ProfileFacet.md)\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:198](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#198)

Facets to synthesize. Defaults to [DEFAULT\_PROFILE\_FACETS](../variables/DEFAULT_PROFILE_FACETS.md).

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/synthesizeProfile.ts:210](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#210)

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

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#208)

Facts recalled per facet before synthesis. Default: 20.

***

### llmModel?

> `optional` **llmModel**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:202](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#202)

Synthesis model. Default: open-weights ling-2.6-flash.

***

### previous?

> `optional` **previous**: [`ProfileDoc`](ProfileDoc.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:200](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#200)

Prior doc for delta refresh. Unchanged sections are reused verbatim.

***

### redactor?

> `optional` **redactor**: [`PiiRedactor`](../../../expo/Internal/classes/PiiRedactor.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:215](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#215)

Pre-publish PII gate. When supplied, each section's text is run through
[PiiRedactor.redactTextAsync](../../../expo/Internal/classes/PiiRedactor.md#redacttextasync) (regex + NER) before it's returned.
Omit only when the caller redacts downstream — `nearby` also moderates
server-side, but the client should never publish un-gated text.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:206](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#206)

Scopes to draw facts from. Default: \["private"].
