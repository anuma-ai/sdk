# AutoExtractor

Defined in: [src/lib/memory/autoExtractWorker.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#167)

## Methods

### dispose()

> **dispose**(): `void`

Defined in: [src/lib/memory/autoExtractWorker.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#183)

Stop accepting new turns. In-flight work continues to completion.

**Returns**

`void`

***

### isProcessing()

> **isProcessing**(): `boolean`

Defined in: [src/lib/memory/autoExtractWorker.ts:181](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#181)

True while a turn's extraction is in flight.

**Returns**

`boolean`

***

### processTurn()

> **processTurn**(`messages`: [`AutoExtractMessage`](AutoExtractMessage.md)\[], `conversationId?`: `string`): `boolean`

Defined in: [src/lib/memory/autoExtractWorker.ts:179](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#179)

Kick off extraction for the most recent turn. Returns immediately
(async, fire-and-forget). Returns `true` if extraction was dispatched now
OR queued to run after the current in-flight call; `false` if nothing will
happen for this turn (disposed, empty messages, or every message was
already extracted — see [TurnSkippedEvent](TurnSkippedEvent.md)).

Pass the full recent `messages` array (the worker decides the window from
its per-conversation watermark); `conversationId` keys that watermark, so
pass it consistently for the same conversation.

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
