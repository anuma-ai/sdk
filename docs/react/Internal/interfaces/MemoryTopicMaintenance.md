# MemoryTopicMaintenance

Defined in: [src/lib/memory/store/types.ts:212](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#212)

Topic-extraction upkeep for either backend. On a remote store `pending` carries ids only, the
other backlog lists are always empty, and `relinkTopics` / `backfillTopics` do nothing.

## Extended by

* [`MemoryMaintenance`](MemoryMaintenance.md)

## Methods

### backfillTopics()

> **backfillTopics**(`memoryIds`: readonly `string`\[]): `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/types.ts:229](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#229)

Fill `topics` on pre-v42 rows from their existing links. Returns the ids filled.

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

Defined in: [src/lib/memory/store/types.ts:216](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#216)

LLM topic extraction + link + stamp for these memories.

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

Defined in: [src/lib/memory/store/types.ts:214](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#214)

One page of the topic-extraction backlog, edited or outdated rows first.

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

Defined in: [src/lib/memory/store/types.ts:227](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#227)

Rebuild the local link index from each row's synced `topics`. Returns the ids relinked.

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

Defined in: [src/lib/memory/store/types.ts:221](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#221)

Grandfather already-linked rows without an LLM call. Returns the ids stamped.

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
