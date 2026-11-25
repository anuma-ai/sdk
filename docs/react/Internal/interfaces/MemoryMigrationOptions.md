# MemoryMigrationOptions

Defined in: [src/lib/memory/store/remoteMigration.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#105)

Options for [migrateMemoriesToRemote](../functions/migrateMemoriesToRemote.md).

## Extends

* `Pick`<[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md), `"baseUrl"` | `"getToken"` | `"fetch"` | `"timeoutMs"`>

## Properties

### allowSkipped?

> `optional` **allowSkipped**: `boolean`

Defined in: [src/lib/memory/store/remoteMigration.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#116)

Activate even when some rows could not be migrated. Default false.

***

### baseUrl

> **baseUrl**: `string`

Defined in: [src/lib/memory/store/remotePersistence.ts:150](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#150)

**Inherited from**

[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md).[`baseUrl`](RemoteMemoryPersistenceOptions.md#baseurl)

***

### canonical

> **canonical**: [`MemoryKeyRing`](MemoryKeyRing.md)

Defined in: [src/lib/memory/store/remoteMigration.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#112)

The account's canonical key, which encrypts every uploaded field.

***

### embeddingOptions?

> `optional` **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/store/remoteMigration.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#118)

Re-embeds rows whose local vector nearby could not rank; without it those rows upload unembedded.

***

### fallbacks?

> `optional` **fallbacks**: readonly [`MemoryKeyRing`](MemoryKeyRing.md)\[]

Defined in: [src/lib/memory/store/remoteMigration.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#114)

Older keys that may have encrypted local rows.

***

### fetch()?

> `optional` **fetch**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/store/remotePersistence.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#157)

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

Defined in: [src/lib/memory/store/remotePersistence.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#151)

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md).[`getToken`](RemoteMemoryPersistenceOptions.md#gettoken)

***

### onActivated()

> **onActivated**: () => `void` | `Promise`<`void`>

Defined in: [src/lib/memory/store/remoteMigration.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#124)

Route all subsequent memory writes to the remote store before this callback returns.

**Returns**

`void` | `Promise`<`void`>

***

### onProgress()?

> `optional` **onProgress**: (`progress`: [`MemoryMigrationProgress`](MemoryMigrationProgress.md)) => `void`

Defined in: [src/lib/memory/store/remoteMigration.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#126)

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

Defined in: [src/lib/memory/store/remoteMigration.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#125)

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/lib/memory/store/remotePersistence.ts:160](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#160)

**Inherited from**

[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md).[`timeoutMs`](RemoteMemoryPersistenceOptions.md#timeoutms)

***

### topics?

> `optional` **topics**: readonly `object`\[]

Defined in: [src/lib/memory/store/remoteMigration.ts:120](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#120)

Explicitly account-owned topics for databases that are not marked singleTenant.

***

### vaultCtx

> **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/store/remoteMigration.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#110)

The local vault to read, scoped by `userId` or marked `singleTenant`.

***

### withWriteBarrier()

> **withWriteBarrier**: (`task`: () => `Promise`<[`MemoryMigrationResult`](MemoryMigrationResult.md)>) => `Promise`<[`MemoryMigrationResult`](MemoryMigrationResult.md)>

Defined in: [src/lib/memory/store/remoteMigration.ts:122](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#122)

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
