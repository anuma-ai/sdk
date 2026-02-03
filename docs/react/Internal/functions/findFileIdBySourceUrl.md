# findFileIdBySourceUrl

> **findFileIdBySourceUrl**(`files`: `object`\[] | `undefined`, `sourceUrl`: `string`): `string` | `undefined`

Defined in: [src/react/useChatStorage.ts:136](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L136)

Find the OPFS file ID for a given source URL from a message's files.
Used to look up local file storage when an external URL fails (e.g., 404).

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`files`

</td>
<td>

`object`\[] | `undefined`

</td>
<td>

Array of FileMetadata from a stored message

</td>
</tr>
<tr>
<td>

`sourceUrl`

</td>
<td>

`string`

</td>
<td>

The original URL to look up

</td>
</tr>
</tbody>
</table>

## Returns

`string` | `undefined`

The file ID if found, or undefined
