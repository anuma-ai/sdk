# createLlmDecayClassifier

> **createLlmDecayClassifier**(`options`: [`LlmDecayClassifierOptions`](../interfaces/LlmDecayClassifierOptions.md)): [`DecayClassifier`](../interfaces/DecayClassifier.md)

Defined in: [src/lib/memory/decayClassifier.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayClassifier.ts#128)

Build a [DecayClassifier](../interfaces/DecayClassifier.md) that reads a borderline row's decrypted
content and returns a keep/archive verdict via a cheap portal LLM. Pass it as
`createDecaySweeper({ classifier })`. See the module docstring for the
zero-knowledge contract. Returns the rule verdict on any failure and never
escalates to `delete`.

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

[`LlmDecayClassifierOptions`](../interfaces/LlmDecayClassifierOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`DecayClassifier`](../interfaces/DecayClassifier.md)
