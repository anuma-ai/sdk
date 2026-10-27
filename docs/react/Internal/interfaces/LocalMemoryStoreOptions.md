# LocalMemoryStoreOptions

Defined in: [src/lib/memory/store/local.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#69)

## Properties

### allowUnscopedRows?

> `optional` **allowUnscopedRows**: `boolean`

Defined in: [src/lib/memory/store/local.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#93)

Admit pre-v31 `user_id = null` link rows alongside `userId`'s (LokiJS web).

***

### canWrite()?

> `optional` **canWrite**: () => `Promise`<`boolean`>

Defined in: [src/lib/memory/store/local.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#77)

Rechecked inside each serialized memory write.

**Returns**

`Promise`<`boolean`>

***

### database

> **database**: `Database`

Defined in: [src/lib/memory/store/local.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#71)

A database built from `sdkSchema` (memory\_vault + entity + memory\_entity).

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/memory/store/local.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#75)

***

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/store/local.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#95)

Embedding API options for `recall` / `retain`.

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/memory/store/local.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#74)

***

### singleTenant?

> `optional` **singleTenant**: `boolean`

Defined in: [src/lib/memory/store/local.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#91)

The database holds exactly one owner's rows (the per-wallet client DBs).
Required for the decay sweep to run without `userId` — see
`VaultMemoryOperationsContext.singleTenant`.

***

### userId?

> `optional` **userId**: `string`

Defined in: [src/lib/memory/store/local.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#85)

Scope every read/write to this user — for a shared, multi-tenant database
whose rows all carry their `user_id`. Rows with no `user_id` are invisible
to a scoped store, so the per-wallet client DBs (every useChatStorage row is
`user_id = null`) use `singleTenant` instead, exactly like useChatStorage's
vault ctx.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/store/local.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#97)

Share a warm cache with other recall surfaces; one is created when omitted.

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/memory/store/local.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#73)

With `signMessage`, encrypts content on write and decrypts on read.
