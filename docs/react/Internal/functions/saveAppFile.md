# saveAppFile

> **saveAppFile**(`store`: [`ChatStore`](../interfaces/ChatStore.md), `file`: `object`, `signal?`: `AbortSignal`, `attachments?`: [`VaultAttachments`](../interfaces/VaultAttachments.md)): `Promise`<[`AppFile`](../interfaces/AppFile.md)>

Defined in: [src/lib/chatStore/appFiles.ts:244](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/appFiles.ts#244)

Creates or replaces a conversation file, the last save of a path winning across devices; with `attachments`, a file too large for one record becomes a vault attachment when vault supports it.

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
<tr>
<td>

`attachments?`

</td>
<td>

[`VaultAttachments`](../interfaces/VaultAttachments.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`AppFile`](../interfaces/AppFile.md)>
