# previewToolSelection

> **previewToolSelection**(`options`: `object`): `Promise`<{ `clientToolNames`: `string`\[]; `serverToolNames`: `string`\[]; }>

Defined in: [src/react/useChatStorage.ts:201](https://github.com/anuma-ai/sdk/blob/main/src/react/useChatStorage.ts#201)

Preview which tools `useChatStorage` will include for a given prompt,
without making the actual chat request.

Runs the exact same client + server tool selection pipeline that
`useChatStorage`'s `sendMessage` runs internally — same embedding,
same `autoFilterClientTools` call, same server-tools branch — so the
returned names are guaranteed to match what a real request would
include for that prompt + config.

Intended for debug UIs ("show me what the model will see for this
prompt"). Pass the same `clientTools`, `serverToolsFilter`,
`extraToolSets`, and `activeToolSets` you pass to `useChatStorage`
so the result is faithful.

Caveats:

* For server tools, this only mirrors the dynamic `findMatchingTools`
  path (the one used for the responses API in `sendMessage`). If your
  serverToolsFilter is a function, it's invoked directly with the
  prompt embedding.
* Embedding generation hits the same `/embeddings` endpoint as the
  real request; pass a shared `clientToolEmbeddingsCache` if you call
  this repeatedly to avoid re-embedding tool descriptions.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`options`

</td>
<td>

`object`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.activeToolSets?`

</td>
<td>

`string`\[]

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.apiKey?`

</td>
<td>

`string`

</td>
<td>

X-API-Key auth (server-side / test harnesses). Provide this or `getToken`.

</td>
</tr>
<tr>
<td>

`options.baseUrl?`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.clientToolEmbeddingsCache?`

</td>
<td>

`Map`<`string`, `number`\[]>

</td>
<td>

Optional cache of tool-description embeddings, shared across calls.

</td>
</tr>
<tr>
<td>

`options.clientTools?`

</td>
<td>

[`LlmapiChatCompletionTool`](../../../client/Internal/type-aliases/LlmapiChatCompletionTool.md)\[]

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.embeddingModel?`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.extraToolSets?`

</td>
<td>

[`ToolSet`](../interfaces/ToolSet.md)\[]

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.getToken?`

</td>
<td>

() => `Promise`<`string` | `null`>

</td>
<td>

Bearer-token auth (browser sessions). Provide this or `apiKey`.

</td>
</tr>
<tr>
<td>

`options.prompt`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.serverToolsConfig?`

</td>
<td>

{ `cacheExpirationMs?`: `number`; `deferLoading?`: `DeferLoadingConfig`; }

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.serverToolsConfig.cacheExpirationMs?`

</td>
<td>

`number`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.serverToolsConfig.deferLoading?`

</td>
<td>

`DeferLoadingConfig`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.serverToolsFilter?`

</td>
<td>

`string`\[] | [`ServerToolsFilterFn`](../type-aliases/ServerToolsFilterFn.md)

</td>
<td>

‐

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<{ `clientToolNames`: `string`\[]; `serverToolNames`: `string`\[]; }>
