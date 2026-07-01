# resolvePiiRedactor

> **resolvePiiRedactor**(`piiRedaction`: `boolean` | [`PiiRedactor`](../classes/PiiRedactor.md) | `undefined`): [`PiiRedactor`](../classes/PiiRedactor.md) | `undefined`

Defined in: [src/lib/pii/redactor.ts:408](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#408)

Resolve a `piiRedaction` option (`true` | `false` | `PiiRedactor`) into a
redactor instance or `undefined`. `true` creates a fresh redactor; a
redactor-like value is used as-is. Any other truthy value is a programming
error: it warns loudly and disables redaction rather than failing silently.

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

`piiRedaction`

</td>
<td>

`boolean` | [`PiiRedactor`](../classes/PiiRedactor.md) | `undefined`

</td>
</tr>
</tbody>
</table>

## Returns

[`PiiRedactor`](../classes/PiiRedactor.md) | `undefined`
