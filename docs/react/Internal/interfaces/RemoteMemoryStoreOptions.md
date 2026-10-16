# RemoteMemoryStoreOptions

Defined in: [src/lib/memory/store/remoteStore.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#65)

## Properties

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/store/remoteStore.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#67)

***

### graphRanking()?

> `optional` **graphRanking**: (`query`: `string`, `traverse`: `boolean`, `options`: [`RecallOptions`](RecallOptions.md)) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remoteStore.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#69)

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

Defined in: [src/lib/memory/store/remoteStore.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#66)

***

### pollIntervalMs?

> `optional` **pollIntervalMs**: `number`

Defined in: [src/lib/memory/store/remoteStore.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#71)

***

### temporalRanking()?

> `optional` **temporalRanking**: (`query`: `string`, `now?`: `number`) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remoteStore.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#70)

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
