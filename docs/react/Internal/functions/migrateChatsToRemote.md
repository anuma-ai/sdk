# migrateChatsToRemote

> **migrateChatsToRemote**(`options`: [`ChatMigrationOptions`](../interfaces/ChatMigrationOptions.md)): `Promise`<[`ChatMigrationResult`](../interfaces/ChatMigrationResult.md)>

Defined in: src/lib/chatStore/migrateChats.ts:356

Copies this device's chats into vault and activates it, mirroring `migrateMemoriesToRemote`:
upload passes until vault reports nothing missing, a final pass under the write barrier,
then activation and the handoff. Resumes from what vault already holds.

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
