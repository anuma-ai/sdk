# CreateAutoExtractorOptions

Defined in: [src/lib/memory/autoExtractWorker.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#47)

## Properties

### extract

> **extract**: [`ExtractFactsOptions`](ExtractFactsOptions.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#49)

***

### minConfidence?

> `optional` **minConfidence**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#51)

Confidence floor for retained facts. Default 0.7.

***

### onError()?

> `optional` **onError**: (`error`: `Error`, `conversationId?`: `string`) => `void`

Defined in: [src/lib/memory/autoExtractWorker.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#61)

Diagnostic — fires on unexpected pipeline errors.

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

`error`

</td>
<td>

`Error`

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

`void`

***

### onMemoryExtracted()?

> `optional` **onMemoryExtracted**: (`event`: [`MemoryExtractedEvent`](MemoryExtractedEvent.md)) => `void`

Defined in: [src/lib/memory/autoExtractWorker.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#55)

Per-fact event — fires once per memory written.

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

`event`

</td>
<td>

[`MemoryExtractedEvent`](MemoryExtractedEvent.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onSkipped()?

> `optional` **onSkipped**: (`event`: [`TurnSkippedEvent`](TurnSkippedEvent.md)) => `void`

Defined in: [src/lib/memory/autoExtractWorker.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#59)

Diagnostic — fires when a turn is skipped.

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

`event`

</td>
<td>

[`TurnSkippedEvent`](TurnSkippedEvent.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onTurnComplete()?

> `optional` **onTurnComplete**: (`event`: [`TurnCompleteEvent`](TurnCompleteEvent.md)) => `void`

Defined in: [src/lib/memory/autoExtractWorker.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#57)

Per-turn event — fires once after the whole pipeline finishes.

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

`event`

</td>
<td>

[`TurnCompleteEvent`](TurnCompleteEvent.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### retainCtx

> **retainCtx**: [`RetainContext`](RetainContext.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#48)

***

### windowSize?

> `optional` **windowSize**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#53)

How many recent messages to feed the extractor. Default 6.
