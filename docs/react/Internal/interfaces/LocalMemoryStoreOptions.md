# LocalMemoryStoreOptions

Defined in: [src/lib/memory/store/local.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#50)

## Properties

### allowUnscopedRows?

> `optional` **allowUnscopedRows**: `boolean`

Defined in: [src/lib/memory/store/local.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#73)

Admit pre-v31 `user_id = null` link rows alongside `userId`'s (LokiJS web).

***

### database

> **database**: `Database`

Defined in: [src/lib/memory/store/local.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#52)

A database built from `sdkSchema` (memory\_vault + entity + memory\_entity).

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/memory/store/local.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#56)

***

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/store/local.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#75)

Embedding API options for `recall` / `retain`.

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/memory/store/local.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#55)

***

### singleTenant?

> `optional` **singleTenant**: `boolean`

Defined in: [src/lib/memory/store/local.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#71)

The database holds exactly one owner's rows (the per-wallet client DBs).
Required for the decay sweep to run without `userId` — see
`VaultMemoryOperationsContext.singleTenant`.

***

### userId?

> `optional` **userId**: `string`

Defined in: [src/lib/memory/store/local.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#65)

Scope every read/write to this user. On creation the store first claims
every row with no `user_id` for this user (vault rows, then their topic
links), so rows an unscoped context wrote — every useChatStorage row —
stay visible; each method waits for that claim. Safe on the per-wallet
client DBs, which hold one owner's rows; on a shared, multi-tenant
database every row must already carry its `user_id`.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/store/local.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#77)

Share a warm cache with other recall surfaces; one is created when omitted.

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/memory/store/local.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#54)

With `signMessage`, encrypts content on write and decrypts on read.
