# migrateChatsToRemote

> **migrateChatsToRemote**(`options`: [`ChatMigrationOptions`](../interfaces/ChatMigrationOptions.md)): `Promise`<[`ChatMigrationResult`](../interfaces/ChatMigrationResult.md)>

Defined in: [src/lib/chatStore/migrateChats.ts:326](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/migrateChats.ts#326)

Copies this device's chats to vault, verifies them under the write barrier, then activates vault and hands the device over.

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

[`ChatMigrationOptions`](../interfaces/ChatMigrationOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`ChatMigrationResult`](../interfaces/ChatMigrationResult.md)>
