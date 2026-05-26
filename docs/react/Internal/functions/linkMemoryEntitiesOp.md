# linkMemoryEntitiesOp

> **linkMemoryEntitiesOp**(`ctx`: [`EntityOperationsContext`](../interfaces/EntityOperationsContext.md), `memoryId`: `string`, `entityNames`: `string`\[]): `Promise`<[`StoredEntity`](../interfaces/StoredEntity.md)\[]>

Defined in: [src/lib/db/entities/operations.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#71)

Link a memory to one or more entities. Names are normalized; missing
entities are auto-created. Idempotent — duplicate (memory\_id, entity\_id)
pairs are skipped.

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

`memoryId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`entityNames`

</td>
<td>

`string`\[]

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredEntity`](../interfaces/StoredEntity.md)\[]>
