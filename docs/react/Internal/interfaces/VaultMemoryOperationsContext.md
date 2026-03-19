# VaultMemoryOperationsContext

Defined in: [src/lib/db/memoryVault/operations.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#13)

## Properties

### database

> **database**: `Database`

Defined in: [src/lib/db/memoryVault/operations.ts:14](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#14)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/memoryVault/operations.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#18)

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/memoryVault/operations.ts:17](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#17)

***

### userId?

> `optional` **userId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#20)

When set, operations scope to this user (server-side multi-user).

***

### vaultMemoryCollection

> **vaultMemoryCollection**: `Collection`<[`StoredVaultMemoryModel`](../classes/StoredVaultMemoryModel.md)>

Defined in: [src/lib/db/memoryVault/operations.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#15)

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#16)
