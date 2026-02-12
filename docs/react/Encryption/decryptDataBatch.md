# decryptDataBatch

> **decryptDataBatch**(`encryptedValues`: `string`\[], `address`: `string`): `Promise`<`string`\[]>

Defined in: [src/react/useEncryption.ts:724](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L724)

Batch decrypt multiple values efficiently with a single key lookup.
Much faster than calling decryptData for each value individually.

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

`encryptedValues`

</td>
<td>

`string`\[]

</td>
<td>

Array of encrypted hex strings

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

Array of decrypted plaintext values

## Throws

Error if encryption key is not found in memory or decryption fails

## Example

```tsx
const decrypted = await decryptDataBatch(
  [encrypted1, encrypted2, encrypted3],
  walletAddress
);
```
