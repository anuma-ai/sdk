# RemoteMemoryPersistence

Defined in: src/lib/memory/store/remotePersistence.ts:107

Remote persistence foundation for MemoryStore, not yet its recall/retain implementation.
Nearby is authoritative: every read reaches it and writes use explicit server versions.
No local database or replica, import/activation, automatic conflict retry or rollback.
Migration must have activated the account under the canonical key before construction.

## Methods

### candidates()

> **candidates**(`embedding`: `number`\[], `options?`: [`RemoteMemoryCandidateOptions`](RemoteMemoryCandidateOptions.md)): `Promise`<[`RemoteMemoryRecord`](RemoteMemoryRecord.md)\[]>

Defined in: src/lib/memory/store/remotePersistence.ts:118

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

`Promise`<[`RemoteMemoryRecord`](RemoteMemoryRecord.md)\[]>

***

### get()

> **get**(`memoryId`: `string`, `signal?`: `AbortSignal`): `Promise`<[`RemoteMemoryRecord`](RemoteMemoryRecord.md) | `null`>

Defined in: src/lib/memory/store/remotePersistence.ts:108

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

Defined in: src/lib/memory/store/remotePersistence.ts:110

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

> **put**(`memory`: [`RemoteMemoryRow`](RemoteMemoryRow.md), `expectedVersion`: `number`, `signal?`: `AbortSignal`): `Promise`<[`RemoteMemoryRecord`](RemoteMemoryRecord.md)>

Defined in: src/lib/memory/store/remotePersistence.ts:112

Whole-row write. Version 0 creates; N replaces only version N. is\_deleted writes a tombstone.

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
