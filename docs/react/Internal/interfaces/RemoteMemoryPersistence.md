# RemoteMemoryPersistence

Defined in: [src/lib/memory/store/remotePersistence.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#161)

Remote persistence foundation for MemoryStore, not yet its recall/retain implementation.
Nearby is authoritative: every read reaches it and writes use explicit server versions.
No local database or replica, import/activation, automatic conflict retry or rollback.
Migration must have activated the account under the canonical key before construction.

## Extends

* [`RemoteTopicPersistence`](RemoteTopicPersistence.md).[`RemoteMemoryWorkPersistence`](RemoteMemoryWorkPersistence.md)

## Properties

### supportsRealtimeChanges?

> `optional` **supportsRealtimeChanges**: `boolean`

Defined in: [src/lib/memory/store/remotePersistence.ts:163](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#163)

## Methods

### candidates()

> **candidates**(`embedding`: `number`\[], `options?`: [`RemoteMemoryCandidateOptions`](RemoteMemoryCandidateOptions.md)): `Promise`<{ `failed`: [`RemoteMemoryDecodeFailure`](RemoteMemoryDecodeFailure.md)\[]; `items`: [`RemoteMemoryRecord`](RemoteMemoryRecord.md)\[]; }>

Defined in: [src/lib/memory/store/remotePersistence.ts:199](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#199)

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

`Promise`<{ `failed`: [`RemoteMemoryDecodeFailure`](RemoteMemoryDecodeFailure.md)\[]; `items`: [`RemoteMemoryRecord`](RemoteMemoryRecord.md)\[]; }>

***

### candidateSet()

> **candidateSet**(`embedding`: `number`\[], `options?`: [`RemoteMemoryCandidateOptions`](RemoteMemoryCandidateOptions.md)): `Promise`<{ `failed`: [`RemoteMemoryDecodeFailure`](RemoteMemoryDecodeFailure.md)\[]; `items`: [`RemoteMemoryRecord`](RemoteMemoryRecord.md)\[]; `total_count`: `number`; `unavailable_count`: `number`; }>

Defined in: [src/lib/memory/store/remotePersistence.ts:189](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#189)

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

Defined in: [src/lib/memory/store/remotePersistence.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#164)

**Returns**

`Promise`<[`MemoryCounts`](MemoryCounts.md)>

***

### get()

> **get**(`memoryId`: `string`, `signal?`: `AbortSignal`): `Promise`<[`RemoteMemoryRecord`](RemoteMemoryRecord.md) | `null`>

Defined in: [src/lib/memory/store/remotePersistence.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#166)

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

Defined in: [src/lib/memory/store/remoteTopics.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteTopics.ts#20)

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

Defined in: [src/lib/memory/store/remotePersistence.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#168)

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

Defined in: [src/lib/memory/store/remotePersistence.ts:177](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#177)

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

Defined in: [src/lib/memory/store/remotePersistence.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#183)

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

Defined in: [src/lib/memory/store/remoteTopics.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteTopics.ts#16)

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

Defined in: [src/lib/memory/store/remotePersistence.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#169)

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

Defined in: [src/lib/memory/store/remotePersistence.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#171)

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

### temporal()

> **temporal**(`window`: `object`, `limit?`: `number`): `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remotePersistence.ts:165](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#165)

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

Defined in: [src/lib/memory/store/remoteTopics.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteTopics.ts#15)

**Returns**

`Promise`<[`RemoteMemoryTopic`](RemoteMemoryTopic.md)\[]>

**Inherited from**

[`RemoteTopicPersistence`](RemoteTopicPersistence.md).[`topics`](RemoteTopicPersistence.md#topics)
