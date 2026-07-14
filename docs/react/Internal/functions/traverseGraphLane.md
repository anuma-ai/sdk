# traverseGraphLane

> **traverseGraphLane**(`query`: `string`, `entityCtx`: [`EntityOperationsContext`](../interfaces/EntityOperationsContext.md), `options`: [`GraphTraversalOptions`](../interfaces/GraphTraversalOptions.md)): `Promise`<`string`\[]>

Defined in: [src/lib/memory/graphTraversal.ts:162](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#162)

Bounded multi-hop entity-graph traversal. Returns an ordered list of memory
IDs (best first) — the SAME output shape as the single-hop lane, so nothing
downstream changes. The caller passes it through as `entityRanking` for RRF
fusion with the cosine/BM25 head.

With `maxHops <= 1` this returns the seed ordering verbatim, making it a
drop-in equivalent of the single-hop lane (the regression guard). The PR5
default is 2 (one expansion beyond the seed).

Returns an empty array when the query has no extractable entities or no stored
memory shares a seed entity.

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

`query`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`entityCtx`

</td>
<td>

[`EntityOperationsContext`](../interfaces/EntityOperationsContext.md)

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`GraphTraversalOptions`](../interfaces/GraphTraversalOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`\[]>
