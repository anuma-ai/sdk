# resolveThemeColor

> **resolveThemeColor**(`value`: `unknown`, `theme`: [`AnumaTheme`](../interfaces/AnumaTheme.md)): `string` | `undefined`

Defined in: [src/react/anumaRuntime.tsx:150](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#150)

Resolve a color token against the theme. Pass-through for hex/rgb/named
CSS colors; theme tokens (`textPrimary`, `accent`, …) become their
contextual hex value.

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
<tr>
<td>

`theme`

</td>
<td>

[`AnumaTheme`](../interfaces/AnumaTheme.md)

</td>
</tr>
</tbody>
</table>

## Returns

`string` | `undefined`
