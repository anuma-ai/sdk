# getMemoriesNeedingTopicExtractionOp

> **getMemoriesNeedingTopicExtractionOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `options?`: `object`): `Promise`<[`MemoriesNeedingTopicExtraction`](../interfaces/MemoriesNeedingTopicExtraction.md)>

Defined in: [src/lib/db/memoryVault/operations.ts:728](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#728)

Sweep query for the background topic-extraction worker: partition the
user's non-deleted, non-user-managed memories by what the worker should do
with them (see [MemoriesNeedingTopicExtraction](../interfaces/MemoriesNeedingTopicExtraction.md)). User-managed rows
are never returned — the user owns their topics, including an intentionally
empty set. Requires `ctx.entityCtx` for the entity-links check.

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
