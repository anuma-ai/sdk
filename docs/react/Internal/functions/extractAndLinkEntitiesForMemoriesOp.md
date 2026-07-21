# extractAndLinkEntitiesForMemoriesOp

> **extractAndLinkEntitiesForMemoriesOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `memoryIds`: readonly `string`\[], `options`: [`TopicExtractOptions`](../interfaces/TopicExtractOptions.md) & `object`): `Promise`<[`TopicExtractionRunResult`](../interfaces/TopicExtractionRunResult.md)>

Defined in: [src/lib/memory/topicExtract.ts:258](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#258)

Run LLM topic extraction over existing vault memories and persist the
results: REPLACE each memory's auto-managed entity links with the extracted
set (via [replaceMemoryEntitiesGuardedOp](replaceMemoryEntitiesGuardedOp.md) — an edited memory drops the
entities its previous content mentioned) and stamp `topics_extracted_at`.

User intent is enforced twice: rows already user-managed are skipped up
front, and the replace write re-checks the vault row INSIDE its writer
(user-managed / deleted / absent ⇒ null, and the memory is neither linked
nor stamped) so a manual topic edit or delete landing during the LLM
round-trip wins — a manual edit's own replace semantics also erase anything
this pass linked just before it. The watermark is captured BEFORE contents
are read: an edit landing mid-run keeps `updated_at` > stamp, so the next
sweep re-extracts it rather than trusting this run's stale read.

Requires `ctx.entityCtx`. Contents are decrypted via the ctx's wallet
fields, exactly like the vault read ops; a memory whose decryption fails is
skipped (retried next sweep), not fatal to the run.

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

`options`

</td>
<td>

[`TopicExtractOptions`](../interfaces/TopicExtractOptions.md) & `object`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`TopicExtractionRunResult`](../interfaces/TopicExtractionRunResult.md)>
