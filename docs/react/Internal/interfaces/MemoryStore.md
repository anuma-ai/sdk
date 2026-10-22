# MemoryStore

Defined in: [src/lib/memory/store/types.ts:279](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#279)

One user's memories, pitched at what the apps do with them rather than at
the storage ops underneath. Two backends are intended: the on-device
WatermelonDB vault ([createLocalMemoryStore](../functions/createLocalMemoryStore.md)) and, later, an HTTP
client for the server-side store.

Every value crossing this interface is plain data — no WatermelonDB Model,
Query or Collection — so a remote backend can serialize it. The one
exception is the DEVICE-LOCAL LLM-call knobs on [MemoryRecallOptions](../type-aliases/MemoryRecallOptions.md)
and [MemoryRetainOptions](../type-aliases/MemoryRetainOptions.md), which a remote store uses on the device
rather than forwarding to nearby. Server persistence is authoritative;
content decryption and plaintext-dependent processing remain on the device. Reads are
whole-result rather than per-row so a chat turn costs a handful of calls
(`recall`, then `retain` per fact), not one per memory.

Writes resolve `null` / `false` for a memory that is missing, deleted or
not owned by this store's user; they don't throw for it.

## Properties

### decay?

> `readonly` `optional` **decay**: [`MemoryDecay`](MemoryDecay.md)

Defined in: [src/lib/memory/store/types.ts:349](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#349)

Rule-based decay, available without the local-only [MemoryMaintenance](MemoryMaintenance.md).

***

### factSource

> `readonly` **factSource**: `RecallFactSource`

Defined in: [src/lib/memory/store/types.ts:332](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#332)

The fact lane of `recall`, for callers that fuse it with other lanes such as conversation chunks.

***

### maintenance?

> `optional` **maintenance**: [`MemoryMaintenance`](MemoryMaintenance.md)

Defined in: [src/lib/memory/store/types.ts:347](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#347)

TRANSITIONAL — see [MemoryMaintenance](MemoryMaintenance.md). Absent on a remote backend.

***

### masksEmbeddingInput

> `readonly` **masksEmbeddingInput**: `boolean`

Defined in: [src/lib/memory/store/types.ts:334](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#334)

True when the store was built with `embeddingOptions.maskInput`, so every embedding request it makes is masked.

***

### topicMaintenance

> `readonly` **topicMaintenance**: [`MemoryTopicMaintenance`](MemoryTopicMaintenance.md)

Defined in: [src/lib/memory/store/types.ts:351](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#351)

Topic-extraction upkeep, available on every backend.

## Methods

### addTopics()

> **addTopics**(`memoryId`: `string`, `topics`: readonly [`EntityInput`](../type-aliases/EntityInput.md)\[], `options?`: `object`): `Promise`<[`StoredEntity`](StoredEntity.md)\[]>

Defined in: [src/lib/memory/store/types.ts:314](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#314)

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

`options.canWrite?`

</td>
<td>

() => `Promise`<`boolean`>

</td>
</tr>
<tr>
<td>

`options.signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
<tr>
<td>

`options.unlessUserManaged?`

</td>
<td>

`boolean`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredEntity`](StoredEntity.md)\[]>

***

### archive()

> **archive**(`id`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/memory/store/types.ts:309](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#309)

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

### counts()?

> `optional` **counts**(): `Promise`<[`MemoryCounts`](MemoryCounts.md)>

Defined in: [src/lib/memory/store/types.ts:285](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#285)

Metadata-only counts for the live, archived and quarantined lists.

**Returns**

`Promise`<[`MemoryCounts`](MemoryCounts.md)>

***

### create()

> **create**(`input`: [`MemoryCreate`](../type-aliases/MemoryCreate.md)): `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)>

Defined in: [src/lib/memory/store/types.ts:301](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#301)

Manual save; missing embeddings are filled in the background.

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

[`MemoryCreate`](../type-aliases/MemoryCreate.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)>

***

### createMany()

> **createMany**(`inputs`: [`MemoryCreate`](../type-aliases/MemoryCreate.md)\[]): `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)\[]>

Defined in: [src/lib/memory/store/types.ts:303](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#303)

One write for a batch of manual saves; migration/restore uses lower-level operations.

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

[`MemoryCreate`](../type-aliases/MemoryCreate.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)\[]>

***

### createTopic()?

> `optional` **createTopic**(`name`: `string`): `Promise`<`string` | `null`>

Defined in: [src/lib/memory/store/types.ts:281](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#281)

Creates an account-scoped topic without requiring a memory.

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

`name`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string` | `null`>

***

### delete()

> **delete**(`id`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/memory/store/types.ts:306](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#306)

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

Defined in: [src/lib/memory/store/types.ts:288](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#288)

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

### importTopics()?

> `optional` **importTopics**(`topics`: readonly `object`\[]): `Promise`<`void`>

Defined in: [src/lib/memory/store/types.ts:283](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#283)

Imports local topic metadata without replacing server entries or tombstones.

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

`topics`

</td>
<td>

readonly `object`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

***

### list()

> **list**(`options?`: [`MemoryListOptions`](MemoryListOptions.md)): `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)\[]>

Defined in: [src/lib/memory/store/types.ts:287](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#287)

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

Defined in: [src/lib/memory/store/types.ts:290](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#290)

Decay-archived memories (not deleted, quarantined or superseded), most recently archived first.

**Returns**

`Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)\[]>

***

### listProjections()

> **listProjections**(`options?`: [`MemoryListOptions`](MemoryListOptions.md)): `Promise`<[`VaultMemoryProjection`](VaultMemoryProjection.md)\[]>

Defined in: [src/lib/memory/store/types.ts:298](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#298)

The memories [MemoryStore.list](#list) would return, without decrypting content.

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

`Promise`<[`VaultMemoryProjection`](VaultMemoryProjection.md)\[]>

***

### listTopics()

> **listTopics**(): `Promise`<[`MemoryTopic`](MemoryTopic.md)\[]>

Defined in: [src/lib/memory/store/types.ts:296](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#296)

Every topic by canonical name, with its kind and linked-memory count.

**Returns**

`Promise`<[`MemoryTopic`](MemoryTopic.md)\[]>

***

### memoriesByTopics()

> **memoriesByTopics**(`names`: readonly `string`\[]): `Promise`<`Map`<`string`, `Set`<`string`>>>

Defined in: [src/lib/memory/store/types.ts:292](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#292)

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

Defined in: [src/lib/memory/store/types.ts:329](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#329)

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

### repairEmbeddings()?

> `optional` **repairEmbeddings**(`options?`: [`EmbeddingRepairOptions`](EmbeddingRepairOptions.md)): `Promise`<[`EmbeddingRepairResult`](EmbeddingRepairResult.md)>

Defined in: [src/lib/memory/store/types.ts:344](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#344)

Re-embeds memories the backend cannot rank with the current model. Absent where recall re-embeds lazily.

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

[`EmbeddingRepairOptions`](EmbeddingRepairOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`EmbeddingRepairResult`](EmbeddingRepairResult.md)>

***

### restore()

> **restore**(`id`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/memory/store/types.ts:310](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#310)

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

> **retain**(`content`: `string`, `options?`: [`MemoryRetainOptions`](../type-aliases/MemoryRetainOptions.md)): `Promise`<[`RetainResult`](RetainResult.md)>

Defined in: [src/lib/memory/store/types.ts:330](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#330)

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

[`MemoryRetainOptions`](../type-aliases/MemoryRetainOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RetainResult`](RetainResult.md)>

***

### setTopics()

> **setTopics**(`memoryId`: `string`, `topics`: readonly [`EntityInput`](../type-aliases/EntityInput.md)\[]): `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md) | `null`>

Defined in: [src/lib/memory/store/types.ts:312](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#312)

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

Defined in: [src/lib/memory/store/types.ts:323](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#323)

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

Defined in: [src/lib/memory/store/types.ts:341](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#341)

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

Defined in: [src/lib/memory/store/types.ts:308](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#308)

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

Defined in: [src/lib/memory/store/types.ts:294](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#294)

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

Defined in: [src/lib/memory/store/types.ts:304](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#304)

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
