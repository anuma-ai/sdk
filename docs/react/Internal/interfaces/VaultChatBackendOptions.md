# VaultChatBackendOptions

Defined in: [src/lib/chatStore/vaultBackend.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#84)

## Properties

### activity?

> `optional` **activity**: [`VaultChatActivity`](VaultChatActivity.md)

Defined in: [src/lib/chatStore/vaultBackend.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#93)

***

### cache?

> `optional` **cache**: `object`

Defined in: [src/lib/chatStore/vaultBackend.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#99)

Keeps `account`'s confirmed records and `/changes` cursor sealed with `seal`, so a cold start reads them before vault answers.

**account**

> **account**: `string`

**seal**

> **seal**: `Pick`<`SealingCipher`, `"encrypt"` | `"decrypt"`>

**storage**

> **storage**: [`ChatCacheStorage`](ChatCacheStorage.md)

***

### channel?

> `optional` **channel**: `string`

Defined in: [src/lib/chatStore/vaultBackend.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#97)

BroadcastChannel name shared by this account's tabs, so one tab's writes prompt the others to poll.

***

### now()?

> `optional` **now**: () => `number`

Defined in: [src/lib/chatStore/vaultBackend.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#105)

**Returns**

`number`

***

### outbox?

> `optional` **outbox**: `object`

Defined in: [src/lib/chatStore/vaultBackend.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#88)

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

Defined in: [src/lib/chatStore/vaultBackend.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#95)

Polls `/changes` this often while active; 0 polls only on activity and broadcast hints.

***

### store

> **store**: [`ChatStore`](ChatStore.md) | () => `Promise`<[`ChatStore`](ChatStore.md)>

Defined in: [src/lib/chatStore/vaultBackend.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#86)

A connected store, or a function that connects one; with a seeded `cache`, reads serve cached chats until it resolves.

***

### threadCacheSize?

> `optional` **threadCacheSize**: `number`

Defined in: [src/lib/chatStore/vaultBackend.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#104)
