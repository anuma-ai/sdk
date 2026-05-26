# CreateAutoExtractorOptions

Defined in: [src/lib/memory/autoExtractWorker.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#54)

## Properties

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#67)

Entity / memory\_entity write context — when provided, each retained
candidate's `entities[]` is persisted via `linkMemoryEntitiesOp`,
populating the W5 graph retrieval lane. Without this the lane stays
empty and recall's graph fusion is a no-op.

***

### extract

> **extract**: [`ExtractFactsOptions`](ExtractFactsOptions.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#56)

***

### minConfidence?

> `optional` **minConfidence**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#58)

Confidence floor for retained facts. Default 0.7.

***

### onError()?

> `optional` **onError**: (`error`: `Error`, `conversationId?`: `string`) => `void`

Defined in: [src/lib/memory/autoExtractWorker.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#75)

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

Defined in: [src/lib/memory/autoExtractWorker.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#69)

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

Defined in: [src/lib/memory/autoExtractWorker.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#73)

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

Defined in: [src/lib/memory/autoExtractWorker.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#71)

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

Defined in: [src/lib/memory/autoExtractWorker.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#55)

***

### windowSize?

> `optional` **windowSize**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#60)

How many recent messages to feed the extractor. Default 6.
