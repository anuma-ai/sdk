# MediaOperationsContext

Defined in: [src/lib/db/media/types.ts:181](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/types.ts#L181)

Context required for media database operations.

## Properties

### database

> **database**: `Database`

Defined in: [src/lib/db/media/types.ts:182](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/types.ts#L182)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: `MediaSignMessageFn`

Defined in: [src/lib/db/media/types.ts:188](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/types.ts#L188)

Function for silent signing with embedded wallets

***

### signMessage?

> `optional` **signMessage**: `MediaSignMessageFn`

Defined in: [src/lib/db/media/types.ts:186](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/types.ts#L186)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/media/types.ts:184](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/types.ts#L184)

Wallet address for encryption (optional - when present, enables field-level encryption)
