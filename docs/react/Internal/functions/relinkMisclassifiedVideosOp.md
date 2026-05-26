# relinkMisclassifiedVideosOp

> **relinkMisclassifiedVideosOp**(`ctx`: [`MediaOperationsContext`](../interfaces/MediaOperationsContext.md), `walletAddress`: `string`): `Promise`<`number`>

Defined in: [src/lib/db/media/operations.ts:341](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/operations.ts#341)

Recovery migration: relink videos that were mistakenly stored as images.

Earlier builds captured MCP video URLs via the image-extraction fallback and
created StoredMedia records with `media_type = "image"` even though the bytes
(and `mime_type`) are video. Those records hold the video in encrypted OPFS
but never surface in the video player's fallback or the Videos library tab.

`mime_type` is a plaintext column and is already correct (e.g. "video/mp4"),
so we can find the affected rows by querying `media_type = "image"` with a
`video/` mime and flip `media_type` to the value derived from the mime.

Idempotent: once flipped, rows no longer match the image+video/ filter.

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
</tbody>
</table>

## Returns

`Promise`<`number`>

number of records relinked
