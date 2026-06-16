# CreateAutoExtractorOptions

Defined in: [src/lib/memory/autoExtractWorker.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#55)

## Properties

### consolidate?

> `optional` **consolidate**: `object`

Defined in: [src/lib/memory/autoExtractWorker.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#81)

Enable the LLM-based consolidation pass (Hindsight facet-dedup) on
every retain() write. Auth is NOT configured here — the consolidation
call reuses the `extract` options' credentials (`apiKey` / `getToken`)
and defaults to its `baseUrl` unless overridden below. Absent →
identical behavior to today: retain() runs the strict cosine-only
auto-merge with no consolidation LLM calls.

**baseUrl?**

> `optional` **baseUrl**: `string`

Portal base URL for consolidation calls. Default: the `extract` options' `baseUrl`.

**model?**

> `optional` **model**: `string`

Override the consolidation model. Default: see `consolidate.ts`.

**onFallback()?**

> `optional` **onFallback**: (`reason`: [`ConsolidationFallbackReason`](../type-aliases/ConsolidationFallbackReason.md)) => `void`

Notified on each degraded create-fallback (LLM failure or
schema-violating response). See
`RetainOptions.consolidateOptions.onFallback`.

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

`reason`

</td>
<td>

[`ConsolidationFallbackReason`](../type-aliases/ConsolidationFallbackReason.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#68)

Entity / memory\_entity write context — when provided, each retained
candidate's `entities[]` is persisted via `linkMemoryEntitiesOp`,
populating the W5 graph retrieval lane. Without this the lane stays
empty and recall's graph fusion is a no-op.

***

### extract

> **extract**: [`ExtractFactsOptions`](ExtractFactsOptions.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#57)

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/autoExtractWorker.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#72)

Override folderId for all retained facts.

***

### minConfidence?

> `optional` **minConfidence**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#59)

Confidence floor for retained facts. Default 0.7.

***

### onCandidateFailed()?

> `optional` **onCandidateFailed**: (`event`: `object`) => `void`

Defined in: [src/lib/memory/autoExtractWorker.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#107)

Per-candidate retain() failure. Lets UI layers ("Anuma is saving …
— couldn't save Lives in Portland") surface the specific fact that
dropped instead of only seeing the aggregate `failedCount`. Fires
once per filtered candidate that threw during retain.

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

`object`

</td>
</tr>
<tr>
<td>

`event.candidate`

</td>
<td>

[`ExtractedCandidate`](ExtractedCandidate.md)

</td>
</tr>
<tr>
<td>

`event.conversationId?`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`event.error`

</td>
<td>

`unknown`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onError()?

> `optional` **onError**: (`error`: `Error`, `conversationId?`: `string`) => `void`

Defined in: [src/lib/memory/autoExtractWorker.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#100)

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

Defined in: [src/lib/memory/autoExtractWorker.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#94)

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

Defined in: [src/lib/memory/autoExtractWorker.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#98)

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

Defined in: [src/lib/memory/autoExtractWorker.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#96)

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

Defined in: [src/lib/memory/autoExtractWorker.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#56)

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#70)

Override scope for all retained facts.

***

### windowSize?

> `optional` **windowSize**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#61)

How many recent messages to feed the extractor. Default 6.
