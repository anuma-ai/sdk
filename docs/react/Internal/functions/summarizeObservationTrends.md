# summarizeObservationTrends

> **summarizeObservationTrends**(`inputs`: readonly [`ObservationTrendInput`](../interfaces/ObservationTrendInput.md)\[], `now`: `number`): `Record`<[`ObservationTrend`](../type-aliases/ObservationTrend.md), `number`>

Defined in: [src/lib/memory/observationTrend.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/observationTrend.ts#96)

Summarize trend counts over a set of facts — handy for profile synthesis
("N interests strengthening") without another LLM pass.

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

`inputs`

</td>
<td>

readonly [`ObservationTrendInput`](../interfaces/ObservationTrendInput.md)\[]

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

`Record`<[`ObservationTrend`](../type-aliases/ObservationTrend.md), `number`>
