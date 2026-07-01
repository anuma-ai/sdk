# classifyCryptoPriceBatch

> **classifyCryptoPriceBatch**(`prompts`: `string`\[], `options`: `CryptoPriceClassifierOptions`): `Promise`<[`CryptoPriceClassification`](../interfaces/CryptoPriceClassification.md)\[]>

Defined in: [src/lib/chat/cryptoPriceClassifier.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/cryptoPriceClassifier.ts#74)

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

`CryptoPriceClassifierOptions`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`CryptoPriceClassification`](../interfaces/CryptoPriceClassification.md)\[]>
