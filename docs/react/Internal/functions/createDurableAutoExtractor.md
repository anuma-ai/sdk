# createDurableAutoExtractor

> **createDurableAutoExtractor**(`options`: [`DurableAutoExtractorOptions`](../interfaces/DurableAutoExtractorOptions.md)): [`AutoExtractor`](../interfaces/AutoExtractor.md)

Defined in: [src/lib/memory/durableExtraction.ts:160](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/durableExtraction.ts#160)

Durable client extraction. Call once per authenticated database session.
Resumes pending jobs on creation, reads bounded batches from encrypted
history, and acknowledges only successful batches. No plaintext snapshots
or pending facts are written to platform preferences.

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

`options`

</td>
<td>

[`DurableAutoExtractorOptions`](../interfaces/DurableAutoExtractorOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`AutoExtractor`](../interfaces/AutoExtractor.md)
