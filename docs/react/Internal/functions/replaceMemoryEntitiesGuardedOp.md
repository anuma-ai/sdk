# replaceMemoryEntitiesGuardedOp

> **replaceMemoryEntitiesGuardedOp**(`ctx`: [`EntityOperationsContext`](../interfaces/EntityOperationsContext.md), `memoryId`: `string`, `entityInputs`: readonly [`EntityInput`](../type-aliases/EntityInput.md)\[]): `Promise`<[`StoredEntity`](../interfaces/StoredEntity.md)\[] | `null`>

Defined in: [src/lib/db/entities/operations.ts:215](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#215)

REPLACE a memory's entity links with an auto-derived set — the topic
worker's write primitive. Unlike [setMemoryEntitiesOp](setMemoryEntitiesOp.md) it does NOT
mark the memory user-managed (the pass is automatic), and unlike
[linkMemoryEntitiesOp](linkMemoryEntitiesOp.md) it removes stale links, so re-extracting an
edited memory drops entities its previous content mentioned ("works at
Acme" → "works at Globex" must unlink Acme). Insert-missing and
destroy-stale are batched in ONE writer, after the same in-write guard as
the link op (user-managed / deleted / absent / read-fault ⇒ skip).

Returns the linked entities (\[] for an answered-empty set), or null when
the guard skipped — callers must treat null as "not persisted" (e.g. don't
stamp `topics_extracted_at`).

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

`Promise`<[`StoredEntity`](../interfaces/StoredEntity.md)\[] | `null`>
