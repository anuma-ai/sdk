# seedMediaToVault

> **seedMediaToVault**(`options`: [`MediaSeedOptions`](../interfaces/MediaSeedOptions.md)): `Promise`<[`MediaSeedResult`](../interfaces/MediaSeedResult.md)>

Defined in: [src/lib/chatStore/media.ts:438](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#438)

Uploads this device's library files that vault lacks, at most `maxUploads` per run; safe to rerun after a crash without uploading a file twice.

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

[`MediaSeedOptions`](../interfaces/MediaSeedOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`MediaSeedResult`](../interfaces/MediaSeedResult.md)>
