# backfillMemoryTopicsOp

> **backfillMemoryTopicsOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `memoryIds`: readonly `string`\[]): `Promise`<`string`\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:2118](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2118)

Fill `topics` for the sweep's `topicsBackfill` rows from the links they
already carry — the one-time migration of pre-v42 rows, whose topics exist
only in the device-local index and so never reach the server. No LLM call.

Bumps `topics_updated_at` (that's the point — it's what makes the row
upload) while pinning `updated_at`, like every other topic writer. Callers
must pass a `limit`-bounded list: each row's upload carries its embedding, so
an unbounded pass re-uploads the entire vault at once.

`source` is derived from `topics_user_managed`, the only provenance a legacy
row has: a curated memory's topics are recorded as `user`, everything else as
`auto`. Skips deleted, foreign-user, unlinked rows, and rows that already have
a record. Returns the ids filled.

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

[`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md)

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

`Promise`<`string`\[]>
