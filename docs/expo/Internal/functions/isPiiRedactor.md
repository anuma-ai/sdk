# isPiiRedactor

> **isPiiRedactor**(`value`: `unknown`): `value is PiiRedactor`

Defined in: [src/lib/pii/redactor.ts:662](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#662)

Structural (duck-typed) check for a [PiiRedactor](../classes/PiiRedactor.md). Used instead of
`instanceof` because dual ESM/CJS packaging or an SSR/client boundary can
produce a redactor from a *duplicate* class copy, for which `instanceof`
silently returns false — the worst failure mode for a privacy feature.

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

`value`

</td>
<td>

`unknown`

</td>
</tr>
</tbody>
</table>

## Returns

`value is PiiRedactor`
