# getAllVaultMemoriesOp

> **getAllVaultMemoriesOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `options?`: `object`): `Promise`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md)\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:378](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#378)

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`ctx`

</td>
<td>

[`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md)

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

`object`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.folderId?`

</td>
<td>

`string` | `null`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.includeDeleted?`

</td>
<td>

`boolean`

</td>
<td>

Include soft-deleted memories in the result (each carries
`isDeleted: true`). Default `false` — deleted rows are excluded, as
they are from every other read path. Used by the Memory Graph to
render "forgotten" nodes; ordinary consumers should leave this off.

</td>
</tr>
<tr>
<td>

`options.limit?`

</td>
<td>

`number`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.scopes?`

</td>
<td>

`string`\[]

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.since?`

</td>
<td>

`Date`

</td>
<td>

‐

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md)\[]>
