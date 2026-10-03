# SignMessageFn

> **SignMessageFn** = (`message`: `string`, `options?`: [`SignMessageOptions`](../interfaces/SignMessageOptions.md)) => `Promise`<`string`>

Defined in: [src/react/useEncryption.ts:1142](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#1142)

Type for the signMessage function that client must provide.
This is typically from Privy's useSignMessage hook.

The resolved value must be a hex signature (`0x`-prefixed or bare). A
non-hex string — including `String(uint8Array)` or a base58 signature —
throws from key derivation instead of becoming a zero-filled AES key.
Raw signature bytes go to [deriveKeyFromSignatureBytes](../../Encryption/deriveKeyFromSignatureBytes.md).

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

`message`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`SignMessageOptions`](../interfaces/SignMessageOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`>
