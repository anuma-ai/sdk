# stampTopicsExtractedAtOp

> **stampTopicsExtractedAtOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `memoryIds`: readonly `string`\[], `extractedAt`: `number`): `Promise`<`string`\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:788](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#788)

Stamp `topics_extracted_at` on the given memories — the topic worker calls
this after a successful extraction pass (including zero-entity results, so
quiet memories aren't re-asked every sweep) and to grandfather
`linkedUnstamped` rows without an LLM call. Preserves `updated_at` so a
stamp never inflates the recency multiplier — and never masks a concurrent
content edit from the next sweep. Skips deleted, foreign-user, and
user-managed rows (re-checked inside the serialized writer, so a manual
topic edit that lands mid-pass wins). Returns the IDs actually stamped.
Uses raw queries in chunks to avoid pinning Models in RecordCache (web Pile-2).

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
<tr>
<td>

`extractedAt`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`\[]>
