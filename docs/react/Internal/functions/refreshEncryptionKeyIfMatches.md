# refreshEncryptionKeyIfMatches

> **refreshEncryptionKeyIfMatches**(`walletAddress`: `string`, `probeCiphertext`: `string`, `signMessage`: [`SignMessageFn`](../type-aliases/SignMessageFn.md), `embeddedWalletSigner?`: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)): `Promise`<`boolean`>

Defined in: [src/react/useEncryption.ts:1146](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#1146)

Re-derive encryption keys from a fresh signature and commit them **only if**
they successfully decrypt `probeCiphertext` (a prefixed `enc:v2:` / `enc:v3:`
value). If they do not, the existing in-memory keys are left untouched.

Concurrent calls for the same wallet share one sign+derive (deduped via
pendingKeyRefreshes) so a page of parallel decrypts cannot storm the
wallet with one prompt per message (#561 / PR #828). Waiters that join a
successful refresh re-check their own probe under the new store without
signing again.

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`probeCiphertext`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`signMessage`

</td>
<td>

[`SignMessageFn`](../type-aliases/SignMessageFn.md)

</td>
</tr>
<tr>
<td>

`embeddedWalletSigner?`

</td>
<td>

[`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`boolean`>

true when keys were refreshed (probe decrypted); false when the
probe failed under the candidate keys (store unchanged) or the probe was
not encrypted.
