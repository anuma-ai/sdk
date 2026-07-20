# retain

> **retain**(`content`: `string`, `ctx`: [`RetainContext`](../interfaces/RetainContext.md), `options`: [`RetainOptions`](../interfaces/RetainOptions.md)): `Promise`<[`RetainResult`](../interfaces/RetainResult.md)>

Defined in: [src/lib/memory/retain.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/retain.ts#59)

Persist a memory, merging into the nearest existing record if its
cosine similarity exceeds the auto-merge threshold.

Default behavior (autoMerge ON): proof\_count increments on the merged
target, source\_chunk\_ids accumulate (union), content is left untouched.
The caller doesn't see a duplicate and the original memory's UI badge
shows it has been re-observed.

Pass `enableAutoMerge: false` for a force-create (W2 resolver path
after it has explicitly decided "create new").

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

`content`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`ctx`

</td>
<td>

[`RetainContext`](../interfaces/RetainContext.md)

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`RetainOptions`](../interfaces/RetainOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`RetainResult`](../interfaces/RetainResult.md)>
