# VaultChatBackendOptions

Defined in: [src/lib/chatStore/vaultBackend.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#94)

## Properties

### activity?

> `optional` **activity**: [`VaultChatActivity`](VaultChatActivity.md)

Defined in: [src/lib/chatStore/vaultBackend.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#103)

***

### cache?

> `optional` **cache**: `object`

Defined in: [src/lib/chatStore/vaultBackend.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#111)

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

Defined in: [src/lib/chatStore/vaultBackend.ts:109](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#109)

BroadcastChannel name shared by this account's tabs, so one tab's writes prompt the others to poll.

***

### now()?

> `optional` **now**: () => `number`

Defined in: [src/lib/chatStore/vaultBackend.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#117)

**Returns**

`number`

***

### outbox?

> `optional` **outbox**: `object`

Defined in: [src/lib/chatStore/vaultBackend.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#98)

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

Defined in: [src/lib/chatStore/vaultBackend.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#105)

Polls `/changes` this often while active; 0 polls only on activity and broadcast hints.

***

### store

> **store**: [`ChatStore`](ChatStore.md) | () => `Promise`<[`ChatStore`](ChatStore.md)>

Defined in: [src/lib/chatStore/vaultBackend.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#96)

A connected store, or a function that connects one; with a seeded `cache`, reads serve cached chats until it resolves.

***

### subscribeChanges()?

> `optional` **subscribeChanges**: (`onChange`: (`connected`: `boolean`) => `void`) => () => `void`

Defined in: [src/lib/chatStore/vaultBackend.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#107)

A `createVaultRealtime` source for `private_chats`: each report polls `/changes`, and while it reports connected the periodic poll runs at most every 5 minutes.

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`onChange`

</td>
<td>

(`connected`: `boolean`) => `void`

</td>
</tr>
</tbody>
</table>

**Returns**

> (): `void`

**Returns**

`void`

***

### threadCacheSize?

> `optional` **threadCacheSize**: `number`

Defined in: [src/lib/chatStore/vaultBackend.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultBackend.ts#116)
