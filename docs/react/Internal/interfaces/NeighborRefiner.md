# NeighborRefiner

Defined in: [src/lib/memory/graphTraversal.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#117)

Picks which candidate neighbor entities to expand at a traversal hop. Given
the query and the deterministically-ranked candidate entity names, return the
subset (≤ `limit`) to expand. Must be resilient: [traverseGraphLane](../functions/traverseGraphLane.md)
falls back to the deterministic top-`limit` on a throw or empty return.

## Methods

### refine()

> **refine**(`query`: `string`, `candidates`: `string`\[], `limit`: `number`): `Promise`<`string`\[]>

Defined in: [src/lib/memory/graphTraversal.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#118)

**Parameters**

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

`query`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`candidates`

</td>
<td>

`string`\[]

</td>
</tr>
<tr>
<td>

`limit`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`\[]>
