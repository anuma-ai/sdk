# MemoryStore

Defined in: src/lib/memory/store/types.ts:127

One user's memories, pitched at what the apps do with them rather than at
the storage ops underneath. Two backends are intended: the on-device
WatermelonDB vault ([createLocalMemoryStore](../functions/createLocalMemoryStore.md)) and, later, an HTTP
client for the server-side store.

Every value crossing this interface is plain data — no WatermelonDB Model,
Query or Collection — so a remote backend can serialize it. Reads are
whole-result rather than per-row so a chat turn costs a handful of calls
(`recall`, then `retain` per fact), not one per memory.

Writes resolve `null` / `false` for a memory that is missing, deleted or
not owned by this store's user; they don't throw for it.

## Properties

### maintenance?

> `optional` **maintenance**: [`MemoryMaintenance`](MemoryMaintenance.md)

Defined in: src/lib/memory/store/types.ts:169

TRANSITIONAL — see [MemoryMaintenance](MemoryMaintenance.md). Absent on a remote backend.

## Methods

### addTopics()

> **addTopics**(`memoryId`: `string`, `topics`: readonly [`EntityInput`](../type-aliases/EntityInput.md)\[]): `Promise`<[`StoredEntity`](StoredEntity.md)\[]>

Defined in: src/lib/memory/store/types.ts:151

Add topics alongside the existing ones (auto-tagging stays on).

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

`memoryId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`topics`

</td>
<td>

readonly [`EntityInput`](../type-aliases/EntityInput.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredEntity`](StoredEntity.md)\[]>

***

### archive()

> **archive**(`id`: `string`): `Promise`<`boolean`>

Defined in: src/lib/memory/store/types.ts:146

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

`id`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

***

### create()

> **create**(`input`: [`CreateVaultMemoryOptions`](CreateVaultMemoryOptions.md)): `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)>

Defined in: src/lib/memory/store/types.ts:138

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

[`CreateVaultMemoryOptions`](CreateVaultMemoryOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)>

***

### createMany()

> **createMany**(`inputs`: [`CreateVaultMemoryOptions`](CreateVaultMemoryOptions.md)\[]): `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)\[]>

Defined in: src/lib/memory/store/types.ts:140

One write for a bulk import.

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

`inputs`

</td>
<td>

[`CreateVaultMemoryOptions`](CreateVaultMemoryOptions.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)\[]>

***

### delete()

> **delete**(`id`: `string`): `Promise`<`boolean`>

Defined in: src/lib/memory/store/types.ts:143

Soft delete; also drops the memory's topic links.

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

`id`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

***

### get()

> **get**(`id`: `string`): `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md) | `null`>

Defined in: src/lib/memory/store/types.ts:130

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

`id`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredVaultMemory`](StoredVaultMemory.md) | `null`>

***

### list()

> **list**(`options?`: [`MemoryListOptions`](MemoryListOptions.md)): `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)\[]>

Defined in: src/lib/memory/store/types.ts:129

Memories newest-first, decrypted, WITH `embedding` (Memory Graph edges read it).

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

`options?`

</td>
<td>

[`MemoryListOptions`](MemoryListOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)\[]>

***

### listArchived()

> **listArchived**(): `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)\[]>

Defined in: src/lib/memory/store/types.ts:132

Decay-archived memories (not deleted, quarantined or superseded), most recently archived first.

**Returns**

`Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)\[]>

***

### memoriesByTopics()

> **memoriesByTopics**(`names`: readonly `string`\[]): `Promise`<`Map`<`string`, `Set`<`string`>>>

Defined in: src/lib/memory/store/types.ts:134

Memory id → which of `names` it is linked to. Names are matched case-insensitively.

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

`names`

</td>
<td>

readonly `string`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Map`<`string`, `Set`<`string`>>>

***

### recall()

> **recall**(`query`: `string`, `options?`: [`MemoryRecallOptions`](../type-aliases/MemoryRecallOptions.md)): `Promise`<[`RecallResult`](RecallResult.md)>

Defined in: src/lib/memory/store/types.ts:158

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

`query`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`MemoryRecallOptions`](../type-aliases/MemoryRecallOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RecallResult`](RecallResult.md)>

***

### restore()

> **restore**(`id`: `string`): `Promise`<`boolean`>

Defined in: src/lib/memory/store/types.ts:147

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

`id`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

***

### retain()

> **retain**(`content`: `string`, `options?`: [`RetainOptions`](RetainOptions.md)): `Promise`<[`RetainResult`](RetainResult.md)>

Defined in: src/lib/memory/store/types.ts:159

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

`content`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`RetainOptions`](RetainOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RetainResult`](RetainResult.md)>

***

### setTopics()

> **setTopics**(`memoryId`: `string`, `topics`: readonly [`EntityInput`](../type-aliases/EntityInput.md)\[]): `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md) | `null`>

Defined in: src/lib/memory/store/types.ts:149

Replace the memory's topics with a user-chosen set and stop auto-tagging it.

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

`memoryId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`topics`

</td>
<td>

readonly [`EntityInput`](../type-aliases/EntityInput.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredVaultMemory`](StoredVaultMemory.md) | `null`>

***

### setVisibility()

> **setVisibility**(`id`: `string`, `visibility`: [`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md), `options?`: `object`): `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md) | `null`>

Defined in: src/lib/memory/store/types.ts:152

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

`id`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`visibility`

</td>
<td>

[`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md)

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.twinOptIn?`

</td>
<td>

`boolean`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredVaultMemory`](StoredVaultMemory.md) | `null`>

***

### subscribe()

> **subscribe**(`onChange`: () => `void`, `options?`: [`MemorySubscribeOptions`](MemorySubscribeOptions.md)): () => `void`

Defined in: src/lib/memory/store/types.ts:166

Call `onChange` after the store's memories change; re-read to see what
changed. Does not fire for the state at subscription time — read once
after subscribing. Returns the unsubscribe function.

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

() => `void`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`MemorySubscribeOptions`](MemorySubscribeOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

> (): `void`

**Returns**

`void`

***

### supersede()

> **supersede**(`id`: `string`, `supersededById`: `string`): `Promise`<`boolean`>

Defined in: src/lib/memory/store/types.ts:145

Retire `id` behind the newer `supersededById` (both must be live and owned).

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

`id`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`supersededById`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

***

### topicsByMemories()

> **topicsByMemories**(`memoryIds`: readonly `string`\[]): `Promise`<`Map`<`string`, `Set`<`string`>>>

Defined in: src/lib/memory/store/types.ts:136

Memory id → its canonical (lowercased) topic names. Unlinked ids are absent.

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

`memoryIds`

</td>
<td>

readonly `string`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Map`<`string`, `Set`<`string`>>>

***

### update()

> **update**(`id`: `string`, `patch`: [`MemoryUpdate`](../type-aliases/MemoryUpdate.md)): `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md) | `null`>

Defined in: src/lib/memory/store/types.ts:141

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

`id`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`patch`

</td>
<td>

[`MemoryUpdate`](../type-aliases/MemoryUpdate.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredVaultMemory`](StoredVaultMemory.md) | `null`>
