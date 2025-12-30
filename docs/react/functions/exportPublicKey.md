# exportPublicKey()

> **exportPublicKey**(`address`, `signMessage`): `Promise`\<`string`\>

Defined in: [src/react/useEncryption.ts:633](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L633)

Exports the public key for a wallet address as SPKI format (base64)

## Parameters

### address

`string`

The wallet address

### signMessage

[`SignMessageFn`](../type-aliases/SignMessageFn.md)

Function to sign a message (returns signature hex string)

## Returns

`Promise`\<`string`\>

The public key as base64-encoded SPKI string
