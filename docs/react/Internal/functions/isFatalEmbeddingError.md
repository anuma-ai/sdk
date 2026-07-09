# isFatalEmbeddingError

> **isFatalEmbeddingError**(`err`: `unknown`): `boolean`

Defined in: [src/lib/memoryEngine/embeddings.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/embeddings.ts#61)

True for an [EmbeddingHttpError](../classes/EmbeddingHttpError.md) whose status is one a backfill can't
recover from within the session (401/402/403). Bulk loops re-throw on this to
abort the pass instead of firing one doomed request per message.

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

`err`

</td>
<td>

`unknown`

</td>
</tr>
</tbody>
</table>

## Returns

`boolean`
