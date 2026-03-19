# requestKeyPair

> **requestKeyPair**(`walletAddress`: `string`, `signMessage`: [`SignMessageFn`](../type-aliases/SignMessageFn.md), `embeddedWalletSigner?`: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)): `Promise`<`void`>

Defined in: [src/react/useEncryption.ts:1020](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#1020)

Requests the user to sign a message to generate an ECDH key pair.
If a key pair already exists in memory for the given wallet, resolves immediately.

Note: Key pairs are stored in memory only and do not persist across page reloads.
This is a security feature - users must sign once per session to derive their key pair.

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

`walletAddress`

</td>
<td>

`string`

</td>
<td>

The wallet address to generate the key pair for

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

`Promise`<`void`>

Promise that resolves when the key pair is available
