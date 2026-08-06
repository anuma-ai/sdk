# decodeChunkVector

> **decodeChunkVector**(`vector`: `string` | `number`\[] | `null` | `undefined`): `Float32Array`<`ArrayBuffer`>

Defined in: [src/lib/memoryEngine/vectorEncoding.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/vectorEncoding.ts#59)

Read a stored chunk vector in either encoding: a base64 float32 string, or the
legacy `number[]` that every row written before the writer flip still holds.

Returns a zero-length `Float32Array` for a missing, empty, or unreadable
value, which callers already treat as "this chunk has no vector" — the same
degradation a malformed `chunks` JSON gets today, rather than a throw that
would take down a whole search pass over one bad row.

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

`string` | `number`\[] | `null` | `undefined`

</td>
</tr>
</tbody>
</table>

## Returns

`Float32Array`<`ArrayBuffer`>
