# MediaOperationsContext

Defined in: [src/lib/db/media/types.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#183)

Context required for media database operations.

## Properties

### database

> **database**: `Database`

Defined in: [src/lib/db/media/types.ts:184](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#184)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: `MediaSignMessageFn`

Defined in: [src/lib/db/media/types.ts:190](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#190)

Function for silent signing with embedded wallets

***

### signMessage?

> `optional` **signMessage**: `MediaSignMessageFn`

Defined in: [src/lib/db/media/types.ts:188](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#188)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/media/types.ts:186](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#186)

Wallet address for encryption (optional - when present, enables field-level encryption)
