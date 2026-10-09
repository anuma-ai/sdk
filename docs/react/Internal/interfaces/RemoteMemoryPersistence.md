# RemoteMemoryPersistence

Defined in: [src/lib/memory/store/remotePersistence.ts:143](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#143)

Remote persistence foundation for MemoryStore, not yet its recall/retain implementation.
Nearby is authoritative: every read reaches it and writes use explicit server versions.
No local database or replica, import/activation, automatic conflict retry or rollback.
Migration must have activated the account under the canonical key before construction.

## Methods

### candidates()

> **candidates**(`embedding`: `number`\[], `options?`: [`RemoteMemoryCandidateOptions`](RemoteMemoryCandidateOptions.md)): `Promise`<{ `failed`: [`RemoteMemoryDecodeFailure`](RemoteMemoryDecodeFailure.md)\[]; `items`: [`RemoteMemoryRecord`](RemoteMemoryRecord.md)\[]; }>

Defined in: [src/lib/memory/store/remotePersistence.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#171)

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

Defined in: [src/lib/memory/store/remotePersistence.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#161)

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

### get()

> **get**(`memoryId`: `string`, `signal?`: `AbortSignal`): `Promise`<[`RemoteMemoryRecord`](RemoteMemoryRecord.md) | `null`>

Defined in: [src/lib/memory/store/remotePersistence.ts:144](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#144)

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

### list()

> **list**(`options?`: [`RemoteMemoryListOptions`](RemoteMemoryListOptions.md)): `Promise`<[`RemoteMemoryPage`](RemoteMemoryPage.md)>

Defined in: [src/lib/memory/store/remotePersistence.ts:146](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#146)

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

Defined in: [src/lib/memory/store/remotePersistence.ts:150](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#150)

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

> **putMany**(`writes`: `object`\[], `signal?`: `AbortSignal`): `Promise`<[`RemoteMemoryRecord`](RemoteMemoryRecord.md)\[]>

Defined in: [src/lib/memory/store/remotePersistence.ts:156](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#156)

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
</tbody>
</table>

**Returns**

`Promise`<[`RemoteMemoryRecord`](RemoteMemoryRecord.md)\[]>

***

### query()

> **query**(`options?`: [`RemoteMemoryQueryOptions`](RemoteMemoryQueryOptions.md)): `Promise`<[`RemoteMemoryQueryPage`](RemoteMemoryQueryPage.md)>

Defined in: [src/lib/memory/store/remotePersistence.ts:148](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#148)

Filtered, ordered page of the account's memories; follow next\_cursor to enumerate.

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
