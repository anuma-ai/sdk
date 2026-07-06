# classifyWebSearchBatch

> **classifyWebSearchBatch**(`prompts`: `string`\[], `options`: `WebSearchClassifierOptions`): `Promise`<[`WebSearchClassification`](../interfaces/WebSearchClassification.md)\[]>

Defined in: [src/lib/chat/webSearchClassifier.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/webSearchClassifier.ts#70)

Batch-classify multiple prompts. Embeds all prompts in one batch
call for efficiency.

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

`prompts`

</td>
<td>

`string`\[]

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

`Promise`<[`WebSearchClassification`](../interfaces/WebSearchClassification.md)\[]>
