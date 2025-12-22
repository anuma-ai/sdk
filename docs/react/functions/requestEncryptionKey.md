# requestEncryptionKey()

> **requestEncryptionKey**(`walletAddress`, `signMessage`): `Promise`\<`void`\>

Defined in: [src/react/useEncryption.ts:233](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L233)

Requests the user to sign a message to generate an encryption key.
If a key already exists for the given wallet, resolves immediately.

## Parameters

### walletAddress

`string`

The wallet address to generate the key for

### signMessage

[`SignMessageFn`](../type-aliases/SignMessageFn.md)

Function to sign a message (returns signature hex string)

## Returns

`Promise`\<`void`\>

Promise that resolves when the key is available
