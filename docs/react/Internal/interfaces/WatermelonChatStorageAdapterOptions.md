# WatermelonChatStorageAdapterOptions

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#61)

Context needed to construct a `WatermelonChatStorageAdapter`.

Mirrors `StorageOperationsContext` but exposes only the `Database` — the
adapter resolves the required collections itself so callers don't have to
know the table names.

## Properties

### database

> **database**: `Database`

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#62)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#68)

Silent signing function for embedded wallets (optional).

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#66)

Signing function for deriving encryption keys (optional).

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#64)

Wallet address for field-level encryption (optional).
