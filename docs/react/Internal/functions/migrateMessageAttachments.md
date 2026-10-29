# migrateMessageAttachments

> **migrateMessageAttachments**(`options`: [`MessageAttachmentMigrationOptions`](../interfaces/MessageAttachmentMigrationOptions.md)): `Promise`<[`MessageAttachmentMigrationResult`](../interfaces/MessageAttachmentMigrationResult.md)>

Defined in: [src/lib/chatStore/vaultAttachments.ts:372](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultAttachments.ts#372)

Copies a message's local files into vault and records their ids on the message; safe to rerun after a crash without uploading a file twice.

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

`options`

</td>
<td>

[`MessageAttachmentMigrationOptions`](../interfaces/MessageAttachmentMigrationOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`MessageAttachmentMigrationResult`](../interfaces/MessageAttachmentMigrationResult.md)>
