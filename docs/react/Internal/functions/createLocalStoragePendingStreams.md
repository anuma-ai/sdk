# createLocalStoragePendingStreams

> **createLocalStoragePendingStreams**(`key`: `string`, `storage`: `KeyValueStorage` | `null`, `now`: () => `number`): [`PendingStreamStore`](../interfaces/PendingStreamStore.md)

Defined in: [src/lib/chat/pendingStreams.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/pendingStreams.ts#59)

A [PendingStreamStore](../interfaces/PendingStreamStore.md) kept in `localStorage` (or any compatible storage).

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Default value</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`key`

</td>
<td>

`string`

</td>
<td>

`"anuma:pending-streams"`

</td>
</tr>
<tr>
<td>

`storage`

</td>
<td>

`KeyValueStorage` | `null`

</td>
<td>

`...`

</td>
</tr>
<tr>
<td>

`now`

</td>
<td>

() => `number`

</td>
<td>

`Date.now`

</td>
</tr>
</tbody>
</table>

## Returns

[`PendingStreamStore`](../interfaces/PendingStreamStore.md)
