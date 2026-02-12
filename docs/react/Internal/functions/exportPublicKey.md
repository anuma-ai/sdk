# exportPublicKey

> **exportPublicKey**(`address`: `string`, `signMessage`: [`SignMessageFn`](../type-aliases/SignMessageFn.md), `embeddedWalletSigner?`: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)): `Promise`<`string`>

Defined in: [src/react/useEncryption.ts:1129](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L1129)

Exports the public key for a wallet address as SPKI format (base64)

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
<tr>
<td>

`signMessage`

</td>
<td>

[`SignMessageFn`](../type-aliases/SignMessageFn.md)

</td>
<td>

Function to sign a message (returns signature hex string)

</td>
</tr>
<tr>
<td>

`embeddedWalletSigner?`

</td>
<td>

[`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

</td>
<td>

Optional function for silent signing with embedded wallets

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`>

The public key as base64-encoded SPKI string
