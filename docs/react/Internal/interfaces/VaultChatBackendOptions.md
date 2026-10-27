# VaultChatBackendOptions

Defined in: [src/lib/chatStore/vaultBackend.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#80)

## Properties

### activity?

> `optional` **activity**: [`VaultChatActivity`](VaultChatActivity.md)

Defined in: [src/lib/chatStore/vaultBackend.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#88)

***

### channel?

> `optional` **channel**: `string`

Defined in: [src/lib/chatStore/vaultBackend.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#92)

BroadcastChannel name shared by this account's tabs, so one tab's writes prompt the others to poll.

***

### now()?

> `optional` **now**: () => `number`

Defined in: [src/lib/chatStore/vaultBackend.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#94)

**Returns**

`number`

***

### outbox?

> `optional` **outbox**: `object`

Defined in: [src/lib/chatStore/vaultBackend.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#83)

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

Defined in: [src/lib/chatStore/vaultBackend.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#90)

Polls `/changes` this often while active; 0 polls only on activity and broadcast hints.

***

### store

> **store**: [`ChatStore`](ChatStore.md)

Defined in: [src/lib/chatStore/vaultBackend.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#81)

***

### threadCacheSize?

> `optional` **threadCacheSize**: `number`

Defined in: [src/lib/chatStore/vaultBackend.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#93)
