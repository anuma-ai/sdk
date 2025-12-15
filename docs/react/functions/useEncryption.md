# useEncryption()

> **useEncryption**(`signMessage`): `object`

Defined in: [src/react/useEncryption.ts:264](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L264)

Hook that provides on-demand encryption key management.

## Parameters

### signMessage

[`SignMessageFn`](../type-aliases/SignMessageFn.md)

Function to sign a message (from Privy's useSignMessage)

## Returns

`object`

Functions to request encryption keys

### requestEncryptionKey()

> **requestEncryptionKey**: (`walletAddress`) => `Promise`\<`void`\>

#### Parameters

##### walletAddress

`string`

#### Returns

`Promise`\<`void`\>
