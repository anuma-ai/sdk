# AutoExtractor

Defined in: [src/lib/memory/autoExtractWorker.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#115)

## Methods

### dispose()

> **dispose**(): `void`

Defined in: [src/lib/memory/autoExtractWorker.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#125)

Stop accepting new turns. In-flight work continues to completion.

**Returns**

`void`

***

### isProcessing()

> **isProcessing**(): `boolean`

Defined in: [src/lib/memory/autoExtractWorker.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#123)

True while a turn's extraction is in flight.

**Returns**

`boolean`

***

### processTurn()

> **processTurn**(`messages`: [`AutoExtractMessage`](AutoExtractMessage.md)\[], `conversationId?`: `string`): `boolean`

Defined in: [src/lib/memory/autoExtractWorker.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#121)

Kick off extraction for the most recent turn. Returns immediately
(async, fire-and-forget). The returned promise resolves to true if
extraction was scheduled, false if skipped (in-flight or no messages).

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

`messages`

</td>
<td>

[`AutoExtractMessage`](AutoExtractMessage.md)\[]

</td>
</tr>
<tr>
<td>

`conversationId?`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`boolean`
