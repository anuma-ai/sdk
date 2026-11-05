# getAppFile

> **getAppFile**(`store`: [`ChatStore`](../interfaces/ChatStore.md), `conversationId`: `string`, `path`: `string`, `signal?`: `AbortSignal`): `Promise`<[`AppFile`](../interfaces/AppFile.md) | `null`>

Defined in: [src/lib/chatStore/appFiles.ts:163](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/appFiles.ts#163)

One conversation file, or null when vault holds none at that path.

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

`conversationId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`path`

</td>
<td>

`string`

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

`Promise`<[`AppFile`](../interfaces/AppFile.md) | `null`>
