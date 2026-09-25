# deriveKeyFromSignatureBytes

> **deriveKeyFromSignatureBytes**(`signature`: `Uint8Array`): `Promise`<`string`>

Defined in: [src/react/useEncryption.ts:494](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#494)

Derives the bytes-native AES key from a raw signature.

Privy Solana `signMessage` returns a `Uint8Array`. Pass those bytes here.
The signature is never hex-encoded, base58-encoded, or passed through
`String()`. That string round-trip is what made hexToBytes store
zeros for every non-hex pair and yield a low-entropy AES key.

This is the derivation for the next key version (`anuma-sdk-aes-gcm-v4`).
[requestEncryptionKey](../Internal/functions/requestEncryptionKey.md) does not install it; v2 and v3 stay on the
hex-string path so existing ciphertext keeps decrypting. The return value
is the same 64-char hex form the in-memory store already uses.

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

`signature`

</td>
<td>

`Uint8Array`

</td>
<td>

Raw signature bytes. Must be at least 64 bytes.

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`>

32-byte AES-GCM key as hex, without a `0x` prefix.

## Throws

Error when `signature` is shorter than 64 bytes.
