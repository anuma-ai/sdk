# WatermelonChatStorageAdapterOptions

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#60)

Context needed to construct a `WatermelonChatStorageAdapter`.

Mirrors `StorageOperationsContext` but exposes only the `Database` — the
adapter resolves the required collections itself so callers don't have to
know the table names.

## Properties

### database

> **database**: `Database`

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#61)

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#67)

Silent signing function for embedded wallets (optional).

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#65)

Signing function for deriving encryption keys (optional).

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/storage/WatermelonChatStorageAdapter.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/WatermelonChatStorageAdapter.ts#63)

Wallet address for field-level encryption (optional).
