# VaultChatBackendOptions

Defined in: [src/lib/chatStore/vaultBackend.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#78)

## Properties

### activity?

> `optional` **activity**: [`VaultChatActivity`](VaultChatActivity.md)

Defined in: [src/lib/chatStore/vaultBackend.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#82)

***

### channel?

> `optional` **channel**: `string`

Defined in: [src/lib/chatStore/vaultBackend.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#86)

BroadcastChannel name shared by this account's tabs, so one tab's writes prompt the others to poll.

***

### now()?

> `optional` **now**: () => `number`

Defined in: [src/lib/chatStore/vaultBackend.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#88)

**Returns**

`number`

***

### outbox?

> `optional` **outbox**: `object`

Defined in: [src/lib/chatStore/vaultBackend.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#81)

Persists unsent writes, sealed with `seal`, so they survive a reload.

**seal**

> **seal**: `Pick`<`SealingCipher`, `"encrypt"` | `"decrypt"`>

**storage**

> **storage**: [`ChatOutboxStorage`](ChatOutboxStorage.md)

***

### pollIntervalMs?

> `optional` **pollIntervalMs**: `number`

Defined in: [src/lib/chatStore/vaultBackend.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#84)

Polls `/changes` this often while active; 0 polls only on activity and broadcast hints.

***

### store

> **store**: [`ChatStore`](ChatStore.md)

Defined in: [src/lib/chatStore/vaultBackend.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#79)

***

### threadCacheSize?

> `optional` **threadCacheSize**: `number`

Defined in: [src/lib/chatStore/vaultBackend.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#87)
