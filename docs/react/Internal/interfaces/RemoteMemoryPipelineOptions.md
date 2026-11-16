# RemoteMemoryPipelineOptions

Defined in: [src/lib/memory/store/remotePipeline.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#46)

## Properties

### candidateLanes()?

> `optional` **candidateLanes**: (`query`: `string`, `options`: [`RecallOptions`](RecallOptions.md)) => `RemoteMemoryCandidateLanes` | `undefined`

Defined in: [src/lib/memory/store/remotePipeline.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#52)

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

`options`

</td>
<td>

[`RecallOptions`](RecallOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`RemoteMemoryCandidateLanes` | `undefined`

***

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/store/remotePipeline.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#48)

***

### graphRanking()

> **graphRanking**: (`query`: `string`, `traverse`: `boolean`, `options`: [`RecallOptions`](RecallOptions.md)) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remotePipeline.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#50)

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

Defined in: [src/lib/memory/store/remotePipeline.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#47)

***

### temporalRanking()

> **temporalRanking**: (`query`: `string`, `now?`: `number`) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remotePipeline.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#51)

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
