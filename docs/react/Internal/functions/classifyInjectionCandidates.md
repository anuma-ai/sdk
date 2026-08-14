# classifyInjectionCandidates

> **classifyInjectionCandidates**(`candidates`: readonly [`ExtractedCandidate`](../interfaces/ExtractedCandidate.md)\[], `options`: [`InjectionClassifierOptions`](../interfaces/InjectionClassifierOptions.md)): `Promise`<{ `flagged`: `Set`<`number`>; }>

Defined in: [src/lib/memory/injectionClassifier.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionClassifier.ts#137)

Classify already-clean extraction candidates for signature-free injection /
poisoning. Returns the set of 0-based indices (into `candidates`) the model
flagged as poison.

FAILS CLEAN: returns an empty set on empty input, missing auth, LLM error,
or any malformed response — the caller then keeps every candidate clean, so
this layer can only ever ADD quarantines, never suppress a legitimate fact
on failure. Makes at most ONE portal call regardless of candidate count.

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
<tr>
<td>

`options`

</td>
<td>

[`InjectionClassifierOptions`](../interfaces/InjectionClassifierOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<{ `flagged`: `Set`<`number`>; }>
