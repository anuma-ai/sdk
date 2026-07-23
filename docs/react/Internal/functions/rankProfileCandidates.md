# rankProfileCandidates

> **rankProfileCandidates**(`inputs`: readonly [`ProfileSalienceInput`](../interfaces/ProfileSalienceInput.md)\[], `now`: `number`, `options`: [`ScoreProfileSalienceOptions`](../interfaces/ScoreProfileSalienceOptions.md)): [`RankedProfileCandidate`](../interfaces/RankedProfileCandidate.md)\[]

Defined in: src/lib/memory/profileSalience.ts:114

Rank vault facts by profile-worthiness (descending score).
Ties broken by higher proofCount, then id ascending for stability.

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

readonly [`ProfileSalienceInput`](../interfaces/ProfileSalienceInput.md)\[]

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

[`RankedProfileCandidate`](../interfaces/RankedProfileCandidate.md)\[]
