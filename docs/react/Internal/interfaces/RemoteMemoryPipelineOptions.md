# RemoteMemoryPipelineOptions

Defined in: [src/lib/memory/store/remotePipeline.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#26)

## Properties

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/store/remotePipeline.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#28)

***

### graphRanking()

> **graphRanking**: (`query`: `string`, `traverse`: `boolean`, `options`: [`RecallOptions`](RecallOptions.md)) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remotePipeline.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#30)

Server-backed metadata lanes. These callbacks execute on the device.

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

Defined in: [src/lib/memory/store/remotePipeline.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#27)

***

### temporalRanking()

> **temporalRanking**: (`query`: `string`, `now?`: `number`) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remotePipeline.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#31)

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
