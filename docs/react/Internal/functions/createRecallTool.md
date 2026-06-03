# createRecallTool

> **createRecallTool**(`ctx`: [`RecallContext`](../interfaces/RecallContext.md), `toolOptions?`: [`RecallToolOptions`](../interfaces/RecallToolOptions.md), `callbacks?`: [`RecallToolCallbacks`](../interfaces/RecallToolCallbacks.md)): `ToolConfig`

Defined in: [src/lib/memory/recallTool.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#124)

Creates the unified recall tool. Routes through `recall()` so vault
facts and conversation chunks are fused into a single ranked list via
RRF.

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

[`RecallContext`](../interfaces/RecallContext.md)

</td>
</tr>
<tr>
<td>

`toolOptions?`

</td>
<td>

[`RecallToolOptions`](../interfaces/RecallToolOptions.md)

</td>
</tr>
<tr>
<td>

`callbacks?`

</td>
<td>

[`RecallToolCallbacks`](../interfaces/RecallToolCallbacks.md)

</td>
</tr>
</tbody>
</table>

## Returns

`ToolConfig`
