# MemoryEngineEmbeddingOptions

Defined in: [src/lib/memoryEngine/types.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#59)

Options for embedding generation

Supports two auth methods:

* `getToken`: For Privy identity tokens (uses Authorization: Bearer header)
* `apiKey`: For direct API keys (uses X-API-Key header)

At least one of `getToken` or `apiKey` must be provided.

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/memoryEngine/types.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#63)

Direct API key for server-side usage. Uses X-API-Key header.

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memoryEngine/types.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#65)

Base URL for the API

***

### batchSize?

> `optional` **batchSize**: `number`

Defined in: [src/lib/memoryEngine/types.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#69)

Max texts per API call for batch embeddings (default: 100). Larger arrays are split into chunks.

***

### cache?

> `optional` **cache**: `Map`<`string`, `number`\[]>

Defined in: [src/lib/memoryEngine/types.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#76)

Optional in-memory cache for embedding vectors. When provided, texts
are looked up in this map before calling the API, and new embeddings
are stored after generation. Useful when the same texts are embedded
repeatedly (e.g., across eval iterations or re-indexing runs).

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/memoryEngine/types.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#61)

Function to get auth token (e.g., Privy's getIdentityToken). Uses Authorization: Bearer header.

**Returns**

`Promise`<`string` | `null`>

***

### maskInput()?

> `optional` **maskInput**: (`text`: `string`) => `string`

Defined in: [src/lib/memoryEngine/types.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#86)

Optional transform applied to each text immediately before it is sent to
the embeddings endpoint (e.g. `PiiRedactor.maskText`). The cache and result
ordering still key on the original text — only the API request body is
transformed — so callers can keep storing/displaying the original value
while real PII never reaches the server. Used when PII redaction is active.

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

`text`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`string`

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/memoryEngine/types.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#67)

Embedding model to use

***

### onUsage()?

> `optional` **onUsage**: (`usage`: `object`) => `void`

Defined in: [src/lib/memoryEngine/types.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#78)

Called after each embedding API call with the token usage from the response.

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

`usage`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`usage.promptTokens`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`usage.totalTokens`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
