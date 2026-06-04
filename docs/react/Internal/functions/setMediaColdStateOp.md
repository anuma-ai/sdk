# setMediaColdStateOp

> **setMediaColdStateOp**(`ctx`: [`MediaOperationsContext`](../interfaces/MediaOperationsContext.md), `mediaId`: `string`, `state`: `object`): `Promise`<`boolean`>

Defined in: [src/lib/db/media/operations.ts:298](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/operations.ts#298)

Set storage-aware local retention state on a media row (#3271).

Deliberately does NOT bump `updated_at`: `is_cold` / `last_accessed_at` are
DEVICE-LOCAL eviction bookkeeping, not user edits. Leaving `updated_at`
untouched keeps the row out of the backup delta and prevents this per-device
state from ever syncing to the cloud or to other devices. Pass only the fields
you intend to change.

## Parameters

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

`ctx`

</td>
<td>

[`MediaOperationsContext`](../interfaces/MediaOperationsContext.md)

</td>
</tr>
<tr>
<td>

`mediaId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`state`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`state.isCold?`

</td>
<td>

`boolean`

</td>
</tr>
<tr>
<td>

`state.lastAccessedAt?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`boolean`>

true if a matching row was updated, false if none was found.
