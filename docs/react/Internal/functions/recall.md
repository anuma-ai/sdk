# recall

> **recall**(`query`: `string`, `ctx`: [`RecallContext`](../interfaces/RecallContext.md), `options`: [`RecallOptions`](../interfaces/RecallOptions.md)): `Promise`<[`RecallResult`](../interfaces/RecallResult.md)>

Defined in: [src/lib/memory/recall.ts:109](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recall.ts#109)

Single entry point for memory retrieval across facts (vault) and chunks
(engine). Returns a unified, ranked list.

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

`query`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`ctx`

</td>
<td>

[`RecallContext`](../interfaces/RecallContext.md)

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`RecallOptions`](../interfaces/RecallOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`RecallResult`](../interfaces/RecallResult.md)>
