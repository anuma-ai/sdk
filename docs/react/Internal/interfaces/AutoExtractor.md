# AutoExtractor

Defined in: [src/lib/memory/autoExtractWorker.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#79)

## Methods

### dispose()

> **dispose**(): `void`

Defined in: [src/lib/memory/autoExtractWorker.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#89)

Stop accepting new turns. In-flight work continues to completion.

**Returns**

`void`

***

### isProcessing()

> **isProcessing**(): `boolean`

Defined in: [src/lib/memory/autoExtractWorker.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#87)

True while a turn's extraction is in flight.

**Returns**

`boolean`

***

### processTurn()

> **processTurn**(`messages`: [`AutoExtractMessage`](AutoExtractMessage.md)\[], `conversationId?`: `string`): `boolean`

Defined in: [src/lib/memory/autoExtractWorker.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#85)

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
