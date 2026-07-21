# clearMemoryTopicsOverrideOp

> **clearMemoryTopicsOverrideOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `memoryId`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/db/memoryVault/operations.ts:698](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#698)

Reset a memory's topics to automatic: clear the `topics_user_managed` flag so
auto-extraction resumes owning its links. Invalidates `topics_extracted_version`
(→ null) and ensures a NON-NULL `topics_extracted_at`, so the next sweep routes
the row through the stale-version pending path and actually RE-EXTRACTS it via
the LLM. A never-stamped user-curated row (`setMemoryEntitiesOp` marks
user-managed without stamping, so stamp can be null) would otherwise fall
through the sweep's unstamped→`linkedUnstamped` grandfather path (stamped
current, no LLM pass); forcing a stamp when absent avoids that. Existing links
are left in place until the re-extraction replaces them. Preserves `updated_at`.

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
</tbody>
</table>

## Returns

`Promise`<`boolean`>
