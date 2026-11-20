# RemoteMemoryPersistence

Defined in: [src/lib/memory/store/remotePersistence.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#183)

Remote persistence foundation for MemoryStore, not yet its recall/retain implementation.
Nearby is authoritative: every read reaches it and writes use explicit server versions.
No local database or replica, import/activation, automatic conflict retry or rollback.
Migration must have activated the account under the canonical key before construction.

## Extends

* [`RemoteTopicPersistence`](RemoteTopicPersistence.md).[`RemoteMemoryWorkPersistence`](RemoteMemoryWorkPersistence.md)

## Methods

### candidates()

> **candidates**(`embedding`: `number`\[], `options?`: [`RemoteMemoryCandidateOptions`](RemoteMemoryCandidateOptions.md)): `Promise`<{ `failed`: [`RemoteMemoryDecodeFailure`](RemoteMemoryDecodeFailure.md)\[]; `items`: [`RemoteMemoryRecord`](RemoteMemoryRecord.md)\[]; `lanes?`: { `event_time`: `string`\[]; `topic`: `string`\[]; }; }>

Defined in: [src/lib/memory/store/remotePersistence.ts:232](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#232)

Nearby ranks ciphertext using a query vector and metadata; returned winners decrypt on-device.

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

`embedding`

</td>
<td>

`number`\[]

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`RemoteMemoryCandidateOptions`](RemoteMemoryCandidateOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<{ `failed`: [`RemoteMemoryDecodeFailure`](RemoteMemoryDecodeFailure.md)\[]; `items`: [`RemoteMemoryRecord`](RemoteMemoryRecord.md)\[]; `lanes?`: { `event_time`: `string`\[]; `topic`: `string`\[]; }; }>

***

### candidateSet()

> **candidateSet**(`embedding`: `number`\[], `options?`: [`RemoteMemoryCandidateOptions`](RemoteMemoryCandidateOptions.md)): `Promise`<{ `failed`: [`RemoteMemoryDecodeFailure`](RemoteMemoryDecodeFailure.md)\[]; `items`: [`RemoteMemoryRecord`](RemoteMemoryRecord.md)\[]; `total_count`: `number`; `unavailable_count`: `number`; }>

Defined in: [src/lib/memory/store/remotePersistence.ts:222](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#222)

Candidate window plus counts for distinguishing empty storage from unavailable vectors.

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

`embedding`

</td>
<td>

`number`\[]

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`RemoteMemoryCandidateOptions`](RemoteMemoryCandidateOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<{ `failed`: [`RemoteMemoryDecodeFailure`](RemoteMemoryDecodeFailure.md)\[]; `items`: [`RemoteMemoryRecord`](RemoteMemoryRecord.md)\[]; `total_count`: `number`; `unavailable_count`: `number`; }>

***

### claimWork()

> **claimWork**(`kind`: [`RemoteMemoryWorkKind`](../type-aliases/RemoteMemoryWorkKind.md), `processorVersion`: `string`, `token?`: `string`): `Promise`<[`RemoteMemoryWorkLease`](RemoteMemoryWorkLease.md) | `null`>

Defined in: [src/lib/memory/store/remoteWork.ts:17](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteWork.ts#17)

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

`kind`

</td>
<td>

[`RemoteMemoryWorkKind`](../type-aliases/RemoteMemoryWorkKind.md)

</td>
</tr>
<tr>
<td>

`processorVersion`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`token?`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RemoteMemoryWorkLease`](RemoteMemoryWorkLease.md) | `null`>

**Inherited from**

[`RemoteMemoryWorkPersistence`](RemoteMemoryWorkPersistence.md).[`claimWork`](RemoteMemoryWorkPersistence.md#claimwork)

***

### counts()

> **counts**(): `Promise`<[`MemoryCounts`](MemoryCounts.md)>

Defined in: [src/lib/memory/store/remotePersistence.ts:187](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#187)

**Returns**

`Promise`<[`MemoryCounts`](MemoryCounts.md)>

***

### get()

> **get**(`memoryId`: `string`, `signal?`: `AbortSignal`): `Promise`<[`RemoteMemoryRecord`](RemoteMemoryRecord.md) | `null`>

Defined in: [src/lib/memory/store/remotePersistence.ts:189](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#189)

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

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RemoteMemoryRecord`](RemoteMemoryRecord.md) | `null`>

***

### importTopics()

> **importTopics**(`topics`: readonly `object`\[], `signal?`: `AbortSignal`): `Promise`<`void`>

Defined in: [src/lib/memory/store/remoteTopics.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteTopics.ts#23)

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
<tr>
<td>

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

**Inherited from**

[`RemoteTopicPersistence`](RemoteTopicPersistence.md).[`importTopics`](RemoteTopicPersistence.md#importtopics)

***

### list()

> **list**(`options?`: [`RemoteMemoryListOptions`](RemoteMemoryListOptions.md)): `Promise`<[`RemoteMemoryPage`](RemoteMemoryPage.md)>

Defined in: [src/lib/memory/store/remotePersistence.ts:191](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#191)

One stable memory-id page; follow next\_cursor to enumerate. Embeddings are opt-in.

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

[`RemoteMemoryListOptions`](RemoteMemoryListOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RemoteMemoryPage`](RemoteMemoryPage.md)>

***

### put()

> **put**(`memory`: [`RemoteMemoryRow`](RemoteMemoryRow.md), `expectedVersion`: `number` | [`RemoteMemoryRecord`](RemoteMemoryRecord.md), `signal?`: `AbortSignal`): `Promise`<[`RemoteMemoryRecord`](RemoteMemoryRecord.md)>

Defined in: [src/lib/memory/store/remotePersistence.ts:200](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#200)

Whole-row write. Pass a returned snapshot to avoid GET; a number retains the read-before-write path. Version 0 creates. is\_deleted writes a tombstone.

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

`memory`

</td>
<td>

[`RemoteMemoryRow`](RemoteMemoryRow.md)

</td>
</tr>
<tr>
<td>

`expectedVersion`

</td>
<td>

`number` | [`RemoteMemoryRecord`](RemoteMemoryRecord.md)

</td>
</tr>
<tr>
<td>

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RemoteMemoryRecord`](RemoteMemoryRecord.md)>

***

### putMany()

> **putMany**(`writes`: `object`\[], `signal?`: `AbortSignal`, `leaseToken?`: `string`): `Promise`<[`RemoteMemoryRecord`](RemoteMemoryRecord.md)\[]>

Defined in: [src/lib/memory/store/remotePersistence.ts:216](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#216)

1–50 writes in one server transaction; never split or replay a batch.

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

`writes`

</td>
<td>

`object`\[]

</td>
</tr>
<tr>
<td>

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
<tr>
<td>

`leaseToken?`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RemoteMemoryRecord`](RemoteMemoryRecord.md)\[]>

***

### putTopic()

> **putTopic**(`topic`: `Pick`<[`RemoteMemoryTopic`](RemoteMemoryTopic.md), `"name"` | `"kind"` | `"is_deleted"`>, `expectedVersion`: `number`): `Promise`<[`RemoteMemoryTopic`](RemoteMemoryTopic.md)>

Defined in: [src/lib/memory/store/remoteTopics.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteTopics.ts#19)

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

`topic`

</td>
<td>

`Pick`<[`RemoteMemoryTopic`](RemoteMemoryTopic.md), `"name"` | `"kind"` | `"is_deleted"`>

</td>
</tr>
<tr>
<td>

`expectedVersion`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RemoteMemoryTopic`](RemoteMemoryTopic.md)>

**Inherited from**

[`RemoteTopicPersistence`](RemoteTopicPersistence.md).[`putTopic`](RemoteTopicPersistence.md#puttopic)

***

### query()

> **query**(`options?`: [`RemoteMemoryQueryOptions`](RemoteMemoryQueryOptions.md)): `Promise`<[`RemoteMemoryQueryPage`](RemoteMemoryQueryPage.md)>

Defined in: [src/lib/memory/store/remotePersistence.ts:192](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#192)

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

[`RemoteMemoryQueryOptions`](RemoteMemoryQueryOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RemoteMemoryQueryPage`](RemoteMemoryQueryPage.md)>

***

### queryMetadata()

> **queryMetadata**(`options?`: `Omit`<[`RemoteMemoryQueryOptions`](RemoteMemoryQueryOptions.md), `"order"`> & `object`): `Promise`<[`RemoteMemoryMetadataPage`](RemoteMemoryMetadataPage.md)>

Defined in: [src/lib/memory/store/remotePersistence.ts:194](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#194)

Same page as `query`, with content and kind\_value dropped instead of decrypted.

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

`Omit`<[`RemoteMemoryQueryOptions`](RemoteMemoryQueryOptions.md), `"order"`> & `object`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RemoteMemoryMetadataPage`](RemoteMemoryMetadataPage.md)>

***

### recordRecalls()

> **recordRecalls**(`memoryIds`: readonly `string`\[], `signal?`: `AbortSignal`): `Promise`<`void`>

Defined in: [src/lib/memory/store/remotePersistence.ts:214](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#214)

Count one answer for each distinct id, in requests of at most 100 ids.

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
<tr>
<td>

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

***

### releaseWork()

> **releaseWork**(`kind`: [`RemoteMemoryWorkKind`](../type-aliases/RemoteMemoryWorkKind.md), `token`: `string`): `Promise`<`void`>

Defined in: [src/lib/memory/store/remoteWork.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteWork.ts#22)

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

`kind`

</td>
<td>

[`RemoteMemoryWorkKind`](../type-aliases/RemoteMemoryWorkKind.md)

</td>
</tr>
<tr>
<td>

`token`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

**Inherited from**

[`RemoteMemoryWorkPersistence`](RemoteMemoryWorkPersistence.md).[`releaseWork`](RemoteMemoryWorkPersistence.md#releasework)

***

### serverDecays()?

> `optional` **serverDecays**(): `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:186](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#186)

**Returns**

`boolean`

***

### setEnabled()

> **setEnabled**(`memoryId`: `string`, `enabled`: `boolean`, `expectedVersion`: `number`, `updatedAt`: `number`, `signal?`: `AbortSignal`): `Promise`<[`RemoteMemoryRecord`](RemoteMemoryRecord.md)>

Defined in: [src/lib/memory/store/remotePersistence.ts:206](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#206)

Switch a memory on or off for answers; `expectedVersion` is the item version this write replaces.

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

`enabled`

</td>
<td>

`boolean`

</td>
</tr>
<tr>
<td>

`expectedVersion`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`updatedAt`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RemoteMemoryRecord`](RemoteMemoryRecord.md)>

***

### supportsCandidateLanes()?

> `optional` **supportsCandidateLanes**(): `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:185](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#185)

**Returns**

`boolean`

***

### temporal()

> **temporal**(`window`: `object`, `limit?`: `number`): `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remotePersistence.ts:188](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#188)

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

`window`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`window.end`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`window.start?`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`\[]>

***

### topics()

> **topics**(): `Promise`<[`RemoteMemoryTopic`](RemoteMemoryTopic.md)\[]>

Defined in: [src/lib/memory/store/remoteTopics.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteTopics.ts#18)

**Returns**

`Promise`<[`RemoteMemoryTopic`](RemoteMemoryTopic.md)\[]>

**Inherited from**

[`RemoteTopicPersistence`](RemoteTopicPersistence.md).[`topics`](RemoteTopicPersistence.md#topics)
