# LocalMemoryStoreOptions

Defined in: src/lib/memory/store/local.ts:41

## Properties

### allowUnscopedRows?

> `optional` **allowUnscopedRows**: `boolean`

Defined in: src/lib/memory/store/local.ts:57

Admit pre-v31 `user_id = null` link rows alongside `userId`'s (LokiJS web).

***

### database

> **database**: `Database`

Defined in: src/lib/memory/store/local.ts:43

A database built from `sdkSchema` (memory\_vault + entity + memory\_entity).

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: src/lib/memory/store/local.ts:47

***

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: src/lib/memory/store/local.ts:59

Embedding API options for `recall` / `retain`.

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: src/lib/memory/store/local.ts:46

***

### singleTenant?

> `optional` **singleTenant**: `boolean`

Defined in: src/lib/memory/store/local.ts:55

The database holds exactly one owner's rows (the per-wallet client DBs).
Required for the decay sweep to run without `userId` — see
`VaultMemoryOperationsContext.singleTenant`.

***

### userId?

> `optional` **userId**: `string`

Defined in: src/lib/memory/store/local.ts:49

Scope every read/write to this user — a shared, multi-tenant database.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: src/lib/memory/store/local.ts:61

Share a warm cache with other recall surfaces; one is created when omitted.

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: src/lib/memory/store/local.ts:45

With `signMessage`, encrypts content on write and decrypts on read.
