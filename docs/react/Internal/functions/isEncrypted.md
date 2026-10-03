# isEncrypted

> **isEncrypted**(`value`: `string`): `boolean`

Defined in: [src/lib/db/encryption-utils.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/encryption-utils.ts#41)

Checks if a string value is encrypted (has the enc:v2: or enc:v3: prefix with valid hex payload).
Validates that the payload after the prefix is at least 56 hex characters
(24 chars for 12-byte IV + 32 chars minimum for ciphertext+tag).

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

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`boolean`
