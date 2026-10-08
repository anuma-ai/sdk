# createRemoteMemoryPipeline

> **createRemoteMemoryPipeline**(`options`: [`RemoteMemoryPipelineOptions`](../interfaces/RemoteMemoryPipelineOptions.md)): [`RemoteMemoryPipeline`](../interfaces/RemoteMemoryPipeline.md)

Defined in: [src/lib/memory/store/remotePipeline.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePipeline.ts#119)

Shared recall/retain on bounded server candidates; this is not a complete
MemoryStore or client cutover. Supply server-backed graph/temporal lanes:
there is deliberately no local-vault fallback. BM25 sees only admitted rows,
so a query-embedding outage fails rather than pretending to search the vault.

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

`options`

</td>
<td>

[`RemoteMemoryPipelineOptions`](../interfaces/RemoteMemoryPipelineOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`RemoteMemoryPipeline`](../interfaces/RemoteMemoryPipeline.md)
