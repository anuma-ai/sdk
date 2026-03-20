# getMediaByRoleOp

> **getMediaByRoleOp**(`ctx`: [`MediaOperationsContext`](../interfaces/MediaOperationsContext.md), `walletAddress`: `string`, `role`: [`MediaRole`](../type-aliases/MediaRole.md), `limit?`: `number`): `Promise`<[`StoredMedia`](../interfaces/StoredMedia.md)\[]>

Defined in: [src/lib/db/media/operations.ts:573](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/operations.ts#573)

Get media by role (user uploads vs AI generated).

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`role`

</td>
<td>

[`MediaRole`](../type-aliases/MediaRole.md)

</td>
</tr>
<tr>
<td>

`limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredMedia`](../interfaces/StoredMedia.md)\[]>
