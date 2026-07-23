# scoreProfileSalience

> **scoreProfileSalience**(`input`: [`ProfileSalienceInput`](../interfaces/ProfileSalienceInput.md), `now`: `number`, `options`: [`ScoreProfileSalienceOptions`](../interfaces/ScoreProfileSalienceOptions.md)): `number`

Defined in: [src/lib/memory/profileSalience.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/profileSalience.ts#91)

Score a vault fact for profile-worthiness.

`typeWeight * (1 + α·log(1+proofCount) − α·log(2)) * trendMultiplier`

The proof term mirrors vault fusion's log curve (neutral at proofCount=1).
Pass `now` for deterministic evals.

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

[`ProfileSalienceInput`](../interfaces/ProfileSalienceInput.md)

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
<tr>
<td>

`options`

</td>
<td>

[`ScoreProfileSalienceOptions`](../interfaces/ScoreProfileSalienceOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`number`
