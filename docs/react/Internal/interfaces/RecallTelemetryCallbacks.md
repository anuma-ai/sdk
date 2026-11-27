# RecallTelemetryCallbacks

Defined in: [src/lib/memory/types.ts:538](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#538)

## Extended by

* [`RecallToolCallbacks`](RecallToolCallbacks.md)

## Properties

### onDiagnostics()?

> `optional` **onDiagnostics**: (`diagnostics`: [`RecallDiagnostics`](RecallDiagnostics.md)) => `void`

Defined in: [src/lib/memory/types.ts:539](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#539)

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

***

### onError()?

> `optional` **onError**: (`error`: `Error`) => `void`

Defined in: [src/lib/memory/types.ts:541](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#541)

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

***

### onTruncated()?

> `optional` **onTruncated**: (`truncation`: [`RecallTruncation`](RecallTruncation.md)) => `void`

Defined in: [src/lib/memory/types.ts:540](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#540)

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
