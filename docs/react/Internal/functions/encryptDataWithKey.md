# encryptDataWithKey

> **encryptDataWithKey**(`plaintext`: `string` | `Uint8Array`<`ArrayBufferLike`>, `key`: `CryptoKey`): `Promise`<`string`>

Defined in: [src/react/useEncryption.ts:561](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#561)

**`Internal`**

Encrypts data using a pre-fetched CryptoKey.
Use this for batch operations to avoid repeated key lookups.

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

`plaintext`

</td>
<td>

`string` | `Uint8Array`<`ArrayBufferLike`>

</td>
<td>

The data to encrypt (string or Uint8Array)

</td>
</tr>
<tr>
<td>

`key`

</td>
<td>

`CryptoKey`

</td>
<td>

The CryptoKey for AES-GCM encryption

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`>

Encrypted data as hex string (IV + ciphertext + auth tag)
