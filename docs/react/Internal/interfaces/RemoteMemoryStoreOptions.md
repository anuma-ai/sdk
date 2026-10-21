# RemoteMemoryStoreOptions

Defined in: [src/lib/memory/store/remoteStore.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#78)

## Properties

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/store/remoteStore.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#80)

***

### graphRanking()?

> `optional` **graphRanking**: (`query`: `string`, `traverse`: `boolean`, `options`: [`RecallOptions`](RecallOptions.md)) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remoteStore.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#82)

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

Defined in: [src/lib/memory/store/remoteStore.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#79)

***

### pollIntervalMs?

> `optional` **pollIntervalMs**: `number`

Defined in: [src/lib/memory/store/remoteStore.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#84)

***

### temporalRanking()?

> `optional` **temporalRanking**: (`query`: `string`, `now?`: `number`) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remoteStore.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#83)

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
