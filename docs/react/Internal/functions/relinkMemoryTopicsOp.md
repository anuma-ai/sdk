# relinkMemoryTopicsOp

> **relinkMemoryTopicsOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `memoryIds`: readonly `string`\[]): `Promise`<`string`\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:2072](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2072)

Rebuild the `memory_entity` index for the sweep's `topicsToRelink` rows from
each row's `topics` record — the restored-device repair. No LLM call: every
name already lives on the row.

Writes NOTHING to `memory_vault`, deliberately. Restored rows are written
`_status: 'synced'`, so touching them would mark the whole vault dirty and
re-upload it (embeddings included) after every migration — the index is
device-local state and rebuilding it is not a change to the memory.
`topics_user_managed` in particular is left exactly as it arrived, so the
autotagger stays off a curated memory whose links this just restored.

Skips deleted, foreign-user, and record-less rows. Returns the ids relinked.

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
