# requestEncryptionKey()

> **requestEncryptionKey**(`walletAddress`, `signMessage`): `Promise`\<`void`\>

Defined in: [src/react/useEncryption.ts:421](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L421)

Requests the user to sign a message to generate an encryption key.
If a key already exists in memory for the given wallet, resolves immediately.

Note: Keys are stored in memory only and do not persist across page reloads.
This is a security feature - users must sign once per session to derive their key.

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
