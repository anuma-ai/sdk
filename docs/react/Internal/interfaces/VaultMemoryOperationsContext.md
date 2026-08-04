# VaultMemoryOperationsContext

Defined in: [src/lib/db/memoryVault/operations.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#57)

## Properties

### database

> **database**: `Database`

Defined in: [src/lib/db/memoryVault/operations.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#58)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/memoryVault/operations.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#62)

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/db/memoryVault/operations.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#82)

When set, vault delete ops cascade to memory\_entity rows pointing at
the deleted memories. Without this the W5 graph lane keeps returning
IDs of soft-deleted memories and the join table grows unbounded.

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/memoryVault/operations.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#61)

***

### singleTenant?

> `optional` **singleTenant**: `boolean`

Defined in: [src/lib/db/memoryVault/operations.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#76)

Asserts this context runs against a physically single-tenant database — one
where every row belongs to the same owner (the per-wallet client DBs, which
hold exactly one wallet's rows written with `user_id = null`). This is the
ONLY thing that makes the decay sweep's unscoped scan/archive/delete safe
without a `userId`: see assertVaultScopeForSweep. A shared /
multi-tenant DB must NOT set this — it must scope by `userId` instead.
`walletAddress` presence alone is NOT a substitute (the sweep query filters
by `user_id` only, so a bare `walletAddress` on a shared DB would sweep
every tenant).

***

### userId?

> `optional` **userId**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#64)

When set, operations scope to this user (server-side multi-user).

***

### vaultMemoryCollection

> **vaultMemoryCollection**: `Collection`<[`StoredVaultMemoryModel`](../classes/StoredVaultMemoryModel.md)>

Defined in: [src/lib/db/memoryVault/operations.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#59)

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/memoryVault/operations.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#60)
