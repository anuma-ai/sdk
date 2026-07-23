# SynthesizeProfileOptions

Defined in: [src/lib/memory/synthesizeProfile.ts:219](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#219)

Options for [synthesizeProfile](../functions/synthesizeProfile.md). Auth is the dual [PortalLlmAuth](PortalLlmAuth.md)
pattern — one of `apiKey` / `getToken` is required at runtime.

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

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:227](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#227)

LLM endpoint override.

***

### facets?

> `optional` **facets**: [`ProfileFacet`](ProfileFacet.md)\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:221](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#221)

Facets to synthesize. Defaults to [DEFAULT\_PROFILE\_FACETS](../variables/DEFAULT_PROFILE_FACETS.md).

***

### factTypeWeights?

> `optional` **factTypeWeights**: `Partial`<`Record`<`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`, `number`>>

Defined in: [src/lib/memory/synthesizeProfile.ts:244](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#244)

Per-FactType score multipliers for facet recall. Default:
[DEFAULT\_PROFILE\_FACT\_TYPE\_WEIGHTS](../variables/DEFAULT_PROFILE_FACT_TYPE_WEIGHTS.md) (durable types boosted).
Does not change global chat `recall()` defaults.

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/synthesizeProfile.ts:233](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#233)

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

Defined in: [src/lib/memory/portalLlm.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#86)

Function to get an auth token (e.g., Privy's getIdentityToken). Token is sent as `Authorization: Bearer`.

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`getToken`](PortalLlmAuth.md#gettoken)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:231](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#231)

Facts recalled per facet before synthesis. Default: 20.

***

### llmModel?

> `optional` **llmModel**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:225](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#225)

Synthesis model. Default: open-weights ling-2.6-flash.

***

### previous?

> `optional` **previous**: [`ProfileDoc`](ProfileDoc.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:223](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#223)

Prior doc for delta refresh. Unchanged sections are reused verbatim.

***

### proofCountAlpha?

> `optional` **proofCountAlpha**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:249](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#249)

Proof-count α for facet recall. Default: [DEFAULT\_PROFILE\_PROOF\_ALPHA](../variables/DEFAULT_PROFILE_PROOF_ALPHA.md)
(0.2). Chat recall stays at 0.1.

***

### redactor?

> `optional` **redactor**: [`PiiRedactor`](../../../expo/Internal/classes/PiiRedactor.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:238](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#238)

Pre-publish PII gate. When supplied, each section's text is run through
[PiiRedactor.redactTextAsync](../../../expo/Internal/classes/PiiRedactor.md#redacttextasync) (regex + NER) before it's returned.
Omit only when the caller redacts downstream — `nearby` also moderates
server-side, but the client should never publish un-gated text.

***

### reviewedMemoryIds?

> `optional` **reviewedMemoryIds**: readonly `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:256](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#256)

When non-empty, intersect each facet's recalled evidence with this id set
before the LLM runs (publish-review gate). Empty intersection → empty
section (legitimate no-evidence), not a stale fallback. Omit / empty →
no gate.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:229](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#229)

Scopes to draw facts from. Default: \["private"].
