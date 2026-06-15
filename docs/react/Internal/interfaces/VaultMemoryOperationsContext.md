# VaultMemoryOperationsContext

Defined in: [src/lib/db/memoryVault/operations.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#18)

## Properties

### database

> **database**: `Database`

Defined in: [src/lib/db/memoryVault/operations.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#19)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/memoryVault/operations.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#23)

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/db/memoryVault/operations.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#31)

When set, vault delete ops cascade to memory\_entity rows pointing at
the deleted memories. Without this the W5 graph lane keeps returning
IDs of soft-deleted memories and the join table grows unbounded.

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/memoryVault/operations.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#22)

***

### userId?

> `optional` **userId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#25)

When set, operations scope to this user (server-side multi-user).

***

### vaultMemoryCollection

> **vaultMemoryCollection**: `Collection`<[`StoredVaultMemoryModel`](../classes/StoredVaultMemoryModel.md)>

Defined in: [src/lib/db/memoryVault/operations.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#20)

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#21)
