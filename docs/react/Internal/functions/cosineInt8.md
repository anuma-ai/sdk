# cosineInt8

> **cosineInt8**(`a`: `Int8Array`, `scaleA`: `number`, `b`: `Int8Array`, `scaleB`: `number`): `number`

Defined in: [src/lib/memoryEngine/quantization.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/quantization.ts#119)

Cosine similarity between two Int8-quantized embeddings.

The integer dot product is exact; the per-vector scales cancel
because cosine normalizes by both magnitudes — passing scaleA and
scaleB is supported for symmetry with the dequantized API but they
are mathematically irrelevant when both vectors share the same
quantization scheme. They are still validated to catch zero-magnitude
(zero-vector) inputs cleanly.

Returns 0 when either vector is zero or dimensions differ. Result is
clamped to \[-1, 1] to absorb floating-point error from sqrt.

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

`a`

</td>
<td>

`Int8Array`

</td>
<td>

First quantized vector.

</td>
</tr>
<tr>
<td>

`scaleA`

</td>
<td>

`number`

</td>
<td>

Scale factor for `a`. Used only to detect zero vectors.

</td>
</tr>
<tr>
<td>

`b`

</td>
<td>

`Int8Array`

</td>
<td>

Second quantized vector.

</td>
</tr>
<tr>
<td>

`scaleB`

</td>
<td>

`number`

</td>
<td>

Scale factor for `b`. Used only to detect zero vectors.

</td>
</tr>
</tbody>
</table>

## Returns

`number`
