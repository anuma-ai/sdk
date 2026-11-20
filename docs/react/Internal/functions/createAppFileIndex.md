# createAppFileIndex

> **createAppFileIndex**(`store`: [`ChatStore`](../interfaces/ChatStore.md), `attachments?`: [`VaultAttachments`](../interfaces/VaultAttachments.md)): [`AppFileIndex`](../interfaces/AppFileIndex.md)

Defined in: [src/lib/chatStore/appFiles.ts:188](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/appFiles.ts#188)

Keeps every app file of the account current from the changes feed; pass `attachments` to read files stored as vault attachments.

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

`attachments?`

</td>
<td>

[`VaultAttachments`](../interfaces/VaultAttachments.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`AppFileIndex`](../interfaces/AppFileIndex.md)
