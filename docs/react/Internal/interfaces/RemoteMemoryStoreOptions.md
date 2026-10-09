# RemoteMemoryStoreOptions

Defined in: [src/lib/memory/store/remoteStore.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#39)

## Properties

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/store/remoteStore.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#41)

***

### graphRanking()

> **graphRanking**: (`query`: `string`, `traverse`: `boolean`, `options`: [`RecallOptions`](RecallOptions.md)) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remoteStore.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#42)

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

Defined in: [src/lib/memory/store/remoteStore.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#40)

***

### pollIntervalMs?

> `optional` **pollIntervalMs**: `number`

Defined in: [src/lib/memory/store/remoteStore.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#44)

***

### temporalRanking()

> **temporalRanking**: (`query`: `string`, `now?`: `number`) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remoteStore.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#43)

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
