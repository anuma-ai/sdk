# classifyWeatherBatch

> **classifyWeatherBatch**(`prompts`: `string`\[], `options`: `WeatherClassifierOptions`): `Promise`<[`WeatherClassification`](../interfaces/WeatherClassification.md)\[]>

Defined in: [src/lib/chat/weatherClassifier.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/weatherClassifier.ts#71)

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

`WeatherClassifierOptions`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`WeatherClassification`](../interfaces/WeatherClassification.md)\[]>
