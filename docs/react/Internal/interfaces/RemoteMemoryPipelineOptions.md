# RemoteMemoryPipelineOptions

Defined in: [src/lib/memory/store/remotePipeline.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#34)

## Properties

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/store/remotePipeline.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#36)

***

### graphRanking()

> **graphRanking**: (`query`: `string`, `traverse`: `boolean`, `options`: [`RecallOptions`](RecallOptions.md)) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remotePipeline.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#38)

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

Defined in: [src/lib/memory/store/remotePipeline.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#35)

***

### temporalRanking()

> **temporalRanking**: (`query`: `string`, `now?`: `number`) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remotePipeline.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#39)

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
