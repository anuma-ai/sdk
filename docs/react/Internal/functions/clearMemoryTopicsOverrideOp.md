# clearMemoryTopicsOverrideOp

> **clearMemoryTopicsOverrideOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `memoryId`: `string`, `options?`: `object`): `Promise`<`boolean`>

Defined in: [src/lib/db/memoryVault/operations.ts:1244](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1244)

Reset a memory's topics to automatic: clear the `topics_user_managed` flag so
auto-extraction resumes owning its links. Invalidates `topics_extracted_version`
(→ null) and ensures a NON-NULL `topics_extracted_at`, so the next sweep routes
the row through the stale-version pending path and actually RE-EXTRACTS it via
the LLM. A never-stamped user-curated row (`setMemoryEntitiesOp` marks
user-managed without stamping, so stamp can be null) would otherwise fall
through the sweep's unstamped→`linkedUnstamped` grandfather path (stamped
current, no LLM pass); forcing a stamp when absent avoids that. Existing links
are left in place until the re-extraction replaces them. Preserves `updated_at`.

Both stamp columns are DEPRECATED (v42) — `topics_updated_at` subsumes them;
see the schema note. This op's version-invalidation trick is the reason the
earlier plan to exclude them from sync was dropped, and it's the last piece
that has to move before they can go.

`options.unlessTopicsRecorded` declines the reset when the row already has a
`topics` record, re-checked INSIDE the serialized writer. Only the repair path
in [getMemoriesNeedingTopicExtractionOp](getMemoriesNeedingTopicExtractionOp.md) passes it: that path clears the
flag off rows whose curation is provably empty, and a `setMemoryEntitiesOp`
committing in the gap would have written a real record the autotagger must not
be handed. The user-facing reset leaves it off — resetting a memory that HAS
curated topics is the whole point there.

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

`memoryId`

</td>
<td>

`string`

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

`options.unlessTopicsRecorded?`

</td>
<td>

`boolean`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`boolean`>
