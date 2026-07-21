# linkMemoryEntitiesOp

> **linkMemoryEntitiesOp**(`ctx`: [`EntityOperationsContext`](../interfaces/EntityOperationsContext.md), `memoryId`: `string`, `entityInputs`: readonly [`EntityInput`](../type-aliases/EntityInput.md)\[], `options?`: `object`): `Promise`<[`StoredEntity`](../interfaces/StoredEntity.md)\[]>

Defined in: [src/lib/db/entities/operations.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#137)

Link a memory to one or more entities. Accepts bare names (back-compat)
or `{ name, kind }` objects. Names are normalized; missing entities are
auto-created (with their kind), and an existing entity's null kind is
back-filled — see upsertEntitiesOp. Idempotent — duplicate
(memory\_id, entity\_id) pairs are skipped.

`options.unlessTopicsUserManaged` re-checks the memory's vault row INSIDE
the serialized writer and skips link creation when the row is user-managed
(`topics_user_managed`), soft-deleted, or absent. Auto paths (extraction,
topic worker) need this: a pre-call check races the LLM round-trip —
`setMemoryEntitiesOp` sets the flag in its own writer and a delete can land
mid-call (orphaning links the cascade already swept) — so only an in-write
check guarantees a user's manual edit or delete can't be grafted over. The
row read fails CLOSED (skip links) so a transient fault never attaches
topics to a memory we couldn't verify. Entity upserts still happen
(vocabulary is global); returns \[] when links were skipped.

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
<tr>
<td>

`options?`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.unlessTopicsUserManaged?`

</td>
<td>

`boolean`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredEntity`](../interfaces/StoredEntity.md)\[]>
