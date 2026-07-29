# hasEncryptionKey

> **hasEncryptionKey**(`address`: `string`, `version?`: [`EncryptionKeyVersion`](../type-aliases/EncryptionKeyVersion.md)): `boolean`

Defined in: [src/react/useEncryption.ts:785](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#785)

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

When omitted, true if **either** v2 or v3 is present
(partial key state must not blank the other version — #561). When set,
checks only that version.

</td>
</tr>
</tbody>
</table>

## Returns

`boolean`
