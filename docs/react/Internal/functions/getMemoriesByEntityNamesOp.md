# getMemoriesByEntityNamesOp

> **getMemoriesByEntityNamesOp**(`ctx`: [`EntityOperationsContext`](../interfaces/EntityOperationsContext.md), `entityNames`: readonly `string`\[]): `Promise`<`Map`<`string`, `Set`<`string`>>>

Defined in: [src/lib/db/entities/operations.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#117)

W5 graph-lane read: given a set of entity names (e.g. extracted from
a query), return the set of memory IDs linked to *any* of them, with
a per-memory count of how many of the queried entities they match.

Caller passes the result to `rankByEntityOverlap` to score each
memory via `tanh(0.5 × shared_entity_count)` — this op only does the
cheap "find candidate memories" step and leaves scoring to the
ranker so callers can attach their own kind-weights or alternative
scoring strategies later.

Names are normalized (lowercased, trimmed). Empty input returns an
empty map. Names that don't exist as entities contribute nothing.

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

`entityNames`

</td>
<td>

readonly `string`\[]

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`Map`<`string`, `Set`<`string`>>>
