# MemoryMaintenance

Defined in: [src/lib/memory/store/types.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#164)

Background jobs that keep a LOCAL store healthy.

TRANSITIONAL local-vault plumbing. A remote store may omit these hooks, but
their absence does not mean plaintext-dependent work moves to nearby.
Topic extraction and other jobs that need decrypted memory content remain
on the device and persist encrypted rows/metadata through the remote store.
Metadata-only maintenance can run server-side. Nothing here should gain a
new caller that isn't a background worker.

Not here on purpose: the client's quality sweep (`list` + `delete`) and
folder→topic migration (`list` + `topicsByMemories` + `addTopics`) compose
from the main interface.

## Methods

### backfillTopics()

> **backfillTopics**(`memoryIds`: readonly `string`\[]): `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/types.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#183)

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

Defined in: [src/lib/memory/store/types.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#166)

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

Defined in: [src/lib/memory/store/types.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#170)

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

Defined in: [src/lib/memory/store/types.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#168)

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

Defined in: [src/lib/memory/store/types.ts:181](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#181)

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

Defined in: [src/lib/memory/store/types.ts:175](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#175)

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
