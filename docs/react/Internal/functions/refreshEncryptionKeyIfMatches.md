# refreshEncryptionKeyIfMatches

> **refreshEncryptionKeyIfMatches**(`walletAddress`: `string`, `probeCiphertext`: `string`, `signMessage`: [`SignMessageFn`](../type-aliases/SignMessageFn.md), `embeddedWalletSigner?`: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)): `Promise`<`boolean`>

Defined in: [src/react/useEncryption.ts:1134](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#1134)

Re-derive encryption keys from a fresh signature and commit them **only if**
they successfully decrypt `probeCiphertext` (a prefixed `enc:v2:` / `enc:v3:`
value). If they do not, the existing in-memory keys are left untouched.

This is the safe recovery path for #561: a present-but-wrong key must not be
silently replaced by another wrong key, and intact ciphertext must never be
treated as authoritative over by a failed re-derive.

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
