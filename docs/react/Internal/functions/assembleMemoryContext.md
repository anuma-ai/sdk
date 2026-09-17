# assembleMemoryContext

> **assembleMemoryContext**(`options`: [`MemoryContextOptions`](../interfaces/MemoryContextOptions.md)): `Promise`<[`MemoryContextResult`](../interfaces/MemoryContextResult.md)>

Defined in: [src/lib/memory/context.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#56)

Assemble bounded stable/dynamic profile, relevant facts, source excerpts and
prior-turn facts. Lane failures are isolated: an outage cannot replace a
legitimate empty search with unrelated vault contents.

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

`options`

</td>
<td>

[`MemoryContextOptions`](../interfaces/MemoryContextOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`MemoryContextResult`](../interfaces/MemoryContextResult.md)>
