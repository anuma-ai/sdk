# getVaultRankingProjectionsOp

> **getVaultRankingProjectionsOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `options?`: `object`): `Promise`<[`RankableVaultMemory`](../interfaces/RankableVaultMemory.md)\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:712](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#712)

Return content-free [RankableVaultMemory](../interfaces/RankableVaultMemory.md) projections for recall
ranking — the "rank first, decrypt last" half of on-demand recall (#5017).

Mirrors [getAllVaultMemoriesOp](getAllVaultMemoriesOp.md)'s query EXACTLY (same
`baseVaultConditions` — `is_deleted=false` + `user_id` scoping — plus the
same scope/folder filters and ordering) so the candidate SET is identical to
the whole-vault read; the ONLY difference is that `content` is never
decrypted (and never returned). Callers rank on `embedding`, then decrypt the
top-N winners on demand via [getVaultMemoryOp](getVaultMemoryOp.md).

Because it reuses `baseVaultConditions`, deleted and cross-user rows are
excluded here just as they are from every other read path — a no-decrypt op
that skipped these would leak embeddings for rows the caller can't see.

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

`options?`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.folderId?`

</td>
<td>

`string` | `null`

</td>
</tr>
<tr>
<td>

`options.limit?`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`options.scopes?`

</td>
<td>

`string`\[]

</td>
</tr>
<tr>
<td>

`options.since?`

</td>
<td>

`Date`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`RankableVaultMemory`](../interfaces/RankableVaultMemory.md)\[]>
