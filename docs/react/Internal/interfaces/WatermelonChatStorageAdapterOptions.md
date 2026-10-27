# WatermelonChatStorageAdapterOptions

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#79)

Context needed to construct a `WatermelonChatStorageAdapter`.

Mirrors `StorageOperationsContext` but exposes only the `Database` — the
adapter resolves the required collections itself so callers don't have to
know the table names.

## Properties

### database

> **database**: `Database`

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#80)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#86)

Silent signing function for embedded wallets (optional).

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#84)

Signing function for deriving encryption keys (optional).

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#82)

Wallet address for field-level encryption (optional).
