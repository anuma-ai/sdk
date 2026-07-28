# getMemoriesNeedingTopicExtractionOp

> **getMemoriesNeedingTopicExtractionOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `options?`: `object`): `Promise`<[`MemoriesNeedingTopicExtraction`](../interfaces/MemoriesNeedingTopicExtraction.md)>

Defined in: [src/lib/db/memoryVault/operations.ts:1587](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1587)

Sweep query for the background topic-extraction worker: partition the user's
non-deleted memories by what the worker should do with them (see
[MemoriesNeedingTopicExtraction](../interfaces/MemoriesNeedingTopicExtraction.md)). Requires `ctx.entityCtx` for the
entity-links check.

User-managed rows are excluded from the two LLM-facing buckets — the user owns
their topics, including an intentionally empty set — but NOT from
`topicsToRelink` / `topicsBackfill`, which only move a curated row's topics
between the record and the index and never re-derive them. That's why the
ownership filter lives in the partition below rather than in the query: a
restored curated memory is exactly the row whose index must be rebuilt.

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

`options.limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`MemoriesNeedingTopicExtraction`](../interfaces/MemoriesNeedingTopicExtraction.md)>
