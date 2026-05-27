# relinkMisclassifiedVideosOp

> **relinkMisclassifiedVideosOp**(`ctx`: [`MediaOperationsContext`](../interfaces/MediaOperationsContext.md), `walletAddress`: `string`): `Promise`<`number`>

Defined in: [src/lib/db/media/operations.ts:357](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/operations.ts#357)

Recovery migration: relink videos that were mistakenly stored as images.

Earlier builds captured MCP video URLs via the image-extraction fallback and
created StoredMedia records with `media_type = "image"`. Those records hold
the video in encrypted OPFS but never surface in the video player's fallback
or the Videos library tab.

`name`/`source_url` are encrypted at rest, so they can't be matched with SQL.
Detection works off the plaintext `mime_type`:

* `video/*` — blob type was correct
* `image/{mp4,webm,mov}` — blob type was empty, stamped `image/<urlext>`
* `application/octet-stream` — generic; ambiguous in plaintext, so we decrypt
  the record and confirm a video extension on `sourceUrl`/`name` before
  flipping (avoids turning real documents/images into video).

Confirmed rows are flipped to `video` and their mime repaired to `video/<ext>`
so they stay classified correctly. Idempotent: once `video`, rows fall out of
the `media_type = "image"` candidate set.

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
