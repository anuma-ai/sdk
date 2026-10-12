# RemoteMemoryStoreOptions

Defined in: [src/lib/memory/store/remoteStore.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#45)

## Properties

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/store/remoteStore.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#47)

***

### graphRanking()

> **graphRanking**: (`query`: `string`, `traverse`: `boolean`, `options`: [`RecallOptions`](RecallOptions.md)) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remoteStore.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#48)

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

Defined in: [src/lib/memory/store/remoteStore.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#46)

***

### pollIntervalMs?

> `optional` **pollIntervalMs**: `number`

Defined in: [src/lib/memory/store/remoteStore.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#50)

***

### temporalRanking()

> **temporalRanking**: (`query`: `string`, `now?`: `number`) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remoteStore.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#49)

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
