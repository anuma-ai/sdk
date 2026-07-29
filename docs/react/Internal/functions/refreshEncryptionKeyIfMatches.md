# refreshEncryptionKeyIfMatches

> **refreshEncryptionKeyIfMatches**(`walletAddress`: `string`, `probeCiphertext`: `string`, `signMessage`: [`SignMessageFn`](../type-aliases/SignMessageFn.md), `embeddedWalletSigner?`: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)): `Promise`<`boolean`>

Defined in: [src/react/useEncryption.ts:1206](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#1206)

Re-derive encryption keys from a fresh signature and commit them **only if**
they successfully decrypt `probeCiphertext` (a prefixed `enc:v2:` / `enc:v3:`
value). If they do not, the existing in-memory keys are left untouched.

Concurrent calls for the same wallet share one sign+derive. Each caller then
probes **its own** ciphertext against those candidates, so mixed-era messages
in one `Promise.all` batch can still recover when only the leader's probe
misses (#828 review). Failed candidates are memoized for the session so
pagination does not re-prompt on every page when the wallet has changed.

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
