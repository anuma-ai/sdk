# setMemoryEntitiesOp

> **setMemoryEntitiesOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `memoryId`: `string`, `entities`: readonly [`EntityInput`](../type-aliases/EntityInput.md)\[]): `Promise`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md) | `null`>

Defined in: [src/lib/db/memoryVault/operations.ts:639](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#639)

Replace a memory's topic (entity) links with a user-chosen set and mark the
memory `topics_user_managed` so auto-extraction stops touching its links.
Replace semantics: the given `entities` become the memory's complete topic
set (pass `[]` to clear all topics — the memory stays user-managed and
unclustered). Requires `ctx.entityCtx`. Preserves `updated_at` so a topic
edit doesn't inflate the recency multiplier.

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
<tr>
<td>

`entities`

</td>
<td>

readonly [`EntityInput`](../type-aliases/EntityInput.md)\[]

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md) | `null`>
