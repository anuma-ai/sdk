# MediaOperationsContext

Defined in: [src/lib/db/media/types.ts:191](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#191)

Context required for media database operations.

## Properties

### database

> **database**: `Database`

Defined in: [src/lib/db/media/types.ts:192](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#192)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: `MediaSignMessageFn`

Defined in: [src/lib/db/media/types.ts:198](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#198)

Function for silent signing with embedded wallets

***

### signMessage?

> `optional` **signMessage**: `MediaSignMessageFn`

Defined in: [src/lib/db/media/types.ts:196](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#196)

Function to sign a message for encryption key derivation

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/media/types.ts:194](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/types.ts#194)

Wallet address for encryption (optional - when present, enables field-level encryption)
