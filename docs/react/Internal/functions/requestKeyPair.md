# requestKeyPair

> **requestKeyPair**(`walletAddress`: `string`, `signMessage`: [`SignMessageFn`](../type-aliases/SignMessageFn.md), `embeddedWalletSigner?`: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)): `Promise`<`void`>

Defined in: [src/react/useEncryption.ts:1360](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#1360)

Requests an ECDH key pair and resolves immediately if it exists in memory.
The SDK can load a saved key pair or request a wallet signature to generate one.

Concurrent calls for the same wallet address share one pending request. The SDK ignores later
callers' signers. All callers receive the first caller's result or rejection. The SDK clears a
rejected request so a retry starts a new request.

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
