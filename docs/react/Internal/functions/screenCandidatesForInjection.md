# screenCandidatesForInjection

> **screenCandidatesForInjection**(`candidates`: readonly [`ExtractedCandidate`](../interfaces/ExtractedCandidate.md)\[]): [`ScreenResult`](../interfaces/ScreenResult.md)

Defined in: [src/lib/memory/injectionScreen.ts:311](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#311)

Screen extraction candidates for injection / poisoning signatures.

Partitions the input into `clean` (persist normally) and `quarantined`
(persist with `trust_tier="quarantined"`, hidden from recall). Pure and
synchronous — no network, no DB, no content logging. Input order is
preserved within each partition.

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

`candidates`

</td>
<td>

readonly [`ExtractedCandidate`](../interfaces/ExtractedCandidate.md)\[]

</td>
</tr>
</tbody>
</table>

## Returns

[`ScreenResult`](../interfaces/ScreenResult.md)
