# extractAndLinkEntitiesForMemoriesOp

> **extractAndLinkEntitiesForMemoriesOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `memoryIds`: readonly `string`\[], `options`: [`TopicExtractOptions`](../interfaces/TopicExtractOptions.md) & `object`): `Promise`<[`TopicExtractionRunResult`](../interfaces/TopicExtractionRunResult.md)>

Defined in: [src/lib/memory/topicExtract.ts:243](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#243)

Run LLM topic extraction over existing vault memories and persist the
results: append entity links (never removing existing ones) and stamp
`topics_extracted_at`.

User intent is enforced twice: rows already user-managed are skipped up
front, and the link write re-checks the flag INSIDE its writer
(`unlessTopicsUserManaged`) so a manual topic edit landing during the LLM
round-trip wins — its replace semantics also erase anything this pass
linked just before it. The watermark is captured BEFORE contents are read:
an edit landing mid-run keeps `updated_at` > stamp, so the next sweep
re-extracts it rather than trusting this run's stale read.

Requires `ctx.entityCtx`. Contents are decrypted via the ctx's wallet
fields, exactly like the vault read ops.

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
