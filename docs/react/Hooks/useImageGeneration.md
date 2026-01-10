# useImageGeneration

> **useImageGeneration**(`options`: `object`): [`UseImageGenerationResult`](../Internal/type-aliases/UseImageGenerationResult.md)

Defined in: src/react/useImageGeneration.ts:49

React hook for generating images using the LLM API.

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

`options.baseUrl?`

</td>
<td>

`string`

</td>
<td>

Optional base URL for the API requests.

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

Custom function to get auth token for API calls

</td>
</tr>
<tr>
<td>

`options.onError?`

</td>
<td>

(`error`: `Error`) => `void`

</td>
<td>

Callback function to be called when an unexpected error is encountered.

</td>
</tr>
<tr>
<td>

`options.onFinish?`

</td>
<td>

(`response`: [`LlmapiImageGenerationResponse`](../../client/Internal/type-aliases/LlmapiImageGenerationResponse.md)) => `void`

</td>
<td>

Callback function to be called when the generation finishes successfully.

</td>
</tr>
</tbody>
</table>

## Returns

[`UseImageGenerationResult`](../Internal/type-aliases/UseImageGenerationResult.md)
