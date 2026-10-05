# LocalMemoryStoreOptions

Defined in: [src/lib/memory/store/local.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#54)

## Properties

### allowUnscopedRows?

> `optional` **allowUnscopedRows**: `boolean`

Defined in: [src/lib/memory/store/local.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#76)

Admit pre-v31 `user_id = null` link rows alongside `userId`'s (LokiJS web).

***

### database

> **database**: `Database`

Defined in: [src/lib/memory/store/local.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#56)

A database built from `sdkSchema` (memory\_vault + entity + memory\_entity).

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/memory/store/local.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#60)

***

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/store/local.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#78)

Embedding API options for `recall` / `retain`.

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/memory/store/local.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#59)

***

### singleTenant?

> `optional` **singleTenant**: `boolean`

Defined in: [src/lib/memory/store/local.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#74)

The database holds exactly one owner's rows (the per-wallet client DBs).
Required for the decay sweep to run without `userId` — see
`VaultMemoryOperationsContext.singleTenant`.

***

### userId?

> `optional` **userId**: `string`

Defined in: [src/lib/memory/store/local.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#68)

Scope every read/write to this user — for a shared, multi-tenant database
whose rows all carry their `user_id`. Rows with no `user_id` are invisible
to a scoped store, so the per-wallet client DBs (every useChatStorage row is
`user_id = null`) use `singleTenant` instead, exactly like useChatStorage's
vault ctx.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/store/local.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#80)

Share a warm cache with other recall surfaces; one is created when omitted.

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/memory/store/local.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#58)

With `signMessage`, encrypts content on write and decrypts on read.
