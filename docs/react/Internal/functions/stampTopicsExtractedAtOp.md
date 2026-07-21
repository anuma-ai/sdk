# stampTopicsExtractedAtOp

> **stampTopicsExtractedAtOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `memoryIds`: readonly `string`\[], `extractedAt`: `number`, `version`: `number`): `Promise`<`string`\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:828](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#828)

Stamp `topics_extracted_at` (and `topics_extracted_version`) on the given
memories — the topic worker calls this after a successful extraction pass
(including zero-entity results, so quiet memories aren't re-asked every sweep)
and to grandfather `linkedUnstamped` rows without an LLM call. `version`
defaults to [TOPICS\_EXTRACTION\_VERSION](../variables/TOPICS_EXTRACTION_VERSION.md): stamping at the current version
(for both fresh extractions and grandfathered legacy rows) means they aren't
re-extracted until a future version bump. Preserves `updated_at` so a stamp
never inflates the recency multiplier — and never masks a concurrent content
edit from the next sweep. Skips deleted, foreign-user, and user-managed rows.
Returns the IDs actually stamped.

ALL eligibility AND `updated_at` are read from the LIVE Model inside the
serialized writer — never a pre-writer snapshot. Writers are serialized, so
a content edit or topic-override that commits before this writer runs is
observed here: its fresh `updated_at` is preserved (so the next sweep's
`updated_at > stamp` check still fires) and a mid-pass user-managed flip
skips the row. Reading `updated_at` from a raw pre-fetch instead would write
a stale value back, pushing `updated_at < topics_extracted_at` and hiding
the edited memory from every future sweep.

Callers bound the input via `getMemoriesNeedingTopicExtractionOp`'s `limit`
(both `pending` and `linkedUnstamped` are capped), so the per-row Model load
needed to `prepareUpdate` stays bounded and never spikes the RecordCache.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Default value</th>
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

`undefined`

</td>
</tr>
<tr>
<td>

`memoryIds`

</td>
<td>

readonly `string`\[]

</td>
<td>

`undefined`

</td>
</tr>
<tr>
<td>

`extractedAt`

</td>
<td>

`number`

</td>
<td>

`undefined`

</td>
</tr>
<tr>
<td>

`version`

</td>
<td>

`number`

</td>
<td>

`TOPICS_EXTRACTION_VERSION`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`\[]>
