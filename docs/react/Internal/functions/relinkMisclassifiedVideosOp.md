# relinkMisclassifiedVideosOp

> **relinkMisclassifiedVideosOp**(`ctx`: [`MediaOperationsContext`](../interfaces/MediaOperationsContext.md), `walletAddress`: `string`): `Promise`<`number`>

Defined in: [src/lib/db/media/operations.ts:353](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/operations.ts#353)

Recovery migration: relink videos that were mistakenly stored as images.

Earlier builds captured MCP video URLs via the image-extraction fallback and
created StoredMedia records with `media_type = "image"`. Those records hold
the video in encrypted OPFS but never surface in the video player's fallback
or the Videos library tab.

The stored `mime_type` is an unreliable signal — object storage often served
a generic `application/octet-stream`, and the old path also stamped
`image/<ext>` when the blob type was empty. The reliable plaintext signal is
the generated `name` (`mcp-image-*.<ext>`, where `<ext>` comes from the source
URL). So we match `media_type = "image"` rows whose mime is `video/*` OR whose
name carries a video extension, flip them to video, and repair the mime so it
stays correct.

Idempotent: once flipped to `video`, rows no longer match the filter.

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
