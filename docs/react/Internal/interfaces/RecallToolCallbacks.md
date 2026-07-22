# RecallToolCallbacks

Defined in: [src/lib/memory/recallTool.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#60)

## Properties

### onChunksRetrieved()?

> `optional` **onChunksRetrieved**: (`conversationIds`: `string`\[]) => `void`

Defined in: [src/lib/memory/recallTool.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#62)

Called with the conversation IDs returned via the chunk lane.

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

`conversationIds`

</td>
<td>

`string`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onFactsRanked()?

> `optional` **onFactsRanked**: (`facts`: `object`\[]) => `void`

Defined in: [src/lib/memory/recallTool.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#72)

Called with the ranked facts and their relevance scores, in rank
order (highest first). A superset of [onFactsRetrieved](#onfactsretrieved) that
additionally exposes `RankedMemory.score` — consumers that only need
ids can keep using `onFactsRetrieved`; those that scale UI by
relevance (e.g. the Memory Graph's recall pulses) use this.

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

`facts`

</td>
<td>

`object`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onFactsRetrieved()?

> `optional` **onFactsRetrieved**: (`factIds`: `string`\[]) => `void`

Defined in: [src/lib/memory/recallTool.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#64)

Called with the fact IDs returned via the fact lane.

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

`factIds`

</td>
<td>

`string`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
