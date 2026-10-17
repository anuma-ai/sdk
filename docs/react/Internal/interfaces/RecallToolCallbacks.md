# RecallToolCallbacks

Defined in: [src/lib/memory/recallTool.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#68)

## Extends

* [`RecallTelemetryCallbacks`](RecallTelemetryCallbacks.md)

## Properties

### onChunksRetrieved()?

> `optional` **onChunksRetrieved**: (`conversationIds`: `string`\[]) => `void`

Defined in: [src/lib/memory/recallTool.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#70)

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

Defined in: [src/lib/memory/types.ts:514](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#514)

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

Defined in: [src/lib/memory/types.ts:516](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#516)

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

Defined in: [src/lib/memory/recallTool.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#80)

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

Defined in: [src/lib/memory/recallTool.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#72)

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

### onTruncated()?

> `optional` **onTruncated**: (`truncation`: [`RecallTruncation`](RecallTruncation.md)) => `void`

Defined in: [src/lib/memory/types.ts:515](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#515)

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
