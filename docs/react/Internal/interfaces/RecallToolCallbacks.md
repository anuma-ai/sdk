# RecallToolCallbacks

Defined in: [src/lib/memory/recallTool.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#71)

## Extends

* [`RecallTelemetryCallbacks`](RecallTelemetryCallbacks.md)

## Properties

### onChunksRetrieved()?

> `optional` **onChunksRetrieved**: (`conversationIds`: `string`\[]) => `void`

Defined in: [src/lib/memory/recallTool.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#75)

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

### onDiagnostics()?

> `optional` **onDiagnostics**: (`diagnostics`: [`RecallDiagnostics`](RecallDiagnostics.md)) => `void`

Defined in: [src/lib/memory/types.ts:550](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#550)

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

`diagnostics`

</td>
<td>

[`RecallDiagnostics`](RecallDiagnostics.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

[`RecallTelemetryCallbacks`](RecallTelemetryCallbacks.md).[`onDiagnostics`](RecallTelemetryCallbacks.md#ondiagnostics)

***

### onError()?

> `optional` **onError**: (`error`: `Error`) => `void`

Defined in: [src/lib/memory/types.ts:552](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#552)

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
</tbody>
</table>

**Returns**

`void`

**Inherited from**

[`RecallTelemetryCallbacks`](RecallTelemetryCallbacks.md).[`onError`](RecallTelemetryCallbacks.md#onerror)

***

### onFactsRanked()?

> `optional` **onFactsRanked**: (`facts`: `object`\[]) => `void`

Defined in: [src/lib/memory/recallTool.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#85)

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

Defined in: [src/lib/memory/recallTool.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#77)

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

***

### onRefused()?

> `optional` **onRefused**: (`refusal`: `object`) => `void`

Defined in: [src/lib/memory/recallTool.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#73)

Called when the tool refuses a call without searching.

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

`refusal`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`refusal.reason`

</td>
<td>

[`RecallRefusalReason`](../type-aliases/RecallRefusalReason.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onTruncated()?

> `optional` **onTruncated**: (`truncation`: [`RecallTruncation`](RecallTruncation.md)) => `void`

Defined in: [src/lib/memory/types.ts:551](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#551)

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

`truncation`

</td>
<td>

[`RecallTruncation`](RecallTruncation.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

[`RecallTelemetryCallbacks`](RecallTelemetryCallbacks.md).[`onTruncated`](RecallTelemetryCallbacks.md#ontruncated)
