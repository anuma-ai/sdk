# setMemoryVisibilityOp

> **setMemoryVisibilityOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `id`: `string`, `opts`: `object`): `Promise`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md) | `null`>

Defined in: [src/lib/db/memoryVault/operations.ts:1289](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1289)

Set a memory's People Nearby visibility (and optionally its twin opt-in).

This is the ONLY sanctioned write path for `visibility` — it keeps the
`published_at` bookkeeping consistent: transitioning to `public`
stamps `published_at` (kept if already set); transitioning to `private`
clears it (revoke). The server index remains the authority for what IS
published — this records the user's intent for the reconciler to act on.

Preserves `updated_at`: a visibility change is metadata, not a
re-observation, so it must not inflate the recency multiplier (mirrors
[setMemoryEntitiesOp](setMemoryEntitiesOp.md)).

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

`id`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`opts`

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

`opts.twinOptIn?`

</td>
<td>

`boolean`

</td>
<td>

If provided, sets the twin opt-in flag alongside the visibility.

</td>
</tr>
<tr>
<td>

`opts.visibility`

</td>
<td>

[`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md)

</td>
<td>

‐

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md) | `null`>
