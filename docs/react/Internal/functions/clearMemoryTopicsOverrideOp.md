# clearMemoryTopicsOverrideOp

> **clearMemoryTopicsOverrideOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `memoryId`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/db/memoryVault/operations.ts:685](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#685)

Reset a memory's topics to automatic: clear the `topics_user_managed` flag so
auto-extraction resumes owning its links. Existing links are left in place
(the next extraction pass may add to them). Preserves `updated_at`.

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

`ctx`

</td>
<td>

[`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md)

</td>
</tr>
<tr>
<td>

`memoryId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`boolean`>
