# MemoryMigrationOptions

Defined in: [src/lib/memory/store/remoteMigration.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#26)

Options for [migrateMemoriesToRemote](../functions/migrateMemoriesToRemote.md).

## Extends

* `Pick`<[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md), `"baseUrl"` | `"getToken"` | `"fetch"` | `"timeoutMs"`>

## Properties

### allowSkipped?

> `optional` **allowSkipped**: `boolean`

Defined in: [src/lib/memory/store/remoteMigration.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#37)

Activate even when some rows could not be migrated. Default false.

***

### baseUrl

> **baseUrl**: `string`

Defined in: [src/lib/memory/store/remotePersistence.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#124)

**Inherited from**

[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md).[`baseUrl`](RemoteMemoryPersistenceOptions.md#baseurl)

***

### canonical

> **canonical**: [`MemoryKeyRing`](MemoryKeyRing.md)

Defined in: [src/lib/memory/store/remoteMigration.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#33)

The account's canonical key. Every uploaded field is encrypted under it.

***

### fallbacks?

> `optional` **fallbacks**: readonly [`MemoryKeyRing`](MemoryKeyRing.md)\[]

Defined in: [src/lib/memory/store/remoteMigration.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#35)

Older keys that may have encrypted local rows.

***

### fetch()?

> `optional` **fetch**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/store/remotePersistence.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#129)

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

Defined in: [src/lib/memory/store/remotePersistence.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#125)

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md).[`getToken`](RemoteMemoryPersistenceOptions.md#gettoken)

***

### onProgress()?

> `optional` **onProgress**: (`progress`: [`MemoryMigrationProgress`](MemoryMigrationProgress.md)) => `void`

Defined in: [src/lib/memory/store/remoteMigration.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#39)

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

Defined in: [src/lib/memory/store/remoteMigration.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#38)

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/lib/memory/store/remotePersistence.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#132)

**Inherited from**

[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md).[`timeoutMs`](RemoteMemoryPersistenceOptions.md#timeoutms)

***

### vaultCtx

> **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/store/remoteMigration.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#31)

The local vault to read. Its `userId` scopes which rows are migrated.
