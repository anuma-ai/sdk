# isRecallableMemory

> **isRecallableMemory**(`m`: `Pick`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md), `"isDeleted"` | `"archivedAt"` | `"supersededBy"` | `"trustTier"` | `"enabled"`>): `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:218](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#218)

True when a memory may reach an answer: live, not archived, superseded or quarantined, and switched on.

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

`m`

</td>
<td>

`Pick`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md), `"isDeleted"` | `"archivedAt"` | `"supersededBy"` | `"trustTier"` | `"enabled"`>

</td>
</tr>
</tbody>
</table>

## Returns

`boolean`
