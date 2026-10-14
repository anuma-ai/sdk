# MemoryMigrationOptions

Defined in: [src/lib/memory/store/remoteMigration.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#79)

Options for [migrateMemoriesToRemote](../functions/migrateMemoriesToRemote.md).

## Extends

* `Pick`<[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md), `"baseUrl"` | `"getToken"` | `"fetch"` | `"timeoutMs"`>

## Properties

### allowSkipped?

> `optional` **allowSkipped**: `boolean`

Defined in: [src/lib/memory/store/remoteMigration.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#90)

Activate even when some rows could not be migrated. Default false.

***

### baseUrl

> **baseUrl**: `string`

Defined in: [src/lib/memory/store/remotePersistence.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#126)

**Inherited from**

[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md).[`baseUrl`](RemoteMemoryPersistenceOptions.md#baseurl)

***

### canonical

> **canonical**: [`MemoryKeyRing`](MemoryKeyRing.md)

Defined in: [src/lib/memory/store/remoteMigration.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#86)

The account's canonical key, which encrypts every uploaded field.

***

### fallbacks?

> `optional` **fallbacks**: readonly [`MemoryKeyRing`](MemoryKeyRing.md)\[]

Defined in: [src/lib/memory/store/remoteMigration.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#88)

Older keys that may have encrypted local rows.

***

### fetch()?

> `optional` **fetch**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/store/remotePersistence.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#131)

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

Defined in: [src/lib/memory/store/remotePersistence.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#127)

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md).[`getToken`](RemoteMemoryPersistenceOptions.md#gettoken)

***

### onProgress()?

> `optional` **onProgress**: (`progress`: [`MemoryMigrationProgress`](MemoryMigrationProgress.md)) => `void`

Defined in: [src/lib/memory/store/remoteMigration.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#92)

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

Defined in: [src/lib/memory/store/remoteMigration.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#91)

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/lib/memory/store/remotePersistence.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#134)

**Inherited from**

[`RemoteMemoryPersistenceOptions`](RemoteMemoryPersistenceOptions.md).[`timeoutMs`](RemoteMemoryPersistenceOptions.md#timeoutms)

***

### vaultCtx

> **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/store/remoteMigration.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteMigration.ts#84)

The local vault to read, scoped by `userId` or marked `singleTenant`.
