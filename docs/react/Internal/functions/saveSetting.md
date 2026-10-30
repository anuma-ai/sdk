# saveSetting

> **saveSetting**(`store`: [`ChatStore`](../interfaces/ChatStore.md), `section`: `string`, `data`: `object`, `signal?`: `AbortSignal`): `Promise`<[`Setting`](../interfaces/Setting.md)>

Defined in: [src/lib/chatStore/settings.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/settings.ts#43)

Replaces one section with `data`; the last save of a section wins across devices.

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

`section`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`data`

</td>
<td>

{\[`key`: `string`]: [`ChatJson`](../type-aliases/ChatJson.md); }

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

`Promise`<[`Setting`](../interfaces/Setting.md)>
