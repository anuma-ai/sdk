# VaultChatBackendOptions

Defined in: [src/lib/chatStore/vaultBackend.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#84)

## Properties

### activity?

> `optional` **activity**: [`VaultChatActivity`](VaultChatActivity.md)

Defined in: [src/lib/chatStore/vaultBackend.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#92)

***

### channel?

> `optional` **channel**: `string`

Defined in: [src/lib/chatStore/vaultBackend.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#96)

BroadcastChannel name shared by this account's tabs, so one tab's writes prompt the others to poll.

***

### now()?

> `optional` **now**: () => `number`

Defined in: [src/lib/chatStore/vaultBackend.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#98)

**Returns**

`number`

***

### outbox?

> `optional` **outbox**: `object`

Defined in: [src/lib/chatStore/vaultBackend.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#87)

Persists unsent writes, sealed with `seal`, so they survive a reload; `locks` defaults to `navigator.locks`.

**locks?**

> `optional` **locks**: [`ChatOutboxLocks`](ChatOutboxLocks.md)

**seal**

> **seal**: `Pick`<`SealingCipher`, `"encrypt"` | `"decrypt"`>

**storage**

> **storage**: [`ChatOutboxStorage`](ChatOutboxStorage.md)

***

### pollIntervalMs?

> `optional` **pollIntervalMs**: `number`

Defined in: [src/lib/chatStore/vaultBackend.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#94)

Polls `/changes` this often while active; 0 polls only on activity and broadcast hints.

***

### store

> **store**: [`ChatStore`](ChatStore.md)

Defined in: [src/lib/chatStore/vaultBackend.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#85)

***

### threadCacheSize?

> `optional` **threadCacheSize**: `number`

Defined in: [src/lib/chatStore/vaultBackend.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#97)
