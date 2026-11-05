# saveSavedTool

> **saveSavedTool**(`store`: [`ChatStore`](../interfaces/ChatStore.md), `id`: `string`, `tool`: [`SavedToolData`](../interfaces/SavedToolData.md), `signal?`: `AbortSignal`): `Promise`<[`SavedTool`](../interfaces/SavedTool.md)>

Defined in: [src/lib/chatStore/appFiles.ts:212](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/appFiles.ts#212)

Creates or replaces a saved tool; the last save wins across devices.

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

`id`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`tool`

</td>
<td>

[`SavedToolData`](../interfaces/SavedToolData.md)

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

`Promise`<[`SavedTool`](../interfaces/SavedTool.md)>
