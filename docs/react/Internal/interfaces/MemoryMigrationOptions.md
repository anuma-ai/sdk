# MemoryMigrationOptions

Defined in: [src/lib/memory/store/remoteMigration.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#94)

Options for [migrateMemoriesToRemote](../functions/migrateMemoriesToRemote.md).

## Extends

* `Pick`<[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md), `"baseUrl"` | `"getToken"` | `"fetch"` | `"timeoutMs"`>

## Properties

### allowSkipped?

> `optional` **allowSkipped**: `boolean`

Defined in: [src/lib/memory/store/remoteMigration.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#105)

Activate even when some rows could not be migrated. Default false.

***

### baseUrl

> **baseUrl**: `string`

Defined in: [src/lib/memory/store/remotePersistence.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#130)

**Inherited from**

[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md).[`baseUrl`](RemoteMemoryPersistenceOptions.md#baseurl)

***

### canonical

> **canonical**: [`MemoryKeyRing`](MemoryKeyRing.md)

Defined in: [src/lib/memory/store/remoteMigration.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#101)

The account's canonical key, which encrypts every uploaded field.

***

### embeddingOptions?

> `optional` **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/store/remoteMigration.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#107)

Re-embeds rows whose local vector nearby could not rank; without it those rows upload unembedded.

***

### fallbacks?

> `optional` **fallbacks**: readonly [`MemoryKeyRing`](MemoryKeyRing.md)\[]

Defined in: [src/lib/memory/store/remoteMigration.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#103)

Older keys that may have encrypted local rows.

***

### fetch()?

> `optional` **fetch**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/store/remotePersistence.ts:135](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#135)

**Call Signature**

> (`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

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

`input`

</td>
<td>

`RequestInfo` | `URL`

</td>
</tr>
<tr>
<td>

`init?`

</td>
<td>

`RequestInit`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Response`>

**Call Signature**

> (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

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

`input`

</td>
<td>

`string` | `Request` | `URL`

</td>
</tr>
<tr>
<td>

`init?`

</td>
<td>

`RequestInit`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Response`>

**Inherited from**

[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md).[`fetch`](RemoteMemoryPersistenceOptions.md#fetch)

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/memory/store/remotePersistence.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#131)

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md).[`getToken`](RemoteMemoryPersistenceOptions.md#gettoken)

***

### onActivated()

> **onActivated**: () => `void` | `Promise`<`void`>

Defined in: [src/lib/memory/store/remoteMigration.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#113)

Route all subsequent memory writes to the remote store before this callback returns.

**Returns**

`void` | `Promise`<`void`>

***

### onProgress()?

> `optional` **onProgress**: (`progress`: [`MemoryMigrationProgress`](MemoryMigrationProgress.md)) => `void`

Defined in: [src/lib/memory/store/remoteMigration.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#115)

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

`progress`

</td>
<td>

[`MemoryMigrationProgress`](MemoryMigrationProgress.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/memory/store/remoteMigration.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#114)

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/lib/memory/store/remotePersistence.ts:138](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#138)

**Inherited from**

[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md).[`timeoutMs`](RemoteMemoryPersistenceOptions.md#timeoutms)

***

### topics?

> `optional` **topics**: readonly `object`\[]

Defined in: [src/lib/memory/store/remoteMigration.ts:109](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#109)

Explicitly account-owned topics for databases that are not marked singleTenant.

***

### vaultCtx

> **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/store/remoteMigration.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#99)

The local vault to read, scoped by `userId` or marked `singleTenant`.

***

### withWriteBarrier()

> **withWriteBarrier**: (`task`: () => `Promise`<[`MemoryMigrationResult`](MemoryMigrationResult.md)>) => `Promise`<[`MemoryMigrationResult`](MemoryMigrationResult.md)>

Defined in: [src/lib/memory/store/remoteMigration.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#111)

Drain all local memory writes, block new writes until the task returns, and retain the block if the remote handoff fails.

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

`task`

</td>
<td>

() => `Promise`<[`MemoryMigrationResult`](MemoryMigrationResult.md)>

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`MemoryMigrationResult`](MemoryMigrationResult.md)>
