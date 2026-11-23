# listAppFiles

> **listAppFiles**(`store`: [`ChatStore`](../interfaces/ChatStore.md), `conversationId`: `string`, `signal?`: `AbortSignal`, `attachments?`: [`VaultAttachments`](../interfaces/VaultAttachments.md)): `Promise`<[`AppFile`](../interfaces/AppFile.md)\[]>

Defined in: [src/lib/chatStore/appFiles.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/appFiles.ts#169)

Every live file of one conversation; pass `attachments` to read files stored as vault attachments.

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
