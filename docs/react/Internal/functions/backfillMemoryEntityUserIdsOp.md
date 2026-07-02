# backfillMemoryEntityUserIdsOp

> **backfillMemoryEntityUserIdsOp**(`ctx`: [`EntityOperationsContext`](../interfaces/EntityOperationsContext.md), `vaultMemoryCollection`: `object`): `Promise`<`number`>

Defined in: [src/lib/db/entities/operations.ts:215](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/operations.ts#215)

Backfill `memory_entity.user_id` from the parent vault row's user\_id.
Idempotent — only touches rows where user\_id is null.

Why this exists: the v31 schema migration backfills via
`unsafeExecuteSql`, which is a no-op on the LokiJS (web) adapter. Native
SQLite installs have already been filled by the migration; web installs
upgrading through v31 keep `user_id=null` on every pre-existing
`memory_entity` row until this helper runs.

Consumers wiring an `EntityOperationsContext` with `userId` set are
obliged to call this once on first use — `getMemoriesByEntityNamesOp`
strictly filters by `user_id`, so unstamped rows are otherwise
invisible to the W5 graph lane.

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

`vaultMemoryCollection`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`vaultMemoryCollection.find`

</td>
<td>

(`id`: `string`) => `Promise`<{ `userId?`: `string` | `null`; }>

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`number`>
