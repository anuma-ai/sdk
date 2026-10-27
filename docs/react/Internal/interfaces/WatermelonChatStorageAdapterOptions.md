# WatermelonChatStorageAdapterOptions

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#78)

Context needed to construct a `WatermelonChatStorageAdapter`.

Mirrors `StorageOperationsContext` but exposes only the `Database` — the
adapter resolves the required collections itself so callers don't have to
know the table names.

## Properties

### database

> **database**: `Database`

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#79)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#85)

Silent signing function for embedded wallets (optional).

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#83)

Signing function for deriving encryption keys (optional).

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#81)

Wallet address for field-level encryption (optional).
