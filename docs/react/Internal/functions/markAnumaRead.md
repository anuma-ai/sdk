# markAnumaRead

> **markAnumaRead**(`store`: [`ChatStore`](../interfaces/ChatStore.md), `sortKey`: `number`, `options`: `object`): `Promise`<[`ChatSnapshot`](../interfaces/ChatSnapshot.md)>

Defined in: src/lib/chatStore/anuma.ts:79

Moves the read marker up to `sortKey`; it never moves down, and a concurrent write is re-read and re-applied.

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

`store`

</td>
<td>

[`ChatStore`](../interfaces/ChatStore.md)

</td>
</tr>
<tr>
<td>

`sortKey`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.now?`

</td>
<td>

() => `number`

</td>
</tr>
<tr>
<td>

`options.signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`ChatSnapshot`](../interfaces/ChatSnapshot.md)>
