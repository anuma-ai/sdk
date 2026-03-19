# encryptDataBatch

> **encryptDataBatch**(`values`: (`string` | `Uint8Array`<`ArrayBufferLike`>)\[], `address`: `string`): `Promise`<`string`\[]>

Defined in: [src/react/useEncryption.ts:642](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#642)

Batch encrypt multiple values efficiently with a single key lookup.
Much faster than calling encryptData for each value individually.

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

`values`

</td>
<td>

(`string` | `Uint8Array`<`ArrayBufferLike`>)\[]

</td>
<td>

Array of plaintext values to encrypt

</td>
</tr>
<tr>
<td>

`address`

</td>
<td>

`string`

</td>
<td>

The wallet address associated with the encryption key

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`\[]>

Array of encrypted values as hex strings

## Throws

Error if encryption key is not found in memory

## Example

```tsx
const encrypted = await encryptDataBatch(
  ["secret1", "secret2", "secret3"],
  walletAddress
);
```
