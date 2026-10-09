# RemoteMemoryPipeline

Defined in: [src/lib/memory/store/remotePipeline.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#41)

## Methods

### recall()

> **recall**(`query`: `string`, `options?`: [`MemoryRecallOptions`](../type-aliases/MemoryRecallOptions.md)): `Promise`<[`RecallResult`](RecallResult.md)>

Defined in: [src/lib/memory/store/remotePipeline.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#42)

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

`options?`

</td>
<td>

[`MemoryRecallOptions`](../type-aliases/MemoryRecallOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RecallResult`](RecallResult.md)>

***

### retain()

> **retain**(`content`: `string`, `options?`: [`MemoryRetainOptions`](../type-aliases/MemoryRetainOptions.md)): `Promise`<[`RetainResult`](RetainResult.md)>

Defined in: [src/lib/memory/store/remotePipeline.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#43)

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

`content`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`MemoryRetainOptions`](../type-aliases/MemoryRetainOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RetainResult`](RetainResult.md)>
