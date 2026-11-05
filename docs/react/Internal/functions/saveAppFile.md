# saveAppFile

> **saveAppFile**(`store`: [`ChatStore`](../interfaces/ChatStore.md), `file`: `object`, `signal?`: `AbortSignal`): `Promise`<[`AppFile`](../interfaces/AppFile.md)>

Defined in: [src/lib/chatStore/appFiles.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/appFiles.ts#173)

Creates or replaces a conversation file; the last save of a path wins across devices.

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

`file`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`file.content`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`file.conversationId?`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`file.path?`

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

`Promise`<[`AppFile`](../interfaces/AppFile.md)>
