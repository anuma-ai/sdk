# extractAndRetain

> **extractAndRetain**(`messages`: [`AutoExtractMessage`](../interfaces/AutoExtractMessage.md)\[], `retainCtx`: [`RetainContext`](../interfaces/RetainContext.md), `options`: `object`): `Promise`<{ `candidates`: [`ExtractedCandidate`](../interfaces/ExtractedCandidate.md)\[]; `failedCount`: `number`; `results`: [`RetainResult`](../interfaces/RetainResult.md)\[]; }>

Defined in: [src/lib/memory/autoExtract.ts:146](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#146)

Stage 2 — for each extracted candidate, call retain() with auto-merge
enabled. The resolver path (decide create/merge/update via a second LLM
call against the existing vault) is deferred — the auto-merge inside
retain() handles dedup at the cosine-similarity level for hackathon.

Returns the candidates that survived validation along with the retain
result for each (which captures whether the fact was created, merged,
or skipped).

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

`messages`

</td>
<td>

[`AutoExtractMessage`](../interfaces/AutoExtractMessage.md)\[]

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`retainCtx`

</td>
<td>

[`RetainContext`](../interfaces/RetainContext.md)

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options`

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

`options.entityCtx?`

</td>
<td>

[`EntityOperationsContext`](../interfaces/EntityOperationsContext.md)

</td>
<td>

When provided, persist each candidate's `entities[]` to the
entity + memory\_entity tables after a successful retain. This
powers the W5 graph retrieval lane — recall() can query for
memories sharing entities with the user's question.

</td>
</tr>
<tr>
<td>

`options.extract`

</td>
<td>

[`ExtractFactsOptions`](../interfaces/ExtractFactsOptions.md)

</td>
<td>

‐

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

`options.minConfidence?`

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

`options.scope?`

</td>
<td>

`string`

</td>
<td>

Override scope/folder for all retained facts.

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<{ `candidates`: [`ExtractedCandidate`](../interfaces/ExtractedCandidate.md)\[]; `failedCount`: `number`; `results`: [`RetainResult`](../interfaces/RetainResult.md)\[]; }>
