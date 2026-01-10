# getEncryptionKey

> **getEncryptionKey**(`address`: `string`): `Promise`<`CryptoKey`>

Defined in: src/react/useEncryption.ts:293

Gets the encryption key from in-memory storage and imports it as a CryptoKey.
The key must have been previously requested via requestEncryptionKey.

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

The wallet address

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`CryptoKey`>

The CryptoKey for AES-GCM encryption/decryption

## Throws

Error if the key hasn't been requested yet
