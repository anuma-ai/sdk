# DecayClassifier

Defined in: [src/lib/memory/decayWorker.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#59)

PR5 seam — an on-device classifier that refines the rule-based verdict for
borderline rows (e.g. type `other`/null, or a `plan` without an event end).
Because it may read decrypted content, callers MUST gate providing it on
wallet-key availability. Left undefined here → pure rule-based sweep.

## Param

The same plaintext inputs the rule engine saw.

## Param

The rule-based verdict, as a starting point / fallback.

## Methods

### classify()

> **classify**(`input`: [`DecayInput`](DecayInput.md), `ruleVerdict`: [`DecayVerdict`](../type-aliases/DecayVerdict.md)): [`DecayVerdict`](../type-aliases/DecayVerdict.md) | `Promise`<[`DecayVerdict`](../type-aliases/DecayVerdict.md)>

Defined in: [src/lib/memory/decayWorker.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#60)

**Parameters**

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

[`DecayInput`](DecayInput.md)

</td>
</tr>
<tr>
<td>

`ruleVerdict`

</td>
<td>

[`DecayVerdict`](../type-aliases/DecayVerdict.md)

</td>
</tr>
</tbody>
</table>

**Returns**

[`DecayVerdict`](../type-aliases/DecayVerdict.md) | `Promise`<[`DecayVerdict`](../type-aliases/DecayVerdict.md)>
