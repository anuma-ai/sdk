# CreateAutoExtractorOptions

Defined in: [src/lib/memory/autoExtractWorker.ts:188](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#188)

## Properties

### consolidate?

> `optional` **consolidate**: `object`

Defined in: [src/lib/memory/autoExtractWorker.ts:246](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#246)

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

### cursorStore?

> `optional` **cursorStore**: [`ExtractionCursorStore`](ExtractionCursorStore.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:226](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#226)

Durable per-conversation watermark store. When provided, the watermark is
hydrated from it the first time each conversation is touched and written
through on every advance, so extraction resumes exactly after the last
extracted message across process restarts (and, with a process-shared
store, across concurrent sessions). Build via [createPlatformCursorStore](../functions/createPlatformCursorStore.md).
Omit for in-memory-only (legacy) behavior.

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:233](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#233)

Entity / memory\_entity write context — when provided, each retained
candidate's `entities[]` is persisted via `linkMemoryEntitiesOp`,
populating the W5 graph retrieval lane. Without this the lane stays
empty and recall's graph fusion is a no-op.

***

### extract

> **extract**: [`ExtractFactsOptions`](ExtractFactsOptions.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:190](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#190)

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/autoExtractWorker.ts:237](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#237)

Override folderId for all retained facts.

***

### injectionClassifier?

> `optional` **injectionClassifier**: `object`

Defined in: [src/lib/memory/autoExtractWorker.ts:266](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#266)

Tier-0 security (PR5) — enable the optional SECOND-layer LLM injection
classifier over the candidates the deterministic screen passed as clean.
Presence is the switch, so `injectionClassifier: {}` is how a client turns
it on. Auth is NOT configured here — like `consolidate`, the call reuses
the `extract` credentials and defaults to its `baseUrl`. See
`injectionClassifier.ts` for the safety posture and the defaults.

**baseUrl?**

> `optional` **baseUrl**: `string`

Portal base URL for classifier calls. Default: the `extract` options' `baseUrl`.

**maxCandidates?**

> `optional` **maxCandidates**: `number`

**model?**

> `optional` **model**: `string`

**totalTimeoutMs?**

> `optional` **totalTimeoutMs**: `number`

***

### maxTrackedConversations?

> `optional` **maxTrackedConversations**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:217](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#217)

Cap on the number of conversations whose extraction state (watermark +
coalescing queue) is held in memory. When exceeded, the oldest entry with
no queued turn is evicted — its conversation simply re-extracts from a
trailing window next time (self-healing). The worker is session-scoped, so
the default is generous; lower it for very long-lived, many-conversation
sessions in RAM-constrained hosts. Default 200.

***

### maxWindowSize?

> `optional` **maxWindowSize**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#208)

Upper bound on the widened (post-watermark) window. Under an extreme burst
— more un-extracted messages accumulate than this cap while an extraction
is stuck — the window is truncated to the most recent `maxWindowSize`
messages and a warning is logged. Bounds extraction LLM cost/latency.
Default 20. Coerced to be ≥ `windowSize`.

***

### minConfidence?

> `optional` **minConfidence**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:192](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#192)

Confidence floor for retained facts. Default 0.7.

***

### onCandidateFailed()?

> `optional` **onCandidateFailed**: (`event`: `object`) => `void`

Defined in: [src/lib/memory/autoExtractWorker.ts:293](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#293)

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

Defined in: [src/lib/memory/autoExtractWorker.ts:286](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#286)

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

Defined in: [src/lib/memory/autoExtractWorker.ts:274](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#274)

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

### onMemoryQuarantined()?

> `optional` **onMemoryQuarantined**: (`event`: [`MemoryQuarantinedEvent`](MemoryQuarantinedEvent.md)) => `void`

Defined in: [src/lib/memory/autoExtractWorker.ts:280](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#280)

Tier-0 security (PR3) — fires once per candidate quarantined by the
injection screen (and persisted as an audit row). Lets a client surface a
"held for review" state instead of the fact silently disappearing.

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

[`MemoryQuarantinedEvent`](MemoryQuarantinedEvent.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onSkipped()?

> `optional` **onSkipped**: (`event`: [`TurnSkippedEvent`](TurnSkippedEvent.md)) => `void`

Defined in: [src/lib/memory/autoExtractWorker.ts:284](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#284)

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

Defined in: [src/lib/memory/autoExtractWorker.ts:282](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#282)

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

Defined in: [src/lib/memory/autoExtractWorker.ts:189](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#189)

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:235](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#235)

Override scope for all retained facts.

***

### windowSize?

> `optional` **windowSize**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:200](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#200)

Trailing-window size used when there is no watermark yet for a
conversation (the first extraction, or after the watermark scrolled out of
the provided history): the extractor receives the last `windowSize`
messages. Default 6. Once a watermark exists, the window is computed from
it (everything since the watermark) rather than this fixed slice.
