# MemoryMaintenance

Defined in: [src/lib/memory/store/types.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#97)

Background jobs that keep a LOCAL store healthy.

TRANSITIONAL. Under the server-side memory design these jobs run on the
server next to the data, so a remote backend omits `maintenance` entirely
and callers must treat its absence as "someone else owns this". Nothing
here should gain a new caller that isn't a background worker.

Not here on purpose: the client's quality sweep (`list` + `delete`) and
folder→topic migration (`list` + `topicsByMemories` + `addTopics`) compose
from the main interface.

## Methods

### backfillTopics()

> **backfillTopics**(`memoryIds`: readonly `string`\[]): `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/types.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#116)

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

### createDecaySweeper()

> **createDecaySweeper**(`options?`: `Omit`<[`CreateDecaySweeperOptions`](CreateDecaySweeperOptions.md), `"vaultCtx"`>): [`DecaySweeper`](DecaySweeper.md)

Defined in: [src/lib/memory/store/types.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#99)

Decay sweeper bound to this store's vault (see `createDecaySweeper`).

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

`Omit`<[`CreateDecaySweeperOptions`](CreateDecaySweeperOptions.md), `"vaultCtx"`>

</td>
</tr>
</tbody>
</table>

**Returns**

[`DecaySweeper`](DecaySweeper.md)

***

### extractTopics()

> **extractTopics**(`memoryIds`: readonly `string`\[], `options`: [`TopicExtractOptions`](TopicExtractOptions.md) & `object`): `Promise`<[`TopicExtractionRunResult`](TopicExtractionRunResult.md)>

Defined in: [src/lib/memory/store/types.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#103)

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

> **getTopicBacklog**(`options?`: `object`): `Promise`<[`MemoriesNeedingTopicExtraction`](MemoriesNeedingTopicExtraction.md)>

Defined in: [src/lib/memory/store/types.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#101)

One page of the topic-extraction backlog (see `getMemoriesNeedingTopicExtractionOp`).

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

`Promise`<[`MemoriesNeedingTopicExtraction`](MemoriesNeedingTopicExtraction.md)>

***

### relinkTopics()

> **relinkTopics**(`memoryIds`: readonly `string`\[]): `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/types.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#114)

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

Defined in: [src/lib/memory/store/types.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#108)

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
