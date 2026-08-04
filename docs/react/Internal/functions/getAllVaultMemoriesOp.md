# getAllVaultMemoriesOp

> **getAllVaultMemoriesOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `options?`: `object`): `Promise`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md)\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:623](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#623)

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
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
<td>

‐

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

`object`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.factTypes?`

</td>
<td>

`string`\[]

</td>
<td>

Typed memory (PR1) — restrict to these fact types. Omit for no filter.

</td>
</tr>
<tr>
<td>

`options.folderId?`

</td>
<td>

`string` | `null`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.includeArchived?`

</td>
<td>

`boolean`

</td>
<td>

Include archived (decayed) memories. Default `false` (PR1 choke point).

</td>
</tr>
<tr>
<td>

`options.includeDeleted?`

</td>
<td>

`boolean`

</td>
<td>

Include soft-deleted memories in the result (each carries
`isDeleted: true`). Default `false` — deleted rows are excluded, as
they are from every other read path. Used by the Memory Graph to
render "forgotten" nodes; ordinary consumers should leave this off.

</td>
</tr>
<tr>
<td>

`options.includeQuarantined?`

</td>
<td>

`boolean`

</td>
<td>

Include quarantined memories. Default `false` (PR1 choke point).

</td>
</tr>
<tr>
<td>

`options.includeSuperseded?`

</td>
<td>

`boolean`

</td>
<td>

Include A2-superseded memories (each carries `supersededBy`). Default
`false` — superseded rows are excluded, as they are from recall/dedup.
Used by a "memory history" view to render retired facts.

</td>
</tr>
<tr>
<td>

`options.limit?`

</td>
<td>

`number`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.memoryIds?`

</td>
<td>

readonly `string`\[]

</td>
<td>

Restrict to these ids — the caller's own candidate set, applied at LOAD
time so ranking and top-K happen INSIDE it.

Exists for topic-scoped recall: topic membership lives in the
`memory_entity` join, which this table can't be filtered on, so the
caller resolves the ids and hands them down. Post-filtering a ranked
result instead is not equivalent — top-K would be chosen across the whole
vault first, and a narrow scope would come back empty whenever its
memories didn't independently win on relevance.

An EMPTY array is a real value meaning "nothing is eligible" and returns
no rows; omit the option for no filter.

</td>
</tr>
<tr>
<td>

`options.scopes?`

</td>
<td>

`string`\[]

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.since?`

</td>
<td>

`Date`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.visibility?`

</td>
<td>

[`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md)\[]

</td>
<td>

Filter by People Nearby visibility. Legacy rows with a NULL column
count as "private". Used by the publish reconciler to fetch the
published set to diff against the server index.

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md)\[]>
