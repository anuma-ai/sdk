# MemoryEngineEmbeddingOptions

Defined in: [src/lib/memoryEngine/types.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#52)

Options for embedding generation

Supports two auth methods:

* `getToken`: For Privy identity tokens (uses Authorization: Bearer header)
* `apiKey`: For direct API keys (uses X-API-Key header)

At least one of `getToken` or `apiKey` must be provided.

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/memoryEngine/types.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#56)

Direct API key for server-side usage. Uses X-API-Key header.

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memoryEngine/types.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#58)

Base URL for the API

***

### batchSize?

> `optional` **batchSize**: `number`

Defined in: [src/lib/memoryEngine/types.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#62)

Max texts per API call for batch embeddings (default: 100). Larger arrays are split into chunks.

***

### cache?

> `optional` **cache**: `Map`<`string`, `Float32Array`<`ArrayBufferLike`>>

Defined in: [src/lib/memoryEngine/types.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#74)

Optional in-memory cache for embedding vectors. When provided, texts
are looked up in this map before calling the API, and new embeddings
are stored after generation. Useful when the same texts are embedded
repeatedly (e.g., across eval iterations or re-indexing runs).

Values are stored as `Float32Array` (the embedding model's native
precision) rather than a float64 `number[]`, halving the resident RAM of
the cache with no precision loss. `generateEmbedding(s)` still return
`number[]` at the API boundary, so callers are unaffected.

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/memoryEngine/types.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#54)

Function to get auth token (e.g., Privy's getIdentityToken). Uses Authorization: Bearer header.

**Returns**

`Promise`<`string` | `null`>

***

### maskInput()?

> `optional` **maskInput**: (`text`: `string`) => `string`

Defined in: [src/lib/memoryEngine/types.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#84)

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

Defined in: [src/lib/memoryEngine/types.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#60)

Embedding model to use

***

### onUsage()?

> `optional` **onUsage**: (`usage`: `object`) => `void`

Defined in: [src/lib/memoryEngine/types.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#76)

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

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/lib/memoryEngine/types.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#90)

Deadline, in ms, for EACH embeddings HTTP attempt (default 15000). An
attempt that exceeds it is aborted and counts as a transient failure, so the
bounded retry still applies. `0` disables the deadline.

***

### tokenTimeoutMs?

> `optional` **tokenTimeoutMs**: `number`

Defined in: [src/lib/memoryEngine/types.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#96)

Deadline, in ms, for the `getToken()` read that precedes a request (default
10000\). A provider that never settles rejects instead of hanging the
embedding — and the recall waiting on it. `0` disables the deadline.

***

### totalTimeoutMs?

> `optional` **totalTimeoutMs**: `number`

Defined in: [src/lib/memoryEngine/types.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#106)

Overall deadline, in ms, for one `generateEmbedding` or `generateEmbeddings` call — the token read,
every retry attempt and the backoff between them. Unset (the default) means
only the per-attempt deadlines apply, which is right for background/bulk
embeds. The recall query path sets it (see
`RecallOptions.queryEmbedTotalTimeoutMs`) so an outage degrades a turn to
BM25 within a few seconds instead of ~4 x `timeoutMs`. Batch calls share
one budget across authentication, all chunks, retries and backoff.
