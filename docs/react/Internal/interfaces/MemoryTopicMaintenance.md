# MemoryTopicMaintenance

Defined in: [src/lib/memory/store/types.ts:184](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#184)

## Extended by

* [`MemoryMaintenance`](MemoryMaintenance.md)

## Methods

### backfillTopics()

> **backfillTopics**(`memoryIds`: readonly `string`\[]): `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/types.ts:196](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#196)

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

`memoryIds`

</td>
<td>

readonly `string`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`\[]>

***

### extractTopics()

> **extractTopics**(`memoryIds`: readonly `string`\[], `options`: [`TopicExtractOptions`](TopicExtractOptions.md) & `object`): `Promise`<[`TopicExtractionRunResult`](TopicExtractionRunResult.md)>

Defined in: [src/lib/memory/store/types.ts:186](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#186)

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

`memoryIds`

</td>
<td>

readonly `string`\[]

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`TopicExtractOptions`](TopicExtractOptions.md) & `object`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`TopicExtractionRunResult`](TopicExtractionRunResult.md)>

***

### getTopicBacklog()

> **getTopicBacklog**(`options?`: `object`): `Promise`<[`MemoryTopicBacklog`](MemoryTopicBacklog.md)>

Defined in: [src/lib/memory/store/types.ts:185](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#185)

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

`object`

</td>
</tr>
<tr>
<td>

`options.limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`MemoryTopicBacklog`](MemoryTopicBacklog.md)>

***

### relinkTopics()

> **relinkTopics**(`memoryIds`: readonly `string`\[]): `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/types.ts:195](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#195)

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

`memoryIds`

</td>
<td>

readonly `string`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`\[]>

***

### stampTopicsExtracted()

> **stampTopicsExtracted**(`memoryIds`: readonly `string`\[], `extractedAt`: `number`, `version?`: `number`): `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/types.ts:190](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#190)

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

`memoryIds`

</td>
<td>

readonly `string`\[]

</td>
</tr>
<tr>
<td>

`extractedAt`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`version?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`\[]>
