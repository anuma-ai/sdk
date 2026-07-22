# createPlatformCursorStore

> **createPlatformCursorStore**(`storage`: `SyncKeyValueStore`, `keyPrefix`: `string`): [`ExtractionCursorStore`](../interfaces/ExtractionCursorStore.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:154](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#154)

Build an [ExtractionCursorStore](../interfaces/ExtractionCursorStore.md) over a synchronous key/value store
(e.g. the SDK's `PlatformStorage`). Keys are namespaced by `keyPrefix`.
Reads/writes are guarded so a store that throws (quota, private mode) can't
break extraction — the watermark just falls back to in-memory.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Default value</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`storage`

</td>
<td>

`SyncKeyValueStore`

</td>
<td>

`undefined`

</td>
</tr>
<tr>
<td>

`keyPrefix`

</td>
<td>

`string`

</td>
<td>

`"anuma:mem:xcursor:"`

</td>
</tr>
</tbody>
</table>

## Returns

[`ExtractionCursorStore`](../interfaces/ExtractionCursorStore.md)
