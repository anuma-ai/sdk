# classifyWebSearch

> **classifyWebSearch**(`prompt`: `string`, `options`: `WebSearchClassifierOptions`): `Promise`<[`WebSearchClassification`](../interfaces/WebSearchClassification.md)>

Defined in: [src/lib/chat/webSearchClassifier.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/webSearchClassifier.ts#57)

Classify whether a prompt needs a web search.

Embeds the prompt and compares it against the pre-computed
search and no-search centroid vectors.

## Parameters

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

`prompt`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

`WebSearchClassifierOptions`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`WebSearchClassification`](../interfaces/WebSearchClassification.md)>
