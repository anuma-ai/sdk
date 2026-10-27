# MemoryMaintenance

Defined in: [src/lib/memory/store/types.ts:198](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#198)

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

## Extends

* [`MemoryTopicMaintenance`](MemoryTopicMaintenance.md)

## Methods

### backfillTopics()

> **backfillTopics**(`memoryIds`: readonly `string`\[]): `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/types.ts:235](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#235)

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

**Inherited from**

[`MemoryTopicMaintenance`](MemoryTopicMaintenance.md).[`backfillTopics`](MemoryTopicMaintenance.md#backfilltopics)

***

### createDecaySweeper()

> **createDecaySweeper**(`options?`: `Omit`<[`CreateDecaySweeperOptions`](CreateDecaySweeperOptions.md), `"vaultCtx"`>): [`DecaySweeper`](DecaySweeper.md)

Defined in: [src/lib/memory/store/types.ts:200](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#200)

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

Defined in: [src/lib/memory/store/types.ts:222](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#222)

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

**Inherited from**

[`MemoryTopicMaintenance`](MemoryTopicMaintenance.md).[`extractTopics`](MemoryTopicMaintenance.md#extracttopics)

***

### getTopicBacklog()

> **getTopicBacklog**(`options?`: `object`): `Promise`<[`MemoriesNeedingTopicExtraction`](MemoriesNeedingTopicExtraction.md)>

Defined in: [src/lib/memory/store/types.ts:202](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#202)

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

**Overrides**

[`MemoryTopicMaintenance`](MemoryTopicMaintenance.md).[`getTopicBacklog`](MemoryTopicMaintenance.md#gettopicbacklog)

***

### relinkTopics()

> **relinkTopics**(`memoryIds`: readonly `string`\[]): `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/types.ts:233](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#233)

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

**Inherited from**

[`MemoryTopicMaintenance`](MemoryTopicMaintenance.md).[`relinkTopics`](MemoryTopicMaintenance.md#relinktopics)

***

### stampTopicsExtracted()

> **stampTopicsExtracted**(`memoryIds`: readonly `string`\[], `extractedAt`: `number`, `version?`: `number`): `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/types.ts:227](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#227)

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

**Inherited from**

[`MemoryTopicMaintenance`](MemoryTopicMaintenance.md).[`stampTopicsExtracted`](MemoryTopicMaintenance.md#stamptopicsextracted)
