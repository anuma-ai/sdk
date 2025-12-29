# useEncryption()

> **useEncryption**(`signMessage`): `object`

Defined in: [src/react/useEncryption.ts:643](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L643)

Hook that provides on-demand encryption key management.

## Parameters

### signMessage

[`SignMessageFn`](../type-aliases/SignMessageFn.md)

Function to sign a message (from Privy's useSignMessage)

## Returns

`object`

Functions to request encryption keys and manage key pairs

### clearKeyPair()

> **clearKeyPair**: (`walletAddress`) => `void`

#### Parameters

##### walletAddress

`string`

#### Returns

`void`

### exportPublicKey()

> **exportPublicKey**: (`walletAddress`) => `Promise`\<`string`\>

#### Parameters

##### walletAddress

`string`

#### Returns

`Promise`\<`string`\>

### hasKeyPair()

> **hasKeyPair**: (`walletAddress`) => `boolean`

#### Parameters

##### walletAddress

`string`

#### Returns

`boolean`

### requestEncryptionKey()

> **requestEncryptionKey**: (`walletAddress`) => `Promise`\<`void`\>

#### Parameters

##### walletAddress

`string`

#### Returns

`Promise`\<`void`\>

### requestKeyPair()

> **requestKeyPair**: (`walletAddress`) => `Promise`\<`void`\>

#### Parameters

##### walletAddress

`string`

#### Returns

`Promise`\<`void`\>
