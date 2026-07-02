# linkMemoryEntitiesOp

> **linkMemoryEntitiesOp**(`ctx`: [`EntityOperationsContext`](../interfaces/EntityOperationsContext.md), `memoryId`: `string`, `entityInputs`: readonly [`EntityInput`](../type-aliases/EntityInput.md)\[]): `Promise`<[`StoredEntity`](../interfaces/StoredEntity.md)\[]>

Defined in: [src/lib/db/entities/operations.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#123)

Link a memory to one or more entities. Accepts bare names (back-compat)
or `{ name, kind }` objects. Names are normalized; missing entities are
auto-created (with their kind), and an existing entity's null kind is
back-filled — see upsertEntitiesOp. Idempotent — duplicate
(memory\_id, entity\_id) pairs are skipped.

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

`entityInputs`

</td>
<td>

readonly [`EntityInput`](../type-aliases/EntityInput.md)\[]

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredEntity`](../interfaces/StoredEntity.md)\[]>
