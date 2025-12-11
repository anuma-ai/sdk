# useEncryption()

> **useEncryption**(`signMessage`): `object`

Defined in: [react/useEncryption.ts:263](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L263)

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
