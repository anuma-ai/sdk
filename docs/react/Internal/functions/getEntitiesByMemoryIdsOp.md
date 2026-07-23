# getEntitiesByMemoryIdsOp

> **getEntitiesByMemoryIdsOp**(`ctx`: [`EntityOperationsContext`](../interfaces/EntityOperationsContext.md), `memoryIds`: readonly `string`\[]): `Promise`<`Map`<`string`, `Set`<`string`>>>

Defined in: [src/lib/db/entities/operations.ts:421](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#421)

Reverse of [getMemoriesByEntityNamesOp](getMemoriesByEntityNamesOp.md): given a set of memory IDs
(e.g. the current BFS frontier), return each memory's set of linked
canonical entity names. This is the missing primitive for multi-hop graph
traversal (PR4) — one step outward from a memory to its neighbor entities,
which the traversal then expands to reach topically-adjacent memories.

Empty input returns an empty map. Memory IDs with no links contribute
nothing (they simply don't appear as keys).

Multi-user safety mirrors [getMemoriesByEntityNamesOp](getMemoriesByEntityNamesOp.md) exactly: when
`ctx.userId` is set, only `memory_entity` rows owned by that user are
followed (with the same `allowUnscopedRows` LokiJS escape hatch for pre-v31
rows whose `user_id` backfill was a no-op). Without the filter the reverse
lookup would leak entity links written by other users.

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

[`EntityOperationsContext`](../interfaces/EntityOperationsContext.md)

</td>
</tr>
<tr>
<td>

`memoryIds`

</td>
<td>

readonly `string`\[]

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`Map`<`string`, `Set`<`string`>>>
