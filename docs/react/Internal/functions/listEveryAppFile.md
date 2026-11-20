# listEveryAppFile

> **listEveryAppFile**(`store`: [`ChatStore`](../interfaces/ChatStore.md), `signal?`: `AbortSignal`, `attachments?`: [`VaultAttachments`](../interfaces/VaultAttachments.md)): `Promise`<[`AppFile`](../interfaces/AppFile.md)\[]>

Defined in: [src/lib/chatStore/appFiles.ts:215](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/appFiles.ts#215)

Every live file of every conversation, read from the changes feed.

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

`Promise`<[`AppFile`](../interfaces/AppFile.md)\[]>
