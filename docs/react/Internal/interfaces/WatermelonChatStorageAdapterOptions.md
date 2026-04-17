# WatermelonChatStorageAdapterOptions

Defined in: src/lib/storage/WatermelonChatStorageAdapter.ts:59

Context needed to construct a `WatermelonChatStorageAdapter`.

Mirrors `StorageOperationsContext` but exposes only the `Database` — the
adapter resolves the required collections itself so callers don't have to
know the table names.

## Properties

### database

> **database**: `Database`

Defined in: src/lib/storage/WatermelonChatStorageAdapter.ts:60

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: src/lib/storage/WatermelonChatStorageAdapter.ts:66

Silent signing function for embedded wallets (optional).

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: src/lib/storage/WatermelonChatStorageAdapter.ts:64

Signing function for deriving encryption keys (optional).

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: src/lib/storage/WatermelonChatStorageAdapter.ts:62

Wallet address for field-level encryption (optional).
