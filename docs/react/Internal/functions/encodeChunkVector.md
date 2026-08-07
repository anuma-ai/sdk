# encodeChunkVector

> **encodeChunkVector**(`vector`: `ArrayLike`<`number`>): `string`

Defined in: [src/lib/memoryEngine/vectorEncoding.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/vectorEncoding.ts#64)

Encode an embedding as base64 float32 for storage.

Not yet called by the write path — see the rollout note above. Values are
narrowed to float32 first, which is lossless for anything `generateEmbeddings`
produced and is what makes the decode byte-exact.

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

`vector`

</td>
<td>

`ArrayLike`<`number`>

</td>
</tr>
</tbody>
</table>

## Returns

`string`
