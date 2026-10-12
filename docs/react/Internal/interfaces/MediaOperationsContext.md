# MediaOperationsContext

Defined in: [src/lib/db/media/types.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#171)

Context required for media database operations.

## Properties

### database

> **database**: `Database`

Defined in: [src/lib/db/media/types.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#172)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: `MediaSignMessageFn`

Defined in: [src/lib/db/media/types.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#178)

Function for silent signing with embedded wallets

***

### signMessage?

> `optional` **signMessage**: `MediaSignMessageFn`

Defined in: [src/lib/db/media/types.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#176)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/media/types.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#174)

Wallet address for encryption (optional - when present, enables field-level encryption)
