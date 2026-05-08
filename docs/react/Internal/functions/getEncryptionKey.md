# getEncryptionKey

> **getEncryptionKey**(`address`: `string`, `version`: `EncryptionKeyVersion`): `Promise`<`CryptoKey`>

Defined in: [src/react/useEncryption.ts:451](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#451)

Gets the encryption key from in-memory storage and imports it as a CryptoKey.
The key must have been previously requested via requestEncryptionKey.
Uses a cache to avoid re-importing the same key on every call.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Default value</th>
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

`undefined`

</td>
<td>

The wallet address

</td>
</tr>
<tr>
<td>

`version`

</td>
<td>

`EncryptionKeyVersion`

</td>
<td>

`"v3"`

</td>
<td>

Which key version to use (default: "v3" for HKDF key)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`CryptoKey`>

The CryptoKey for AES-GCM encryption/decryption

## Throws

Error if the key hasn't been requested yet
