# requestEncryptionKey

> **requestEncryptionKey**(`walletAddress`: `string`, `signMessage`: [`SignMessageFn`](../type-aliases/SignMessageFn.md), `embeddedWalletSigner?`: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md), `options?`: [`RequestEncryptionKeyOptions`](../interfaces/RequestEncryptionKeyOptions.md)): `Promise`<`boolean`>

Defined in: [src/react/useEncryption.ts:1069](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#1069)

Requests the user to sign a message to generate an encryption key.
If a key already exists in memory for the given wallet, resolves immediately
unless [RequestEncryptionKeyOptions.force](../interfaces/RequestEncryptionKeyOptions.md#force) is set.

Note: Keys are stored in memory only and do not persist across page reloads.
This is a security feature - users must sign once per session to derive their key.

When a seeded/pinned store already has keys and the fresh derive does not
match any of them, the store is left unchanged and this resolves to `false`
(without firing [onKeyAvailable](onKeyAvailable.md)). Callers that need write readiness
should check the return value or [hasEncryptionKey](hasEncryptionKey.md) before encrypting
so they can surface a re-unlock UI instead of failing downstream (#828).

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

The wallet address to generate the key for

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
<tr>
<td>

`options?`

</td>
<td>

[`RequestEncryptionKeyOptions`](../interfaces/RequestEncryptionKeyOptions.md)

</td>
<td>

Optional flags (e.g. force re-derive)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`boolean`>

`true` when keys are available after the call; `false` when a
divergent derive left the store unchanged (or the session was torn down
mid-flight).
