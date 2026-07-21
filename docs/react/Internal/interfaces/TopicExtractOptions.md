# TopicExtractOptions

Defined in: [src/lib/memory/topicExtract.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#64)

Options for the topic-extraction LLM call. Auth follows the portal dual
pattern — one of `apiKey` / `getToken` is required (see [PortalLlmAuth](PortalLlmAuth.md)).

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

Defined in: [src/lib/memory/topicExtract.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#74)

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

Defined in: [src/lib/memory/topicExtract.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#65)

***

### existingEntityNames?

> `optional` **existingEntityNames**: readonly `string`\[]

Defined in: [src/lib/memory/topicExtract.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#82)

The user's existing entity vocabulary (canonical names). Included in the
prompt so independent batches reuse canonical names instead of fragmenting
("ZetaChain" / "Zetachain" / "zeta chain" as three graph nodes). Truncated
to the first MAX\_VOCABULARY\_NAMES names — pass the most-linked
names first.

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/topicExtract.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#70)

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

Defined in: [src/lib/memory/portalLlm.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#86)

Function to get an auth token (e.g., Privy's getIdentityToken). Token is sent as `Authorization: Bearer`.

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`getToken`](PortalLlmAuth.md#gettoken)

***

### maxAttempts?

> `optional` **maxAttempts**: `number`

Defined in: [src/lib/memory/topicExtract.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#71)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/memory/topicExtract.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#68)

Defaults to DEFAULT\_EXTRACTION\_MODEL — the sanctioned extraction
model. Don't point this at a second model without an eval.

***

### piiRedaction?

> `optional` **piiRedaction**: `boolean` | [`PiiRedactor`](../../../expo/Internal/classes/PiiRedactor.md)

Defined in: [src/lib/memory/topicExtract.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#90)

When set, PII in memory contents is replaced with tagged placeholders
before the LLM call and returned entity names are de-anonymized (entities
whose placeholders can't be restored are dropped) — mirrors
`ExtractFactsOptions.piiRedaction`. Vault contents hold REAL values, so
callers that redact the conversation pipeline must redact this pass too.

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/lib/memory/topicExtract.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#72)

***

### totalTimeoutMs?

> `optional` **totalTimeoutMs**: `number`

Defined in: [src/lib/memory/topicExtract.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#73)
