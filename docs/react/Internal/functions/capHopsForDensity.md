# capHopsForDensity

> **capHopsForDensity**(`maxHops`: `number`, `vaultSize?`: `number`): `number`

Defined in: [src/lib/memory/graphTraversal.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#164)

Cap the hop count on large vaults. Fan-out grows with graph density, so above
[VAULT\_SIZE\_HOP\_CAP](../variables/VAULT_SIZE_HOP_CAP.md) memories we force seed-only traversal (1 hop)
rather than pay an unbounded expansion. A no-op when `vaultSize` is unknown or
within the threshold.

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

`maxHops`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`vaultSize?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

## Returns

`number`
