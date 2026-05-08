# decryptConversationTitle

> **decryptConversationTitle**(`encryptedTitle`: `string`, `address`: `string`): `Promise`<`string`>

Defined in: [src/lib/db/chat/lazyDecrypt.ts:148](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/lazyDecrypt.ts#148)

Decrypt a single conversation title on demand.

Designed for the lazy display path: pair with `listConversationsLazy`
and call this once a row is actually visible.

Behavior:

* Plaintext input (no `enc:` prefix) is returned unchanged. This
  covers conversations created before encryption was enabled and
  keeps the helper safe to call unconditionally from rendering
  code that may receive a mix of encrypted and plaintext titles.
* Encrypted input is decrypted via `decryptField`, which uses the
  same per-version cached `CryptoKey` as the eager path — no new
  key derivations are triggered.
* Concurrent calls for the same `(address, encryptedTitle)` share
  a single decrypt promise.
* The result is memoized in a 256-entry LRU.

Throws if the encryption key for `address` isn't loaded. (The
underlying `decryptField` would otherwise silently return the
ciphertext, which would surface to the UI as a literal `enc:v3:...`
title — strictly worse than a thrown error the caller can catch.)

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

`encryptedTitle`

</td>
<td>

`string`

</td>
<td>

The stored title. May be ciphertext or plaintext.

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

Wallet address that owns the encryption key.

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`>

The decrypted plaintext title.
