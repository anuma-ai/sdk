# RemoteMemoryStoreOptions

Defined in: [src/lib/memory/store/remoteStore.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#76)

## Properties

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/store/remoteStore.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#78)

***

### graphRanking()?

> `optional` **graphRanking**: (`query`: `string`, `traverse`: `boolean`, `options`: [`RecallOptions`](RecallOptions.md)) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remoteStore.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#80)

Defaults to ranking memories by how many query entities their topics name.

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

`traverse`

</td>
<td>

`boolean`

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`RecallOptions`](RecallOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`\[]>

***

### persistence

> **persistence**: [`RemoteMemoryPersistence`](RemoteMemoryPersistence.md)

Defined in: [src/lib/memory/store/remoteStore.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#77)

***

### pollIntervalMs?

> `optional` **pollIntervalMs**: `number`

Defined in: [src/lib/memory/store/remoteStore.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#82)

***

### temporalRanking()?

> `optional` **temporalRanking**: (`query`: `string`, `now?`: `number`) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remoteStore.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#81)

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

`now?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`\[]>
