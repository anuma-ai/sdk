# seedAppFilesToVault

> **seedAppFilesToVault**(`database`: `Database`, `store`: [`ChatStore`](../interfaces/ChatStore.md), `signal?`: `AbortSignal`): `Promise`<[`AppFileSeedResult`](../interfaces/AppFileSeedResult.md)>

Defined in: [src/lib/chatStore/seedAppFiles.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/seedAppFiles.ts#95)

Uploads this device's app files and saved tools that vault lacks or holds an older edit of,
keeping each one's own edit time so the newest copy across devices wins.

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

`database`

</td>
<td>

`Database`

</td>
</tr>
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

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`AppFileSeedResult`](../interfaces/AppFileSeedResult.md)>
