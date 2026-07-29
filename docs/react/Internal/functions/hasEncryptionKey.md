# hasEncryptionKey

> **hasEncryptionKey**(`address`: `string`, `version?`: [`EncryptionKeyVersion`](../type-aliases/EncryptionKeyVersion.md)): `boolean`

Defined in: [src/react/useEncryption.ts:801](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#801)

Checks if an encryption key exists in memory for the given wallet address.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`address`

</td>
<td>

`string`

</td>
<td>

Wallet address

</td>
</tr>
<tr>
<td>

`version?`

</td>
<td>

[`EncryptionKeyVersion`](../type-aliases/EncryptionKeyVersion.md)

</td>
<td>

When omitted, checks the **v3** (`current`) key — the key
write/OPFS/encrypt paths need. Callers that only need to read legacy
`enc:v2:` data should pass `"v2"` explicitly. (#561 / PR #828)

</td>
</tr>
</tbody>
</table>

## Returns

`boolean`
