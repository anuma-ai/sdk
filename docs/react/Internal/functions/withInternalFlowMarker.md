# withInternalFlowMarker

> **withInternalFlowMarker**(`systemPrompt`: `string`): `string`

Defined in: [src/lib/internalFlowMarker.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/internalFlowMarker.ts#58)

Prepend [INTERNAL\_FLOW\_MARKER](../variables/INTERNAL_FLOW_MARKER.md) to a system prompt. Idempotent — a prompt that
already carries the marker is returned unchanged, so applying it at more than one
layer (or on a retry of an already-marked request) cannot stack it.

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

`systemPrompt`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`string`
