# SynthesizeProfileOptions

Defined in: [src/lib/memory/synthesizeProfile.ts:340](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#340)

Options for [synthesizeProfile](../functions/synthesizeProfile.md). Auth is the dual [PortalLlmAuth](PortalLlmAuth.md)
pattern — one of `apiKey` / `getToken` is required at runtime.

## Extends

* [`PortalLlmAuth`](PortalLlmAuth.md)

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/memory/portalLlm.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#113)

Direct API key — sent as `x-api-key` (server-side / CLI usage). Wins when both are provided.

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`apiKey`](PortalLlmAuth.md#apikey)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:348](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#348)

LLM endpoint override.

***

### facets?

> `optional` **facets**: [`ProfileFacet`](ProfileFacet.md)\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:342](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#342)

Facets to synthesize. Defaults to [DEFAULT\_PROFILE\_FACETS](../variables/DEFAULT_PROFILE_FACETS.md).

***

### factTypeWeights?

> `optional` **factTypeWeights**: `Partial`<`Record`<`"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`, `number`>>

Defined in: [src/lib/memory/synthesizeProfile.ts:365](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#365)

Per-FactType score multipliers for facet recall. Default:
[DEFAULT\_PROFILE\_FACT\_TYPE\_WEIGHTS](../variables/DEFAULT_PROFILE_FACT_TYPE_WEIGHTS.md) (durable types boosted).
Does not change global chat `recall()` defaults.

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/synthesizeProfile.ts:354](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#354)

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

Defined in: [src/lib/memory/portalLlm.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#115)

Function to get an auth token (e.g., Privy's getIdentityToken). Token is sent as `Authorization: Bearer`.

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`getToken`](PortalLlmAuth.md#gettoken)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:352](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#352)

Facts recalled per facet before synthesis. Default: 20.

***

### llmModel?

> `optional` **llmModel**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:346](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#346)

Synthesis model. Default: open-weights ling-2.6-flash.

***

### previous?

> `optional` **previous**: [`ProfileDoc`](ProfileDoc.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:344](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#344)

Prior doc for delta refresh. Unchanged sections are reused verbatim.

***

### proofCountAlpha?

> `optional` **proofCountAlpha**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:370](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#370)

Proof-count α for facet recall. Default: [DEFAULT\_PROFILE\_PROOF\_ALPHA](../variables/DEFAULT_PROFILE_PROOF_ALPHA.md)
(0.2). Chat recall stays at 0.1.

***

### redactor?

> `optional` **redactor**: [`PiiRedactor`](../../../expo/Internal/classes/PiiRedactor.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:359](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#359)

Pre-publish PII gate. When supplied, each section's text is run through
[PiiRedactor.redactTextAsync](../../../expo/Internal/classes/PiiRedactor.md#redacttextasync) (regex + NER) before it's returned.
Omit only when the caller redacts downstream — `nearby` also moderates
server-side, but the client should never publish un-gated text.

***

### reviewedMemoryIds?

> `optional` **reviewedMemoryIds**: readonly `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:387](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#387)

Publish-review gate: when SUPPLIED, each facet's recalled evidence is
intersected with this id set before the LLM runs, so synthesis can only draw
on memories the user approved for publication. Empty intersection → empty
section (legitimate no-evidence), not a stale fallback.

Pass the user's published set (e.g. `getAllVaultMemoriesOp(ctx, { visibility: ["public"] })`) to keep a published profile derivable only from published
memories — People Nearby's two-tier model treats `private` memories as never
leaving the device, and a summary derived from them is a derivative that does.

`[]` means "nothing approved" and gates everything OUT (no recall, no LLM
call, empty sections). **Omitting the field is the only way to run ungated**
— that asymmetry is deliberate, so a caller computing a published set can
never accidentally disable the gate by finding it empty.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:350](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#350)

Scopes to draw facts from. Default: \["private"].
