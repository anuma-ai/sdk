# decodeChunkVector

> **decodeChunkVector**(`vector`: `string` | `number`\[] | `null` | `undefined`, `onMalformed?`: () => `void`): `Float32Array`<`ArrayBuffer`>

Defined in: [src/lib/memoryEngine/vectorEncoding.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/vectorEncoding.ts#88)

Read a stored chunk vector in either encoding: a base64 float32 string, or the
legacy `number[]` that every row written before the writer flip still holds.

Returns a zero-length `Float32Array` for a missing, empty, or unreadable
value, which callers already treat as "this chunk has no vector" — the same
degradation a malformed `chunks` JSON gets today, rather than a throw that
would take down a whole search pass over one bad row.

That one return value covers two different situations, and a caller cannot
tell them apart: a chunk that legitimately has no vector, and a chunk whose
vector is corrupt. `onMalformed` separates them. It fires only on the corrupt
paths, never on an absent or empty value, so a caller can count corruption
without counting normal empties.

Nothing is logged here. A corrupt row holds hundreds of chunks and this runs
once per chunk, so the caller aggregates and reports once per pass — the shape
`searchChunksOp` already uses for stale-model vectors.

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
<tr>
<td>

`onMalformed?`

</td>
<td>

() => `void`

</td>
</tr>
</tbody>
</table>

## Returns

`Float32Array`<`ArrayBuffer`>
