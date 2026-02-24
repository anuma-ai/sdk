# getMediaByIdsOp

> **getMediaByIdsOp**(`ctx`: [`MediaOperationsContext`](../interfaces/MediaOperationsContext.md), `mediaIds`: `string`\[], `includeDeleted`: `boolean`): `Promise`<[`StoredMedia`](../interfaces/StoredMedia.md)\[]>

Defined in: [src/lib/db/media/operations.ts:529](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/operations.ts#529)

Get media by an array of media IDs.
Useful for fetching media using the fileIds array stored in messages.

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

`ctx`

</td>
<td>

[`MediaOperationsContext`](../interfaces/MediaOperationsContext.md)

</td>
<td>

`undefined`

</td>
</tr>
<tr>
<td>

`mediaIds`

</td>
<td>

`string`\[]

</td>
<td>

`undefined`

</td>
</tr>
<tr>
<td>

`includeDeleted`

</td>
<td>

`boolean`

</td>
<td>

`false`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredMedia`](../interfaces/StoredMedia.md)\[]>
