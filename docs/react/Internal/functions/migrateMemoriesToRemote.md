# migrateMemoriesToRemote

> **migrateMemoriesToRemote**(`options`: [`MemoryMigrationOptions`](../interfaces/MemoryMigrationOptions.md)): `Promise`<[`MemoryMigrationResult`](../interfaces/MemoryMigrationResult.md)>

Defined in: [src/lib/memory/store/remoteMigration.ts:484](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#484)

Upload this device's local memories to nearby and, once nearby holds every one, make it authoritative.

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

[`MemoryMigrationOptions`](../interfaces/MemoryMigrationOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`MemoryMigrationResult`](../interfaces/MemoryMigrationResult.md)>

## Throws

RemoteMemoryError `key_mismatch` when the account already uses another key.
