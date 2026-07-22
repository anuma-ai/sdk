# classifyObservationTrend

> **classifyObservationTrend**(`input`: [`ObservationTrendInput`](../interfaces/ObservationTrendInput.md), `now`: `number`): [`ObservationTrend`](../type-aliases/ObservationTrend.md)

Defined in: src/lib/memory/observationTrend.ts:52

Classify a vault fact's observation trend from its evidence timestamps.

Pure + deterministic. Pass `now` for back-dated eval harnesses.

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

`input`

</td>
<td>

[`ObservationTrendInput`](../interfaces/ObservationTrendInput.md)

</td>
</tr>
<tr>
<td>

`now`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

## Returns

[`ObservationTrend`](../type-aliases/ObservationTrend.md)
